from common import *

def get_session(current_user, media_id=None, channel_id=None, set_programming=True):
  data = {}

  # RETREIVE CHANNELS AND PROGRAMMING
  channels = None
  cached_channels = memcache.get('channels') or []
  if not len(cached_channels):
    # No cached channels, attempt to fetch
    channels = Channel.get_public()
    cached_channels = [c.toJson() for c in channels]
    memcache.set('channels', cached_channels)

  cached_programming = memcache.get('programming') or {}
  new_programming = False
  for channel in cached_channels:
    next_time = iso8601.parse_date(channel['next_time']).replace(tzinfo=None) \
        if channel['next_time'] else None
    if set_programming and (not next_time or next_time < datetime.datetime.now()):
      # Kick our programming backend off. It shuts down when users leave.
      #programming.Programming.set_programming(channel['id'], queue='programming', kickoff=True)
      #new_programming = True
      deferred.defer(programming.Programming.set_programming, channel['id'],
                     _name=channel['name'].replace(' ', '') + '-' + str(uuid.uuid1()),
                     _queue='programming', fetch_twitter=(not constants.DEVELOPMENT))
  if not len(cached_programming) or new_programming:
    # No cached programming, attempt to fetch
    channels = channels or Channel.get_public()
    cached_programming = Program.get_current_programs(channels)

  # Tack on the user's private channel if it exists, and programming
  user_channel = current_user.channel.get()
  
  if media_id:
    media = Media.get_by_key_name(media_id)
    if media:
      current_channel = user_channel or Channel.get_my_channel(current_user)
      program = Program.add_program(current_channel, media, time=datetime.datetime.now(), async=True)

  if user_channel:
    user_programs = Program.get_current_programs([user_channel])
    if user_programs:
      cached_channels.append(user_channel.toJson())
      cached_programming = dict(cached_programming.items() + user_programs.items())

  data['channels'] = cached_channels
  data['programs'] = cached_programming
 
  # CREATE BROWSER CHANNEL
  token = browserchannel.create_channel(current_user.id)
  data['token'] = token
    
  # MAKE SURE WE HAVE CHANNELS
  channels = channels or Channel.get_public()
  assert len(channels) > 0, 'NO CHANNELS IN DATABASE'
  
  current_viewers = memcache.get('current_viewers') or {}
  current_friends = [tuple for tuple in current_viewers.iteritems() \
                      if tuple[0] in current_user.friends \
                      or (current_user.demo and tuple[0] in SUPER_ADMINS)]
  with_friends = len(current_friends) > 0

  user_sessions = UserSession.get_by_user(current_user)
  current_channel = None
  if media_id:
    current_channel = user_channel or Channel.get_my_channel(current_user)
  elif channel_id:
    current_channel = Channel.get_by_key_name(channel_id)
  elif len(user_sessions):
    current_channel = Channel.get_by_key_name(user_sessions[0].channel.key().name())

  if not current_channel:
    current_channel = channels[0] if len(channels) else None

  if len(user_sessions) and not user_sessions[0].tune_out:
    # Kill it, create new
    user_sessions[0].delete()
    session = UserSession.new(current_user, current_channel, with_friends=with_friends)
  elif len(user_sessions) and user_sessions[0].tune_out and \
      (datetime.datetime.now() - user_sessions[0].tune_out).seconds < 180:
    # Re-purpose last session (typically if the user refreshed)
    session = user_sessions[0]
    session.tune_out = None
    session.put()
  else:
    session = UserSession.new(current_user, current_channel, with_friends=with_friends)
    
  # TRACK ALL USERS
  def add_viewer(current_viewers, uid, session):
    current_viewers[uid] = session
    return current_viewers
  current_viewers = memcache_cas('current_viewers', add_viewer, current_user.id, session.toJson())
  
  # Track current viewers by channel, useful for audience tailoring
  channel_viewers = memcache.get('channel_viewers') or {}
  set = False
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
  # TODO cache last session for each user
  viewer_sessions = [session.toJson()]
  for uid,sess in [tuple for tuple in current_viewers.iteritems() if \
                   (tuple[0] in current_user.friends or \
                    (current_user.demo and tuple[0] in SUPER_ADMINS))]:
    viewer_sessions.append(sess)
  data['viewer_sessions'] = viewer_sessions

  # ME
  user_obj = current_user.toJson(configs=True)
  user_obj['current_channel'] = current_channel.id
  data['current_user'] = user_obj

  # Update login
  current_user.last_login = datetime.datetime.now()
  current_user.put()

  broadcast.broadcastViewerChange(current_user, None, current_channel.id,
                                  session.key().id(), session.tune_in.isoformat());
  return data

