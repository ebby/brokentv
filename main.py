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

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class MainHandler(BaseHandler):
    def get(self):
      template_data = {}
      template_data['host_url'] = self.request.host_url
      template_data['js_location'] = constants.JS_SOURCE
      if not constants.DEVELOPMENT or self.request.get('css'):
        template_data['css_location'] = constants.CSS_SOURCE

      template_data['facebook_app_id'] = constants.FACEBOOK_APP_ID;
      path = os.path.join(os.path.dirname(__file__), 'templates/home.html')
      self.response.out.write(template.render(path, template_data))

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
    ('/admin/_add/collection/(.*)', admin.AddToCollectionHandler),
    ('/admin/_collections', admin.CollectionsHandler),
    ('/admin/_media/collection', admin.CollectionMediaHandler),
    ('/admin/_media/collection/(.*)', admin.CollectionMediaHandler),
    ('/admin/_media/publisher/(.*)', rpc.PublisherMediaHandler),
    ('/admin/_addprogram', admin.AdminAddProgramHandler),
    ('/admin/_rescheduleprogram', admin.AdminRescheduleProgramHandler),
    ('/admin/_removeprogram', admin.AdminRemoveProgramHandler),
    ('/admin/_posthumb', admin.PositionThumbHandler),
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
    ('/', MainHandler)
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
