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
    if self.session.get('user'):
      del self.session['user']

    client_id = self.request.get('from')
    def remove_client(clients, client_id):
      if clients.get(client_id):
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

      web_channels = memcache_cas('current_viewers', remove_client, client_id)

      if channel_viewers.get(user_sessions[0].channel.id) and \
          client_id in channel_viewers[user_sessions[0].channel.id]:
        def remove_channel_viewer(channel_viewers, client_id, channel_id):
          if client_id in channel_viewers[channel_id]:
            channel_viewers[channel_id].remove(client_id)
          return channel_viewers
        channel_viewers = memcache_cas('channel_viewers', remove_channel_viewer, client_id,
                                       user_sessions[0].channel.id)

      if last_session:    
        broadcast.broadcastViewerChange(user, last_session.channel.id, None, last_session.id,
                                        datetime.datetime.now().isoformat())
