from common import *

def get_session(current_user, media_id=None, channel_id=None, single_channel_id=None,
                set_programming=True):
  data = {}

  # RETREIVE CHANNELS AND PROGRAMMING
  channels = None
  cached_channels = memcache.get('channels') or []
  if not len(cached_channels):
    # No cached channels, attempt to fetch
    channels = Channel.get_public()
    cached_channels = [c.toJson() for c in channels]
    memcache.set('channels', cached_channels)

  if single_channel_id:
    single_channel = filter(lambda c: c['id'] == single_channel_id, cached_channels)
    if len(single_channel):
      channels = single_channel

  cached_programming = memcache.get('programming') or {}

  if not len(cached_programming):
    if constants.SAVE_PROGRAMS:
      # No cached programming, attempt to fetch
      channels = channels or Channel.get_public()
      cached_programming = Program.get_current_programs(channels)
    else:
      # Generate programming to memcache
      for channel in cached_channels:
        deferred.defer(programming.Programming.set_programming, channel['id'],
                       _name=channel['name'].replace(' ', '') + '-' + str(uuid.uuid1()),
                       _queue='programming', fetch_twitter=(not constants.DEVELOPMENT))
  

  # Tack on the user's private channel if it exists, and programming
  user_channel = current_user.channel.get()
  
  media = None
  current_channel = None
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
  
  user_json = memcache.get(current_user.id) or {}
  if 'channels' in user_json:
    for cid in user_json['channels']:
      c = memcache.get(cid) 
      if c and len(c.get('programs', [])):
        last_program_time = iso8601.parse_date(c.get('programs')[-1]['time']).replace(tzinfo=None)
        if last_program_time > datetime.datetime.now():
          cached_channels.append(c['channel'])
          cached_programming = dict(cached_programming.items() + {cid:c['programs']}.items())
        else:
          user_json['channels'].remove(cid)
          memcache.delete(cid)

  data['channels'] = channels or cached_channels
  data['programs'] = cached_programming
    
  # MAKE SURE WE HAVE CHANNELS
  channels = channels or Channel.get_public()
  assert len(channels) > 0, 'NO CHANNELS IN DATABASE'

  # ME
  user_obj = current_user.toJson(configs=True)
  user_obj['current_channel'] = current_channel.id if current_channel else current_user.current_channel_id \
      if current_user.current_channel_id else channels[0].id
  data['current_user'] = user_obj

  # Update login
  current_user.last_login = datetime.datetime.now()
  current_user.put()

  return data

class SessionHandler(BaseHandler):
  def post(self):
    if self.current_user.access_level < AccessLevel.USER and \
        constants.INVITE_POLICY() == constants.InvitePolicy.ANYBODY:
      self.current_user.grant_access()

    if self.current_user.access_level < AccessLevel.USER:
      self.error(401)
    else:
      data = {}

      user_agent = self.request.headers.get('user_agent')
      if self.current_user.id not in constants.SUPER_ADMINS:
        if 'Mobile' in user_agent and False: # Allow all mobile for now
          data['error'] = 'Mobile access is not supported yet.'
        ie = re.search('/MSIE\s([\d]+)/', user_agent)
        ff = re.search('/firefox\/([\d]+)/', user_agent)
        if (ie and ie < 10) or (ff and ff < 6):
          data['error'] = 'Please use a modern browser like Chrome.'

      media_id = self.session.get('media_id', None)
      channel_id = self.session.get('channel_id', None)
      single_channel_id = self.session.get('single_channel_id', None)

      if not data.get('error'):
        data = get_session(self.current_user, media_id=media_id, channel_id=channel_id,
                           single_channel_id=single_channel_id)
      if self.session.get('message'):
        data['message'] = self.session['message']
      self.response.out.write(simplejson.dumps(data))

class PresenceHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    current_user = self.current_user
    data = {}
    
    # CREATE BROWSER CHANNEL
    token = browserchannel.create_channel(current_user.id)
    User.set_online(current_user.id, True)
    def add_client(web_channels, client_id, token):
      web_channels[client_id] = token
      return web_channels
    memcache_cas('web_channels', add_client, current_user.id, token)
    data['token'] = token
    
    current_viewers = memcache.get('current_viewers') or {}
    current_friends = [tuple for tuple in current_viewers.iteritems() \
                        if tuple[0] in current_user.friends \
                        or (current_user.demo and tuple[0] in SUPER_ADMINS)]
    with_friends = len(current_friends) > 0
    
    last_session_json = UserSession.get_last_session(current_user.id)
    current_channel_id = current_user.current_channel_id if current_user.current_channel_id \
        else Channel.get_public()[0].id
    current_channel = Channel.get_by_key_name(current_channel_id)
    last_session_tune_out = iso8601.parse_date(last_session_json['tune_out']).replace(tzinfo=None) \
        if last_session_json and last_session_json.get('tune_out') else None
    if last_session_json and not last_session_json['tune_out']:
      # Kill it, create new
      # Maybe kill it on this line?
      session_json = UserSession.new(current_user, current_channel, with_friends=with_friends).toJson()
    elif last_session_tune_out and (datetime.datetime.now() - last_session_tune_out).seconds < 180:
      # Re-purpose last session (typically if the user refreshed)
      session_json = UserSession.reset_last_session(current_user)
    else:
      session_json = UserSession.new(current_user, current_channel, with_friends=with_friends).toJson()
    
    # TRACK ALL USERS
    def add_current_viewer(current_viewers, uid, sid):
      current_viewers[uid] = sid
      return current_viewers
    current_viewers = memcache_cas('current_viewers', add_current_viewer, current_user.id, session_json['id'])
    
    # Track current viewers by channel, useful for audience tailoring
    channel_viewers = memcache.get('channel_viewers') or {}
    if not channel_viewers.get(current_channel_id) or \
        current_user.id not in channel_viewers[current_channel_id]:
      
      def add_channel_viewer(channel_viewers, cid, uid):
        channel_viewers[cid] = \
            channel_viewers.get(cid, []) + [uid]
        return channel_viewers
      channel_viewers = memcache_cas('channel_viewers', add_channel_viewer, current_channel_id, current_user.id)
  
    # Grab sessions for current_users (that we care about)
    viewer_sessions = [session_json]
    for uid,sess_id in [tuple for tuple in current_viewers.iteritems() if \
                     (tuple[0] in current_user.friends or \
                      (current_user.demo and tuple[0] in SUPER_ADMINS))]:
      sess_json = UserSession.get_last_session(uid)
      viewer_sessions.append(sess_json)
    data['viewer_sessions'] = viewer_sessions

    media = None
    media_id = self.session.get('media_id', None)
    if media_id:
      media = Media.get_by_key_name(media_id)
      
    # Potentially send friend invites
#    if not current_user.last_login:
#      deferred.defer(update_waitlist, current_user.id, current_channel_id,
#                     _name='update_waitlist' + '-' + str(uuid.uuid1()),
#                     _queue='programming')
    
    broadcast.broadcastViewerChange(current_user, None, current_channel_id,
                                    session_json['id'], session_json['tune_in'], media);

    self.response.out.write(simplejson.dumps(data))

def update_waitlist(*args, **kwargs):
  User.update_waitlist(*args, **kwargs)

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
      media = Media.get(media_id)
      program = Program.add_program(channel, media,
                                    time=(datetime.datetime.now() if now else None), 
                                    async=True)
      broadcast.broadcastViewerChange(self.current_user, None, channel.id,
                                    None, None, media);
      self.response.out.write(simplejson.dumps(program.toJson(False)))
      
class InfoHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    media = Media.get(id, fetch_publisher=True)
    if media:
      response = {}
      response['description'] = media.description
      response['seen'] = media.seen_by(self.current_user)
      response['comments'] = [c.toJson() for c in Comment.get_by_media(media, uid=self.current_user.id)]
      response['tweets'] = media.get_tweets()
      self.response.out.write(simplejson.dumps(response))

class FriendsHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    if self.request.get('offline'):
      following = self.current_user.get_following()
      self.response.out.write(simplejson.dumps([f.toJson() for f in following if not User.get_entry(f)]))
      return

    friends_json = []
    for fid in self.current_user.friends:
      user_json = User.get_entry(fid, fetch=False)
      if user_json:
        friends_json.append(user_json)
    self.response.out.write(simplejson.dumps(friends_json))

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
    to_user_id = self.request.get('to_user_id')
    to_user = None

    if media and text:
      if to_user_id and to_user_id != self.current_user.id:
        to_user = User.get_by_key_name(to_user_id)
      
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
        if to_user and to_user.twitter_handle:
          text = '@' + to_user.twitter_handle + ' ' + text
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
      broadcast.broadcastNewComment(c, new_tweet, to_user, self.request.host_url);

      response = {
                  'comment': c.toJson(),
                  'tweet': new_tweet.to_json() if new_tweet else None
                  }
      self.response.out.write(simplejson.dumps(response))

class MessageHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    offset = self.request.get('offset') or 0
    messages = []
    if id == self.current_user.id:
      messages = Message.get(self.current_user.id)
    else:
      messages = Message.get(self.current_user.id, id)
    self.response.out.write(simplejson.dumps([m.toJson() for m in messages]))
  @BaseHandler.logged_in
  def post(self):
    from_id = self.request.get('from_id')
    to_id = self.request.get('to_id')
    text = self.request.get('text')
    if from_id and to_id and text:
      from_user = User.get_by_key_name(from_id)
      to_user = User.get_by_key_name(to_id)
      message = Message.add(from_user=from_user, to_user=to_user, text=text)
      broadcast.broadcastNewMessage(message)
      self.response.out.write(simplejson.dumps(message.toJson()))

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
    self.response.out.write(simplejson.dumps(activities))
      
class ChangeChannelHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    channel_id = self.request.get('channel')
    with_friends = self.request.get('friends') == 'true'
    forced = self.request.get('forced') == 'true' # Forced by the client, don't update opt_in/out
    channel = Channel.get_by_key_name(channel_id)
    if not channel and channel_id == self.current_user.id:
      channel = Channel.get_my_channel(self.current_user)

    last_session_json = UserSession.get_last_session(self.current_user.id)
    last_channel_id = None
    remove_user = False
    if last_session_json:
      remove_user = True
      last_session = UserSession.get_by_id(int(last_session_json['id']))
      last_channel_id = last_session_json['channel_id']  
      if (datetime.datetime.now() - last_session.tune_in).seconds < 30:
        # Re-purpose last session
        session = last_session
        session.tune_in = datetime.datetime.now()
        session.channel = channel
        session.put()
      else:
        # End last session
        last_session.end_session()
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
    def add_viewer(channel_viewers, cid, uid):
      channel_viewers[cid] = \
          channel_viewers.get(cid, []) + [uid]
      return channel_viewers
    channel_viewers = memcache_cas('channel_viewers', add_viewer, channel_id, self.current_user.id)
    
    # Track the media opt-in behavior
    current_program = channel.get_current_program()
    if current_program:
      Media.add_opt_in(current_program.media.key().name(), self.current_user.id)

    current_user = self.current_user
    current_user.current_channel_id = channel_id
    current_user.put()

    broadcast.broadcastViewerChange(self.current_user, last_channel_id, channel_id,
                                    session.key().id(), session.tune_in.isoformat(),
                                    (current_program.media if current_program else None));

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
      
class LikeHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, media_id=None):
    media = Media.get_by_key_name(media_id)
    if media:
      likes = Collection.get_by_key_name(self.current_user.id + '-liked')
      dislikes = Collection.get_by_key_name(self.current_user.id + '-disliked')
      liked = likes.collectionMedias.filter('media =', media).get() if likes else False
      disliked = dislikes.collectionMedias.filter('media =', media).get() if dislikes else False
      self.response.out.write(simplejson.dumps({
                                                'media_id': media_id,
                                                'liked': 1 if liked else 0,
                                                'disliked': 1 if disliked else 0
                                                }))

  @BaseHandler.logged_in
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id + '-liked',
                                          user=self.current_user,
                                          name='Liked')
    
    if self.request.get('flip'):
      dislikes = Collection.get_by_key_name(self.current_user.id + '-disliked')
      if dislikes:
        dislikes.remove_media(media)
    
    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media, True)
      Stat.add_like(media)
      broadcast.broadcastNewActivity(UserActivity.add_like(self.current_user, media))

class DislikeHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id + '-disliked',
                                          user=self.current_user,
                                          name='Disliked')

    if self.request.get('flip'):
      likes = Collection.get_by_key_name(self.current_user.id + '-liked')
      if likes:
        likes.remove_media(media)

    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media, True)
      Stat.add_like(media)

class QueueHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    uid = self.current_user.id
    col = Collection.get_by_key_name(uid + '-queue')
    self.response.out.write(simplejson.dumps([m.toJson() for m in col.get_medias(20)] if col else []))

  @BaseHandler.logged_in
  def post(self):
    media = Media.get_by_key_name(self.request.get('media_id'))
    collection = Collection.get_or_insert(self.current_user.id + '-queue',
                                          user=self.current_user,
                                          name='Queue')
    if self.request.get('delete'):
      collection.remove_media(media)
    else:
      collection.add_media(media, True)

class TweetHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, media_key):
    offset = self.request.get('offset') or 0
    media = Media.get_by_key_name(media_key)
    if media:
      tweets_json = media.get_tweets(offset=int(offset))
      self.response.out.write(simplejson.dumps(tweets_json))

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
    
class YoutubeChannelHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    response = {}
    name = self.request.get('name')
    yt_channel_id = self.request.get('channel_id')
    yt_playlist_id = self.request.get('playlist_id')
    data_json = Channel.youtube_channel(self.current_user, name, yt_channel_id=yt_channel_id,
                                        yt_playlist_id=yt_playlist_id)
    self.response.out.write(simplejson.dumps(data_json))
