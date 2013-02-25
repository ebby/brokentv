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

from basehandler import BaseHandler
from model import *
from handler import *
from namemodels import *

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class MainHandler(BaseHandler):
    def get(self):
      template_data = {}
      template_data['host_url'] = self.request.host_url
      template_data['hostname'] = 'xylovision'
      if self.request.get('prod') or not constants.DEVELOPMENT:
        template_data['js_location'] = constants.PROD_SIMPLE_JS if self.request.get('simple') \
            else constants.PROD_JS
      elif self.request.get('adv'): 
        template_data['js_location'] = constants.ADV_JS
      else:
        template_data['js_location'] = constants.SIMPLE_JS

      if not constants.DEVELOPMENT or self.request.get('css') or self.request.get('prod'):
        template_data['css_location'] = constants.CSS_SOURCE

      template_data['facebook_app_id'] = constants.FACEBOOK_APP_ID;
      path = os.path.join(os.path.dirname(__file__), 'templates/home.html')
      self.response.out.write(template.render(path, template_data))

class AdminHandler(BaseHandler):
    def get(self):
      if not self.current_user.id in constants.SUPER_ADMINS:
        self.redirect('/')
      template_data = {}
      if not constants.DEVELOPMENT or self.request.get('css') or self.request.get('prod'):
        template_data['css_location'] = constants.ADMIN_CSS_SOURCE
      template_data['js_location'] = constants.ADMIN_JS_SOURCE
      path = os.path.join(os.path.dirname(__file__), 'templates/admin.html')
      self.response.out.write(template.render(path, template_data))

class StatsHandler(BaseHandler):
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

class NameStormHandler(BaseHandler):
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
    ('/_info/(.*)', rpc.InfoHandler),
    ('/_optin', rpc.OptInHandler),
    ('/_started', rpc.StartedHandler),
    ('/_seen', rpc.SeenHandler),
    ('/_seen/(.*)', rpc.SeenHandler),
    ('/_session', rpc.SessionHandler),
    ('/_star', rpc.StarHandler),
    ('/_star/(.*)', rpc.StarHandler),
    ('/_tweet/(.*)', rpc.TweetHandler),
    ('/_twitter', rpc.TwitterHandler),
    ('/_twitter/callback', rpc.TwitterCallbackHandler),

    # Admin
    ('/admin/_access', admin.AccessLevelHandler),
    ('/admin/_add/collection/(.*)', admin.AddToCollectionHandler),
    ('/admin/_channels', admin.ChannelsHandler),
    ('/admin/_channels/(.*)', admin.ChannelsHandler),
    ('/admin/_channel/online/(.*)', admin.ChannelOnlineHandler),
    ('/admin/_collections', admin.CollectionsHandler),
    ('/admin/_collections/(.*)', admin.CollectionsHandler),
    ('/admin/_fetch', admin.FetchHandler),
    ('/admin/_program', admin.ProgramHandler),
    ('/admin/_media/collection', admin.CollectionMediaHandler),
    ('/admin/_media/collection/(.*)', admin.CollectionMediaHandler),
    ('/admin/_media/publisher/(.*)', rpc.PublisherMediaHandler),
    ('/admin/_addprogram', admin.AdminAddProgramHandler),
    ('/admin/_rescheduleprogram', admin.AdminRescheduleProgramHandler),
    ('/admin/_removeprogram', admin.AdminRemoveProgramHandler),
    ('/admin/_removepublisher/(.*)', admin.RemovePublisher),
    ('/admin/_posthumb', admin.PositionThumbHandler),
    ('/admin/_topicmedias/(.*)', admin.TopicMediaHandler),
    ('/admin/_users/(.*)', admin.UsersHandler),
    ('/admin/_users', admin.UsersHandler),
    ('/admin/init', admin.InitProgrammingHandler),
    ('/admin/storysort', admin.StorySortHandler),
    ('/admin/setprogramming', admin.SetProgrammingHandler),
    
    # Resources
    ('/images/(.*)/(.*)', ImagesHandler),
    
    # Pubsub
    ('/_pubsub/subscriber.*', pubsub.PubsubHandler),
    ('/_pubsub', pubsub.PubsubHandler),
    
    # Cron
    ('/cron/fetch', cron.FetchHandler),
    
    # Pages
    ('/', MainHandler),
    ('/admin', AdminHandler),
    ('/stats', StatsHandler),
    ('/namestorm', NameStormHandler),
    ('/namestorm/(syl)', NameStormHandler),
    ('/namestorm/(sug)', NameStormHandler)
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
