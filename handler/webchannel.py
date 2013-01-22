from common import *

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
    channel_viewers = memcache.get('channel_viewers') or {}
    if clientId in current_viewers:
      user = User.get_by_key_name(clientId)

      # End the user session
      user_sessions = UserSession.get_by_user(user)
      if len(user_sessions) and not user_sessions[0].tune_out:
        user_sessions[0].end_session()

      del current_viewers[clientId]
      memcache.set('current_viewers', simplejson.dumps(current_viewers))

      if channel_viewers.get(user_sessions[0].channel.id) and \
          clientId in channel_viewers[user_sessions[0].channel.id]:
        client = memcache.Client()
        for i in range(3):
          channel_viewers = client.gets('channel_viewers')
          channel_viewers[user_sessions[0].channel.id].remove(clientId)
          set = client.cas('channel_viewers', channel_viewers)
          if set:
            break
        if not set:
          memcache.set('channel_viewers', channel_viewers)
