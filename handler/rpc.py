from common import *

def get_session(current_user):
  data = {}

  channels = None
  cached_channels = simplejson.loads(memcache.get('channels') or '{}')
  if not len(cached_channels):
    # No cached channels, attempt to fetch
    channels = Channel.all().fetch(100)
    cached_channels = {}
    for c in channels:
      cached_channels[c.key().id()] = c.toJson()
    memcache.set('channels', simplejson.dumps(channels))
    
  cached_programming = simplejson.loads(memcache.get('programming') or '{}')
  if not len(cached_programming):
    # No cached programming, attempt to fetch
    channels = channels or Channel.all().fetch(100)
    cached_programming = Program.get_current_programs(channels)

  data['channels'] = cached_channels
  data['programs'] = cached_programming
 
  token = browserchannel.create_channel(current_user.id)
  data['token'] = token

  client = memcache.Client()
  current_viewers = simplejson.loads(memcache.get('current_viewers') or '{}')
  if not current_user.id in current_viewers:
    current_viewers[current_user.id] = token
    memcache.set('current_viewers', simplejson.dumps(current_viewers))

  data['current_viewers'] = current_viewers
  current_channel = Channel.all().get()
  assert current_channel != None, 'NO CHANNELS IN DATABASE'

  # Add latest User Session, possibly end last session, possibly continue last session.
  user_sessions = UserSession.get_by_user(current_user)
  if len(user_sessions):
    current_channel = Channel.get_by_id(int(user_sessions[0].channel.key().id()))

  if len(user_sessions) and not user_sessions[0].tune_out:
    user_sessions[0].tune_out = user_sessions[0].tune_in + datetime.timedelta(seconds=180)
    user_sessions[0].put()

  if len(user_sessions) and user_sessions[0].tune_out and (datetime.datetime.now() - user_sessions[0].tune_out).seconds < 180:
    user_sessions[0].tune_out = None
    user_sessions[0].put()
  else:
    UserSession.new(current_user, current_channel)

  # Grab sessions for current_users (that we care about)
  viewer_sessions = []
  for uid in current_viewers:
    user_sessions = UserSession.get_by_user(User.get_by_key_name(uid))
    if len(user_sessions):
      viewer_sessions.append(user_sessions[0].toJson())
  data['viewer_sessions'] = viewer_sessions

  user_obj = current_user.toJson()
  user_obj['current_channel'] = current_channel.key().id()
  data['current_user'] = user_obj
  return data

class SessionHandler(BaseHandler):
    def post(self):
      if self.current_user.access_level < constants.AccessLevel.USER:
        self.error(401)
      else:
        data = get_session(self.current_user)
        self.response.out.write(simplejson.dumps(data))

class ProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_id(int(self.request.get('channel')))
      program = Program.add_program(channel, self.request.get('youtube_id'))
      self.response.out.write(simplejson.dumps(program.toJson(False)))
      
class CommentHandler(BaseHandler):
    def get(self, id):
      media = Media.get_by_key_name(id)
      comments = Comment.get_by_media(media)
      return self.response.out.write(simplejson.dumps([c.toJson() for c in comments]))
    def post(self):
      media = Media.get_by_key_name(self.request.get('media_id'))
      text = self.request.get('text')
      tweet = self.request.get('tweet') == 'true'
      if media and text:
        c = Comment.add(media, self.current_user, text, self.request.get('parent_id'))
        broadcast.broadcastNewComment(c);
        if tweet:
          client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY,
                                       constants.TWITTER_CONSUMER_SECRET,
                                       self.request.host_url + '/_twitter/callback')
          response = client.update_status(text, self.current_user.twitter_token,
                                          self.current_user.twitter_secret)
      
class SeenHandler(BaseHandler):
    def get(self, id):
      media = Media.get_by_key_name(id)
      self.response.out.write(simplejson.dumps(media.seen_by()))
    def post(self):
      media = Media.get_by_key_name(self.request.get('media_id'))
      session = UserSession.get_by_id(int(self.request.get('session_id')))
      if session and media:
        session.add_media(media)
      if media:
       media.seen_by(self.current_user)
       
class ActivityHandler(BaseHandler):
    def get(self, uid=None):
      user = self.current_user
      if uid:
        user = user.get_by_key_name(uid)
      activities = UserActivity.get_for_user(user)
      return self.response.out.write(simplejson.dumps([a.toJson() for a in activities]))
      
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
          user_sessions[0].end_session()
          session = UserSession.new(self.current_user, channel)

      broadcast.broadcastViewerChange(self.current_user, last_channel_id, channel_id, session.tune_in.isoformat());

class CollectionsHandler(BaseHandler):
  def get(self, channel_id=None):
    channel = Channel.get_by_id(int(channel_id))
    collections = CollectionChannel.get_collections(channel)
    self.response.out.write(simplejson.dumps([c.toJson() for c in collections]))

class CollectionsMediaHandler(BaseHandler):
  def get(self, col_id=None):
    col = Collection.get_by_id(int(col_id))
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)]))
    
class PublisherMediaHandler(BaseHandler):
  def get(self, pub_id=None):
    pub = Publisher.get_by_id(int(pub_id))
    self.response.out.write(simplejson.dumps([m.toJson() for m in pub.get_medias(20)]))

class StarHandler(BaseHandler):
  def get(self, uid=None):
    if not uid:
      uid = self.current_user.id
    col = Collection.get_by_key_name(uid)
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)] if col else []))
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id, user=self.current_user, name='Starred')
    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media)
      UserActivity.add_starred(self.current_user, media)
    # Broadcast?
    
class TwitterHandler(BaseHandler):
  def get(self):
    client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY, constants.TWITTER_CONSUMER_SECRET,
                                 constants.TWITTER_CALLBACK)
    response = {
      'auth': self.current_user.twitter_token,
      'auth_url': client.get_authorization_url()
    }
    self.response.out.write(simplejson.dumps(response))
  def post(self):
    client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY, constants.TWITTER_CONSUMER_SECRET,
                                 constants.TWITTER_CALLBACK)
    client.update_status(self.request.get('status'))

class TwitterCallbackHandler(BaseHandler):
  def get(self):
    auth_token = self.request.get("oauth_token")
    auth_verifier = self.request.get("oauth_verifier")
    client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY, constants.TWITTER_CONSUMER_SECRET,
                                 constants.TWITTER_CALLBACK)
    user_info = client.get_user_info(auth_token, auth_verifier=auth_verifier)
    self.current_user.set_twitter_info(user_info)
    self.response.out.write('<script>window.close()</script>')