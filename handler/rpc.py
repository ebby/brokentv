from common import *

def get_session(current_user):
  data = {}

  channels = None
  cached_channels = simplejson.loads(memcache.get('channels') or '{}')
  if not len(cached_channels):
    # No cached channels, attempt to fetch
    channels = Channel.get_public()
    cached_channels = [c.toJson() for c in channels]
    memcache.set('channels', simplejson.dumps(cached_channels))
    
  cached_programming = simplejson.loads(memcache.get('programming') or '{}')
  if not len(cached_programming):
    # No cached programming, attempt to fetch
    channels = channels or Channel.get_public()
    cached_programming = Program.get_current_programs(channels)
    memcache.set('programming', simplejson.dumps(cached_programming))

  # Tack on the user's private channel if it exists, and programming
  user_channel = current_user.channel.get()
  if user_channel:
    user_programs = Program.get_current_programs([user_channel])
    if user_programs:
      cached_channels.append(user_channel.toJson())
      cached_programming = dict(cached_programming.items() + user_programs.items())

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
  channels = channels or Channel.get_public()
  current_channel = channels[0] if len(channels) else None
  assert current_channel != None, 'NO CHANNELS IN DATABASE'

  # Add latest User Session, possibly end last session, possibly continue last session.
  user_sessions = UserSession.get_by_user(current_user)
  if len(user_sessions):
    current_channel = Channel.get_by_key_name(user_sessions[0].channel.key().name())

  if len(user_sessions) and not user_sessions[0].tune_out:
    user_sessions[0].tune_out = user_sessions[0].tune_in + datetime.timedelta(seconds=180)
    user_sessions[0].put()

  if len(user_sessions) and user_sessions[0].tune_out and \
      (datetime.datetime.now() - user_sessions[0].tune_out).seconds < 180:
    user_sessions[0].tune_out = None
    user_sessions[0].put()
  else:
    UserSession.new(current_user, current_channel)
  
  # Track current viewers by channel, useful for audience catering
  channel_viewers = memcache.get('channel_viewers') or {}
  if not channel_viewers.get(current_channel.id) or \
      current_user.id not in channel_viewers[current_channel.id]:
    client = memcache.Client()
    for i in range(3): # Retry loop
      channel_viewers = client.gets('channel_viewers') or {}
      channel_viewers[current_channel.id] = \
          channel_viewers.get(current_channel.id, []) + [current_user.id]
      set = client.cas('channel_viewers', channel_viewers)
      if set:
         break
    if not set:
      memcache.set('channel_viewers', channel_viewers)

  # Grab sessions for current_users (that we care about)
  viewer_sessions = []
  for uid in current_viewers:
    user_sessions = UserSession.get_by_user(User.get_by_key_name(uid))
    if len(user_sessions):
      viewer_sessions.append(user_sessions[0].toJson())
  data['viewer_sessions'] = viewer_sessions

  user_obj = current_user.toJson()
  user_obj['current_channel'] = current_channel.id
  data['current_user'] = user_obj
  return data

class SessionHandler(BaseHandler):
    def post(self):
      if self.current_user.access_level < AccessLevel.USER:
        self.error(401)
      else:
        data = get_session(self.current_user)
        self.response.out.write(simplejson.dumps(data))

class ProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_key_name(self.request.get('channel_id'))
      if channel and channel.id == self.current_user.id:
        media = Media.get_by_key_name(self.request.get('media_id'))
        program = Program.add_program(channel, media)
        self.response.out.write(simplejson.dumps(program.toJson(False)))
      
class InfoHandler(BaseHandler):
    def get(self, id):
      media = Media.get_by_key_name(id)
      response = {}
      response['description'] = media.description
      response['seen'] = media.seen_by()
      response['comments'] = [c.toJson() for c in Comment.get_by_media(media)]
      response['tweets'] = [t.toJson() for t in media.get_tweets()]
      self.response.out.write(simplejson.dumps(response))

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
      offset = self.request.get('offset') or 0
      if uid:
        user = User.get_by_key_name(uid)
        activities = UserActivity.get_for_user(user, offset=int(offset))
      else:
        activities = UserActivity.get_stream(self.current_user, offset=int(offset))
      self.response.out.write(simplejson.dumps([a.toJson() for a in activities]))
      
class ChangeChannelHandler(BaseHandler):
    def post(self):
      channel_id = self.request.get('channel')  
      channel = Channel.get_by_key_name(channel_id)
      if not channel and channel_id == self.current_user.id:
        # Create private user channel
        name = self.current_user.name.split(' ')[0] + '\'s channel'
        channel = Channel(key_name=self.current_user.id, name=name, privacy=Privacy.PRIVATE,
                          user=self.current_user)
        channel.put()
      channel_viewers = memcache.get('channel_viewers') or {}

      user_sessions = UserSession.get_by_user(self.current_user)
      remove_user = False
      if len(user_sessions):
        last_channel_id = user_sessions[0].channel.id
        remove_user = True
        
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
          
          # Track the media opt-out behavior
          last_channel = Channel.get_by_key_name(last_channel_id)
          last_program = last_channel.get_current_program()
          if last_program:
            Media.add_opt_out(last_program.media.key().name(), self.current_user.id)

        # New session for new channel
        session = UserSession.new(self.current_user, channel)
        
        # Track current viewers by channel, useful for audience catering
        client = memcache.Client()
        for i in range(3):
          channel_viewers = client.gets('channel_viewers') or {}
          if remove_user and self.current_user.id in channel_viewers.get(last_channel_id, []):
            # Remove user from channel
            channel_viewers[last_channel_id].remove(self.current_user.id)
          channel_viewers[channel_id] = channel_viewers.get(channel_id, []) + [self.current_user.id]
          set = client.cas('channel_viewers', channel_viewers)
        if not set:
          memcache.set('channel_viewers', channel_viewers)
        
        # Track the media opt-in behavior
        current_program = channel.get_current_program()
        if current_program:
          Media.add_opt_in(current_program.media.key().name(), self.current_user.id)

      broadcast.broadcastViewerChange(self.current_user, last_channel_id, channel_id,
                                      session.key().id(), session.tune_in.isoformat());

class CollectionsMediaHandler(BaseHandler):
  def get(self, col_id=None):
    col = Collection.get_by_id(int(col_id))
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)]))
    
class PublisherMediaHandler(BaseHandler):
  def get(self, pub_id=None):
    pub = Publisher.get_by_key_name(pub_id)
    self.response.out.write(simplejson.dumps([m.toJson() for m in pub.get_medias(20)]))

class OptInHandler(BaseHandler):
  def post(self):
    Media.add_opt_in(self.request.get('media_id'), self.current_user.id)

class StartedHandler(BaseHandler):
  def post(self):
    Media.add_started(self.request.get('media_id'), self.current_user.id)

class StarHandler(BaseHandler):
  def get(self, uid=None):
    if not uid:
      uid = self.current_user.id
    col = Collection.get_by_key_name(uid)
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)] if col else []))
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id,
                                          user=self.current_user,
                                          name='Starred')
    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media, True)
      broadcast.broadcastNewActivity(UserActivity.add_starred(self.current_user, media))
    
class TweetHandler(BaseHandler):
  def get(self, media_key):
    media = Media.get_by_key_name(media_key)
    if media:
      tweets = media.get_tweets()
      self.response.out.write(simplejson.dumps([t.to_json() for t in tweets]))
    
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