class SessionHandler(BaseHandler):
  def post(self):
    if self.current_user.access_level < AccessLevel.USER:
      self.error(401)
    else:
      data = {}
      
      user_agent = self.request.headers.get('user_agent')
      if self.current_user.id not in constants.SUPER_ADMINS:
        if 'Mobile' in user_agent:
          data['error'] = 'Mobile access is not supported yet.'
        ie = re.search('/MSIE\s([\d]+)/', user_agent)
        ff = re.search('/firefox\/([\d]+)/', user_agent)
        if (ie and ie < 10) or (ff and ff < 6):
          data['error'] = 'Please use a modern browser like Chrome.'

      media_id = self.session.get('media_id', None)
      channel_id = self.session.get('channel_id', None)

      if not data.get('error'):
        data = get_session(self.current_user, media_id=media_id, channel_id=channel_id)
      self.response.out.write(simplejson.dumps(data))

class SettingsHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    user = self.current_user
    show_guide = self.request.get('show_guide') == 'true'
    show_sidebar = self.request.get('show_sidebar') == 'true'
    user.show_guide = show_guide
    user.show_sidebar = show_sidebar
    user.put()

    if self.request.get('current_seek'):
      channel = Channel.get_by_key_name(self.current_user.id)
      program = channel.get_current_program()
      if program:
        program.seek = int(self.request.get('current_seek'))
        program.put()

class ProgramHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, channel_id):
    duration = self.request.get('duration')
    duration = int(duration) if duration else 1200
    channel = Channel.get_by_key_name(channel_id)
    cached_programming = memcache.get('programming') or {}
    programs = []
    if cached_programming.get(channel_id):
      programs = programming.Programming.next_programs(cached_programming[channel_id], duration)
    self.response.out.write(simplejson.dumps(programs))
  
  @BaseHandler.logged_in
  def post(self):
    channel = Channel.get_by_key_name(self.request.get('channel_id'))
    url = self.request.get('url')
    media_id = self.request.get('media_id')
    now = self.request.get('now') == 'true'
    if channel and url:
      # Add to pending media for user suggestion collection
      media = Media.add_from_url(url)
      channel.get_suggested().add_media(media)
      self.response.out.write(simplejson.dumps({}))
    if channel and media_id and channel.id == self.current_user.id:
      # Add to my personal channel
      media = Media.get_by_key_name(media_id)
      program = Program.add_program(channel, media,
                                    time=(datetime.datetime.now() if now else None), 
                                    async=True)
      self.response.out.write(simplejson.dumps(program.toJson(False)))
      
class InfoHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    media = Media.get_by_key_name(id)
    if media:
      response = {}
      response['description'] = media.description
      response['seen'] = media.seen_by(self.current_user)
      response['comments'] = [c.toJson() for c in Comment.get_by_media(media, uid=self.current_user.id)]
      response['tweets'] = [t.to_json() for t in media.get_tweets()]
      self.response.out.write(simplejson.dumps(response))
        
class PublisherHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    pub = Publisher.get_by_key_name(id)
    if pub:
      self.response.out.write(simplejson.dumps(pub.toJson()))

class CommentHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    offset = self.request.get('offset') or 0
    media = Media.get_by_key_name(id)
    comments = Comment.get_by_media(media, uid=self.current_user.id, offset=int(offset))
    return self.response.out.write(simplejson.dumps([c.toJson() for c in comments]))

  @BaseHandler.logged_in
  def post(self):
    delete = self.request.get('delete') == 'true'
    id = self.request.get('id')
    if delete and id:
      c = Comment.get_by_id(int(id))
      if c:
        c.delete()
      return

    media = Media.get_by_key_name(self.request.get('media_id'))
    text = self.request.get('text')
    tweet = self.request.get('tweet') == 'true'
    facebook = self.request.get('facebook') == 'true'
    parent_id = self.request.get('parent_id')

    if media and text:
      acl = self.current_user.friends + [self.current_user.id]
      if self.current_user.demo:
        acl += SUPER_ADMINS
      c = Comment.add(media, self.current_user, text,
                      acl=acl, parent_id=parent_id)
      
      new_tweet = None
      if tweet:
        client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY,
                                     constants.TWITTER_CONSUMER_SECRET,
                                     self.request.host_url + '/_twitter/callback')
        text += ' ' + media.link
        response = client.update_status(text, self.current_user.twitter_token,
                                        self.current_user.twitter_secret)
        if not response.get('errors'):
          new_tweet = Tweet.add_from_response(self.current_user, response, media)
        else:
          logging.warning('TWITTER ERROR: ' + str(response['errors']))
      
      # Update user prefs
      current_user = self.current_user
      current_user.post_facebook = facebook
      current_user.post_twitter = tweet
      current_user.put()
      
      Stat.add_comment(self.current_user, facebook, tweet)
      broadcast.broadcastNewComment(c, new_tweet);

      response = {
                  'comment': c.toJson(),
                  'tweet': new_tweet.to_json() if new_tweet else None
                  }
      self.response.out.write(simplejson.dumps(response))

class LinkHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    url = self.request.get('url')
    link = Link.get_or_add(url)
    self.response.out.write(simplejson.dumps({'link': constants.SHARE_URL + link.path}))

class ShareHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    facebook = self.request.get('facebook') == 'true'
    twitter = self.request.get('twitter') == 'true'
    Stat.add_share(self.current_user, facebook, twitter)

class SeenHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    media = Media.get_by_key_name(id)
    self.response.out.write(simplejson.dumps(media.seen_by(self.current_user)))
    
  @BaseHandler.logged_in
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    session = UserSession.get_by_id(int(self.request.get('session_id')))
    async = self.request.get('async') == 'true'
    if session and media:
      session.add_media(media)
    if media:
      media.set_seen_by(self.current_user)
    if async:
      channel = Channel.get_by_key_name(self.current_user.id)
      channel.current_media = None
      channel.current_seek = None
      channel.put()
      program = channel.get_current_program()
      program.seek = None
      program.put()

class ActivityHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, uid=None):
    offset = self.request.get('offset') or 0
    if uid:
      user = User.get_by_key_name(uid)
      activities = UserActivity.get_for_user(user, offset=int(offset)) if user else []
    else:
      activities = UserActivity.get_stream(self.current_user, offset=int(offset))
    self.response.out.write(simplejson.dumps([a.toJson() for a in activities if a.user]))
      
class ChangeChannelHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    channel_id = self.request.get('channel')
    with_friends = self.request.get('friends') == 'true'
    forced = self.request.get('forced') == 'true' # Forced by the client, don't update opt_in/out
    channel = Channel.get_by_key_name(channel_id)
    if not channel and channel_id == self.current_user.id:
      channel = Channel.get_my_channel(self.current_user)

    user_sessions = UserSession.get_by_user(self.current_user)
    remove_user = False
    if len(user_sessions):
      last_channel_id = user_sessions[0].channel.id
      remove_user = True
      
      if (datetime.datetime.now() - user_sessions[0].tune_in).seconds < 30:
        if len(user_sessions) > 1 and user_sessions[1].channel.id == channel.id:
          # If they switched to another channel, then switched back.
          session = user_sessions[1]
          session.tune_out = None
          session.put()
          user_sessions[0].delete()
        else:
          # Re-purpose last session
          session = user_sessions[0]
          session.tune_in = datetime.datetime.now()
          session.channel = channel
          session.put()
      else:
        # End last session
        user_sessions[0].end_session()
        # New session for new channel
        session = UserSession.new(self.current_user, channel, with_friends=with_friends)
        
      if not forced:
        # Track the media opt-out behavior
        last_channel = Channel.get_by_key_name(last_channel_id)
        last_program = last_channel.get_current_program()
        if last_program:
          Media.add_opt_out(last_program.media.key().name(), self.current_user.id)
    else:
      session = UserSession.new(self.current_user, channel, with_friends=with_friends)
      
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
  @BaseHandler.logged_in
  def get(self, col_id=None):
    col = Collection.get_by_id(int(col_id))
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)]))

class PublisherMediaHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, pub_id=None):
    pub = Publisher.get_by_key_name(pub_id)
    self.response.out.write(simplejson.dumps([m.toJson() for m in pub.get_medias(20)]))

class OptInHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    Media.add_opt_in(self.request.get('media_id'), self.current_user.id)

class StartedHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    Media.add_started(self.request.get('media_id'), self.current_user.id)

class StarHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, uid=None):
    if not uid:
      uid = self.current_user.id
    col = Collection.get_by_key_name(uid)
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)] if col else []))

  @BaseHandler.logged_in
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id,
                                          user=self.current_user,
                                          name='Starred')
    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media, True)
      Stat.add_star(media)
      broadcast.broadcastNewActivity(UserActivity.add_starred(self.current_user, media))

class TweetHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, media_key):
    offset = self.request.get('offset') or 0
    media = Media.get_by_key_name(media_key)
    if media:
      tweets = media.get_tweets(offset=int(offset))
      self.response.out.write(simplejson.dumps([t.to_json() for t in tweets]))

class TwitterHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    client = oauth.TwitterClient(constants.TWITTER_CONSUMER_KEY, constants.TWITTER_CONSUMER_SECRET,
                                 constants.TWITTER_CALLBACK)
    response = {
      'auth': self.current_user.twitter_token,
      'auth_url': client.get_authorization_url()
    }
    self.response.out.write(simplejson.dumps(response))
  
  @BaseHandler.logged_in
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
    broadcast.broadcastTwitterAuth(self.current_user)
    self.response.out.write('<script>window.close()</script>')
    
class WelcomedHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    current_user = self.current_user
    current_user.welcomed = True
    current_user.put()
