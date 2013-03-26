from common import *

#--------------------------------------
# CHANNEL HANDLERS
#--------------------------------------

class WebChannelConnectedHandler(BaseHandler):
  def post(self):
    client_id = self.request.get('from')
    def add_client(web_channels, client_id):
      web_channels[client_id] = 1
      return web_channels
    web_channels = memcache_cas('web_channels', add_client, client_id)

class WebChannelDisconnectedHandler(BaseHandler):
  def post(self):
    client_id = self.request.get('from')
    def remove_client(clients, client_id):
      if client_id in clients:
        del clients[client_id]
      return clients
    web_channels = memcache_cas('web_channels', remove_client, client_id)

    current_viewers = memcache.get('current_viewers') or {}
    channel_viewers = memcache.get('channel_viewers') or {}
    if client_id in current_viewers:
      user = User.get_by_key_name(client_id)

      # End the user session
      user_sessions = UserSession.get_by_user(user)
      last_session = None
      if len(user_sessions) and not user_sessions[0].tune_out:
        last_session = user_sessions[0]
        last_session.end_session()

      if last_session and current_viewers[client_id]['id'] != last_session.id:
        web_channels = memcache_cas('current_viewers', remove_client, client_id)

      if channel_viewers.get(user_sessions[0].channel.id) and \
          client_id in channel_viewers[user_sessions[0].channel.id]:
        client = memcache.Client()
        for i in range(3):
          channel_viewers = client.gets('channel_viewers')
          if client_id in channel_viewers[user_sessions[0].channel.id]:
            channel_viewers[user_sessions[0].channel.id].remove(client_id)
          set = client.cas('channel_viewers', channel_viewers)
          if set:
            break
        if not set:
          memcache.set('channel_viewers', channel_viewers)
