#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import constants
import datetime
import facebook
import feedparser
import logging
import math
import oauth
import os.path
import re
import simplejson
import jinja2
import webapp2

from google.appengine.api import channel as browserchannel
from google.appengine.api import images
from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.api import urlfetch

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

from basehandler import *
from sessionrequest import SessionRequest
from model import *
from handler import *
from namemodels import *

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class MainHandler(BaseHandler):
    def get(self, path=None):
      self.session.clear()
      
      mobile = self.request.host_url.startswith('http://m.') or self.request.get('mobile') \
          or 'iPhone;' in self.request.headers.get('user_agent')

      template_data = {}
      template_data['host_url'] = self.request.host_url
      if self.request.get('debug') == '3229':
        template_data['js_location'] = constants.DEBUG_JS
      elif self.request.get('prod') or not constants.DEVELOPMENT:
        template_data['js_location'] = constants.MOBILE_PROD_JS if mobile else constants.PROD_JS
      elif self.request.get('adv'):
        template_data['js_location'] = constants.ADV_JS
      else:
        template_data['js_location'] = constants.MOBILE_JS_SOURCE if mobile else constants.SIMPLE_JS

      template_data['html5'] = True #self.request.get('html5') == 'true'
      if not constants.DEVELOPMENT or self.request.get('css') or self.request.get('prod'):
        template_data['css_location'] = constants.CSS_SOURCE

      self.session['message'] = None
      # MAIL UNSUB
      if self.request.get('unsub') == '1':
        self.session['message'] = 'You are unsubscribed'
      
      qs = {}
      if path:
        link = Link.get_by_path(path)
        if link:
          parsed = urlparse.urlparse(link.url)
          qs = urlparse.parse_qs(parsed.query)

      # SINGLE CHANNEL
      self.session['single_channel_id'] = qs['sc'][0] if qs.get('sc') else self.request.get('sc')
      
      # SINGLE YOUTUBE CHANNEL
      self.session['youtube_channel_id'] = qs['ytc'][0] if qs.get('ytc') else self.request.get('ytc')

      # LINKS
      channel_id = qs['c'][0] if qs.get('c') else self.request.get('c')
      media_id = qs['m'][0] if qs.get('m') else self.request.get('m')
      
      # EMBED
      template_data['embed'] = self.request.get('embed') == '1'

      self.session['channel_id'] = channel_id
      self.session['media_id'] = media_id
  
      template_data['facebook_app_id'] = constants.facebook_app(self.request.host_url)['FACEBOOK_APP_ID']
      
      if mobile:
        path = os.path.join(os.path.dirname(__file__), 'templates/mobile.html')
        self.response.out.write(template.render(path, template_data))
      else:
        path = os.path.join(os.path.dirname(__file__), 'templates/home.html')
        self.response.out.write(template.render(path, template_data))

class AdminHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      template_data = {}
      if not constants.DEVELOPMENT or self.request.get('css') or self.request.get('prod'):
        template_data['css_location'] = constants.ADMIN_CSS_SOURCE
      template_data['js_location'] = constants.ADMIN_JS_SOURCE
      template_data['stats'] = simplejson.dumps(Stat.to_json())
      template_data['invite_policy'] = constants.INVITE_POLICY()
      template_data['invite_limit'] = constants.INVITE_LIMIT()
      path = os.path.join(os.path.dirname(__file__), 'templates/admin.html')
      self.response.out.write(template.render(path, template_data))

class StatsHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      logging.info(self.current_user.id in constants.SUPER_ADMINS)
      if not self.current_user.id in constants.SUPER_ADMINS:
        self.redirect('/')
      template_data = {}
      if not constants.DEVELOPMENT or self.request.get('css') or self.request.get('prod'):
        template_data['css_location'] = constants.STATS_CSS_SOURCE
      template_data['js_location'] = constants.STATS_JS_SOURCE
      path = os.path.join(os.path.dirname(__file__), 'templates/stats.html')
      self.response.out.write(template.render(path, template_data))
      
class UnsubscribeHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    type = self.request.get('type')
    if type == 'reply':
      current_user = self.current_user
      current_user.email_reply = False
      current_user.put()
    if type == 'message':
      current_user = self.current_user
      current_user.email_message = False
      current_user.put()
    self.redirect('/?unsub=1')

class NameStormHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      data = {}
      data['syllables'] = simplejson.dumps([s.name for s in Syllable.all().order('-name').fetch(None)])
      data['suggestions'] = simplejson.dumps([s.name for s in Suggestion.all().order('-name').fetch(None)])
      path = os.path.join(os.path.dirname(__file__), 'templates/namestorm.html')
      self.response.out.write(template.render(path, data))
    def post(self, action='sug'):
      value = self.request.get('value')
      if action == 'sug':
        Suggestion.get_or_insert(value, name=value)
      if action == 'syl':
        Syllable.get_or_insert(value, name=value)
      self.response.out.write('')

class ImagesHandler(webapp2.RequestHandler):
    def get(self, entity, id):
      if id and entity == 'publisher':
        publisher = Publisher.get_by_key_name(id)
        if publisher:
          self.response.headers['Content-Type'] = 'image/jpeg'
          self.response.out.write(publisher.picture)
          
class PitchHandler(BaseHandler):
    def get(self):
      allowed = self.request.get('xyz') == '123'
      if allowed:
        path = os.path.join(os.path.dirname(__file__), 'templates/deck.html')
        self.response.out.write(template.render(path, {}))
      else:
        self.redirect('/')
        
class RedirectHandler(BaseHandler):
    def get(self, path=None):
      html = os.path.join(os.path.dirname(__file__), 'templates/redirect.html')
      self.response.out.write(template.render(html, {'link':'http://www.xylocast.com/' + path}))

    def post(self, path=None):
      html = os.path.join(os.path.dirname(__file__), 'templates/redirect.html')
      self.response.out.write(template.render(html, {'link':'http://www.xylocast.com/' + path}))

#--------------------------------------
# APPLICATION INIT
#--------------------------------------

