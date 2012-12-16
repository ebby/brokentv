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
import webapp2
import base64
import datetime
import constants
import facebook
import logging
import math
import os.path
import re
import simplejson
import urllib
import jinja2

from google.appengine.api import channel
from google.appengine.api import images
from google.appengine.api import memcache
from google.appengine.api import urlfetch

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

from basehandler import BaseHandler
from models import *

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class MainHandler(BaseHandler):
    def get(self, id=None):
      template_data = {}
      template_data['js_location'] = constants.JS_SOURCE

      template_data['facebook_app_id'] = constants.FACEBOOK_APP_ID;

      channels = Channel.get_all();
      template_data['channels'] = simplejson.dumps([c.toJson() for c in channels]) \
        .replace("'", r"\'") \
        .replace('"', r'\"')

      template_data['programs'] = simplejson.dumps([c.toJson(False) for c in Program.get_current_programs()]) \
        .replace("'", r"\'") \
        .replace('"', r'\"')

      if self.current_user:
        token = channel.create_channel(self.current_user.id)
        template_data['token'] = token

        client = memcache.Client()
        '''
        # Compare and set current_viewers to avoid race conditions
        while True: # Retry loop
          current_viewers = simplejson.loads(client.gets('current_viewers') or '{}')
          if not self.current_user.id in current_viewers:
            current_viewers[token] = self.current_user.id
            if client.cas('current_viewers', current_viewers):
               break
          else:
            break
        '''
        current_viewers = simplejson.loads(memcache.get('current_viewers') or '{}')
        if not self.current_user.id in current_viewers:
          current_viewers[self.current_user.id] = token
          memcache.set('current_viewers', simplejson.dumps(current_viewers))

        template_data['current_viewers'] = simplejson.dumps(current_viewers)
        current_channel = Channel.all().get()

        # Add latest User Session, possibly end last session, possibly continue last session.
        user_sessions = UserSession.get_by_user(self.current_user)
        if len(user_sessions):
          current_channel = Channel.get_by_id(int(user_sessions[0].channel.key().id()))

        if len(user_sessions) and not user_sessions[0].tune_out:
          user_sessions[0].tune_out = user_sessions[0].tune_in + datetime.timedelta(seconds=180)
          user_sessions[0].put()

        if len(user_sessions) and user_sessions[0].tune_out and (datetime.datetime.now() - user_sessions[0].tune_out).seconds < 180:
          user_sessions[0].tune_out = None
          user_sessions[0].put()
        else:
          UserSession.new(self.current_user, current_channel)

        # Grab sessions for current_users (that we care about)
        viewer_sessions = []
        for uid in current_viewers:
          user_sessions = UserSession.get_by_user(User.get_by_key_name(uid))
          for s in user_sessions:
            viewer_sessions.append(s.toJson())
        template_data['viewer_sessions'] = simplejson.dumps(viewer_sessions)

        current_user = self.current_user.toJson()
        current_user['current_channel'] = current_channel.key().id()
        template_data['current_user'] = simplejson.dumps(current_user)

      path = os.path.join(os.path.dirname(__file__), 'templates/home.html')
      self.response.out.write(template.render(path, template_data))

class ProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_id(int(self.request.get('channel')))
      program = Program.add_program(channel, self.request.get('youtube_id'))
      self.response.out.write(simplejson.dumps(program.toJson(False)))
      
class SeenHandler(BaseHandler):
    def get(self, id):
      media = Media.get_by_id(int(id))
      self.response.out.write(simplejson.dumps(media.seen_by()))
    def post(self):
      media = Media.get_by_id(int(self.request.get('id')))
      media.seen_by(self.current_user)
      self.response.out.write('')

class ChangeChannelHandler(BaseHandler):
    def post(self):
      channel_id = self.request.get('channel')
      channel = Channel.get_by_id(int(channel_id))

      user_sessions = UserSession.get_by_user(self.current_user)
      if len(user_sessions):
        last_channel_id = user_sessions[0].channel.key().id()
        if (datetime.datetime.now() - user_sessions[0].tune_in).seconds < 30:
          if len(user_sessions) > 1 and user_sessions[1].channel == channel:
            # If they switched to another channel, then switched back.
            session = user_sessions[1]
            session.tune_out = None
            session.put()
          else:
            session = user_sessions[0]
            session.tune_in = datetime.datetime.now()
            session.channel = channel
            session.put()
        else:
          user_sessions[0].tune_out = datetime.datetime.now()
          user_sessions[0].put()
          session = UserSession.new(self.current_user, channel)

      broadcastViewerChange(self.current_user, last_channel_id, channel_id, session.tune_in.isoformat());

#--------------------------------------
# CHANNEL HANDLERS
#--------------------------------------

class WebChannelConnectedHandler(BaseHandler):
  def post(self):
    clientId = self.request.get('from')
    web_channels = simplejson.loads(memcache.get('web_channels') or '{}')
    web_channels[clientId] = 1
    memcache.set('web_channels', simplejson.dumps(web_channels))

class WebChannelDisconnectedHandler(BaseHandler):
  def post(self):
    clientId = self.request.get('from')
    web_channels = simplejson.loads(memcache.get('web_channels') or '{}')
    del web_channels[clientId]
    memcache.set('web_channels', simplejson.dumps(web_channels))

    current_viewers = simplejson.loads(memcache.get('current_viewers') or '{}')
    if clientId in current_viewers:
      user = User.get_by_key_name(clientId)

      # End the user session
      user_sessions = UserSession.get_by_user(user)
      if len(user_sessions) and not user_sessions[0].tune_out:
        user_sessions[0].tune_out = datetime.datetime.now()
        user_sessions[0].put()

      del current_viewers[clientId]
      memcache.set('current_viewers', simplejson.dumps(current_viewers))

#--------------------------------------
# CHANNEL HELPERS
#--------------------------------------

def broadcastViewerChange(user, last_channel_id, channel_id, time):
  response = {}
  response['type'] = 'viewer_change'
  response['user'] = user.toJson()
  response['last_channel_id'] = last_channel_id
  response['channel_id'] = channel_id
  response['time'] = time
  channels = simplejson.loads(memcache.get('web_channels') or '{}')
  for client in channels.iterkeys():
    channel.send_message(client, simplejson.dumps(response))

#--------------------------------------
# APPLICATION INIT
#--------------------------------------

app = webapp2.WSGIApplication([
    # Channel URIs
    ('/_ah/channel/connected/', WebChannelConnectedHandler),
    ('/_ah/channel/disconnected/', WebChannelDisconnectedHandler),
    # RPCs
    ('/_addprogram', ProgramHandler),
    ('/_changechannel', ChangeChannelHandler),
    ('/_seen', SeenHandler),
    ('/_seen/(.*)', SeenHandler),

    ('/', MainHandler)],
  debug=True,
  config=constants.CONFIG)