def create_handlers_map():
  """Create new handlers map.

  Returns:
    list of (regexp, handler) pairs for WSGIApplication constructor.
  """
  return [
    # Channel URIs
    ('/_ah/channel/connected/', webchannel.WebChannelConnectedHandler),
    ('/_ah/channel/disconnected/', webchannel.WebChannelDisconnectedHandler),

    # RPCs
    ('/_addprogram', rpc.ProgramHandler),
    ('/_activity', rpc.ActivityHandler),
    ('/_activity/(.*)', rpc.ActivityHandler),
    ('/_changechannel', rpc.ChangeChannelHandler),
    ('/_comment', rpc.CommentHandler),
    ('/_comment/(.*)', rpc.CommentHandler),
    ('/_dislike', rpc.DislikeHandler),
    ('/_dislike/(.*)', rpc.DislikeHandler),
    ('/_friends', rpc.FriendsHandler),
    ('/_info/(.*)', rpc.InfoHandler),
    ('/_like', rpc.LikeHandler),
    ('/_like/(.*)', rpc.LikeHandler),
    ('/_link', rpc.LinkHandler),
    ('/_message', rpc.MessageHandler),
    ('/_message/(.*)', rpc.MessageHandler),
    ('/_notification', rpc.NotificationHandler),
    ('/_optin', rpc.OptInHandler),
    ('/_play', rpc.PlayHandler),
    ('/_presence', rpc.PresenceHandler),
    ('/_programming/(.*)', rpc.ProgramHandler),
    ('/_publisher/(.*)', rpc.PublisherHandler),
    ('/_queue', rpc.QueueHandler),
    ('/_started', rpc.StartedHandler),
    ('/_seen', rpc.SeenHandler),
    ('/_seen/(.*)', rpc.SeenHandler),
    ('/_session', rpc.SessionHandler),
    ('/_settings', rpc.SettingsHandler),
    ('/_share', rpc.ShareHandler),
    ('/_star', rpc.StarHandler),
    ('/_star/(.*)', rpc.StarHandler),
    ('/_tweet/(.*)', rpc.TweetHandler),
    ('/_twitter', rpc.TwitterHandler),
    ('/_twitter/callback', rpc.TwitterCallbackHandler),
    ('/_welcomed', rpc.WelcomedHandler),
    ('/_ytchannel', rpc.YoutubeChannelHandler),

    # Admin
    ('/admin/_access', admin.AccessLevelHandler),
    ('/admin/_add/collection/(.*)', admin.AddToCollectionHandler),
    ('/admin/_edit/collection/(.*)', admin.EditCollectionHandler),
    ('/admin/_remove/collection/(.*)', admin.RemoveFromCollectionHandler),
    ('/admin/_categories', admin.CategoriesHandler),
    ('/admin/_channels', admin.ChannelsHandler),
    ('/admin/_channels/(.*)', admin.ChannelsHandler),
    ('/admin/_channel/online/(.*)', admin.ChannelOnlineHandler),
    ('/admin/_clear', admin.ClearHandler),
    ('/admin/_collections', admin.CollectionsHandler),
    ('/admin/_collections/(.*)', admin.CollectionsHandler),
    ('/admin/_constants', admin.ConstantsHandler),
    ('/admin/_demo', admin.DemoHandler),
    ('/admin/_fetch', admin.FetchHandler),
    ('/admin/_invite', admin.InviteHandler),
    ('/admin/_program', admin.ProgramHandler),
    ('/admin/_launchsettings', admin.LaunchSettingsHandler),
    ('/admin/_media/collection', admin.CollectionMediaHandler),
    ('/admin/_media/collection/(.*)', admin.CollectionMediaHandler),
    ('/admin/_media/publisher/(.*)', rpc.PublisherMediaHandler),
    ('/admin/_addprogram', admin.AddProgramHandler),
    ('/admin/_rescheduleprogram', admin.RescheduleProgramHandler),
    ('/admin/_removeprogram', admin.RemoveProgramHandler),
    ('/admin/_removepublisher/(.*)', admin.RemovePublisher),
    ('/admin/_posthumb', admin.PositionThumbHandler),
    ('/admin/_topicmedias/(.*)', admin.TopicMediaHandler),
    ('/admin/_users/(.*)', admin.UsersHandler),
    ('/admin/_users', admin.UsersHandler),
    ('/admin/init', admin.InitProgrammingHandler),
    ('/admin/storysort', admin.StorySortHandler),
    ('/admin/setprogramming', admin.SetProgrammingHandler),
    ('/admin/live', admin.LiveHandler),
    
    # Resources
    ('/images/(.*)/(.*)', ImagesHandler),
    
    # Pubsub
    ('/_pubsub/subscriber.*', pubsub.PubsubHandler),
    ('/_pubsub', pubsub.PubsubHandler),
    
    # Cron
    ('/cron/fetch', cron.FetchHandler),
    ('/cron/program', cron.SetProgrammingHandler),
    
    # Pages
    ('/', MainHandler),
    ('/unsubscribe', UnsubscribeHandler),
    ('/admin', AdminHandler),
    ('/redirect/(.*)', RedirectHandler),
    ('/stats', StatsHandler),
    ('/deck', PitchHandler),
    ('/namestorm', NameStormHandler),
    ('/namestorm/(syl)', NameStormHandler),
    ('/namestorm/(sug)', NameStormHandler),
    ('/(.*)', MainHandler),
  ]

def create_application():
  """Create new WSGIApplication and register all handlers.

  Returns:
    an instance of webapp.WSGIApplication with all mapreduce handlers
    registered.
  """
  return webapp.WSGIApplication(create_handlers_map(),
                                config=constants.CONFIG,
                                debug=True)

app = create_application()

def main():
  util.run_wsgi_app(app)

if __name__ == "__main__":
  main()
