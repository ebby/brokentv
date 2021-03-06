from common import *

def get_session(current_user=None, media_id=None, channel_id=None, single_channel_id=None,
                youtube_channel_id=None, set_programming=True):
  data = {}

  # RETREIVE CHANNELS AND PROGRAMMING
  channels = None
  cached_channels = memcache.get('channels') or []
  if not len(cached_channels):
    # No cached channels, attempt to fetch
    channels = Channel.get_public()
    if channels and len(channels):
      cached_channels = [c.toJson() for c in channels]
      memcache.set('channels', cached_channels)

  cached_programming = memcache.get('programming') or {}

  if single_channel_id:
    single_channel = filter(lambda c: c['id'] == single_channel_id, cached_channels)
    if len(single_channel):
      cached_channels = single_channel

  if youtube_channel_id:
    if len(youtube_channel_id.split(',')) > 1:
      youtube_channel_name = youtube_channel_id.split(',')[0]
      youtube_channel_id = youtube_channel_id.split(',')[1]
    else:
      youtube_channel_name = youtube_channel_id

    cid = None
    cached_channel = None
    data_json = Channel.youtube_channel(youtube_channel_name, user=current_user,
                                        yt_channel_id=youtube_channel_id)
    youtube_channel = data_json['channel']
    cached_programming = dict(cached_programming.items() + {youtube_channel['id']:data_json['programs']}.items())
    channels = [youtube_channel]
    current_channel = youtube_channel
    cached_channels = channels

  if not youtube_channel_id:
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


  # user_channel = None
  # if not youtube_channel_id:
  #   # Tack on the user's private channel if it exists, and programming
  #   user_channel = current_user.channel.get() or Channel.get_my_channel(current_user) if current_user \
  #       else None

  media = None
  current_channel = None
  if media_id:
    media = Media.get_by_key_name(media_id)
  #   if media and user_channel:
  #     current_channel = user_channel
  #     program = Program.add_program(current_channel, media, time=datetime.datetime.now(), async=True)

  # if user_channel:
  #   user_programs = Program.get_current_programs([user_channel])
  #   if user_programs:
  #     cached_channels.append(user_channel.toJson())
  #     cached_programming = dict(cached_programming.items() + user_programs.items())
  if media:
    current_channel = Channel(key_name='temp', name='My Channel', privacy=constants.Privacy.PRIVATE)
    program = Program.add_program(current_channel, media, time=datetime.datetime.now())
    program.async = True
    cached_channels.append(current_channel.toJson())
    cached_programming = dict(cached_programming.items() + {'temp':[program.toJson()]}.items())

  # if not youtube_channel_id:
  #   user_json = memcache.get(current_user.id) or {} if current_user else None
  #   if user_json and 'channels' in user_json:
  #     for cid in user_json['channels']:
  #       c = memcache.get(cid)
  #       if c and len(c.get('programs', [])):
  #         last_program_time = iso8601.parse_date(c.get('programs')[-1]['time']).replace(tzinfo=None)
  #         if last_program_time > datetime.datetime.now() - datetime.timedelta(seconds=1200):
  #           cached_channels.append(c['channel'])
  #           cached_programming = dict(cached_programming.items() + {cid:c['programs']}.items())
  #         else:
  #           user_json['channels'].remove(cid)
  #           memcache.delete(cid)

  data['channels'] = cached_channels
  data['programs'] = cached_programming

  data['current_channel'] = channel_id or \
        (current_channel.id if current_channel else current_user.current_channel_id \
        if current_user and current_user.current_channel_id else cached_channels[0]['id'])

  return data

class SessionHandler(BaseHandler):
  def post(self):
    if constants.LOGIN_REQUIRED and self.current_user.access_level < AccessLevel.USER:
      self.error(401)
    else:
      data = {}

      user_agent = self.request.headers.get('user_agent')
      if not self.current_user or self.current_user.id not in constants.SUPER_ADMINS:
        if 'Android' in user_agent:
          data['error'] = 'Android mobile access is not supported yet.'
        ie = re.search('/MSIE\s([\d]+)/', user_agent)
        ff = re.search('/firefox\/([\d]+)/', user_agent)
        if (ie and ie < 10) or (ff and ff < 6):
          data['error'] = 'Please use a modern browser like Chrome.'

      media_id = self.session.get('media_id', None)
      channel_id = self.session.get('channel_id', None)
      single_channel_id = self.session.get('single_channel_id', None)
      youtube_channel_id = self.request.get('ytc') or self.session.get('youtube_channel_id', None)

      if not data.get('error'):
        data = get_session(self.current_user, media_id=media_id, channel_id=channel_id,
                           single_channel_id=single_channel_id,
                           youtube_channel_id=youtube_channel_id)
      if self.session.get('message'):
        data['message'] = self.session['message']
      self.response.out.write(simplejson.dumps(data))

class LoginHandler(BaseHandler):
  def post(self):
    data = {}
    current_user = self.current_user
    if current_user:
      user_obj = current_user.toJson(configs=True)
      data['current_user'] = user_obj

      # Update login
      current_user.last_login = datetime.datetime.now()
      current_user.put()

      #clear outbox
      memcached_user_obj = memcache.get(current_user.id) or {}
      if memcached_user_obj.get('outbox'):
        del memcached_user_obj['outbox']
        memcache.set(current_user.id, memcached_user_obj)

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
        else (Channel.get_public()[0].id if len(Channel.get_public()) else None)
    current_channel = Channel.get_by_key_name(current_channel_id) if current_channel_id else None
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
    if not current_user.last_login:
      deferred.defer(util.update_waitlist, current_user.id, current_channel_id,
                     _name='updat-_waitlist-' + str(uuid.uuid1()))

    broadcast.broadcastViewerChange(current_user, None, current_channel_id,
                                    session_json['id'], session_json['tune_in'], media);

    self.response.out.write(simplejson.dumps(data))

class TokenHandler(BaseHandler):
  def get(self):
    data = {}
    token_id = str(uuid.uuid1())
    # CREATE BROWSER CHANNEL
    token = browserchannel.create_channel(token_id)
    def add_client(web_channels, client_id, token):
      web_channels[client_id] = token
      return web_channels
    memcache_cas('web_channels', add_client, token_id, token)
    data['token'] = token
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

class PlayHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    media_id = self.request.get('media_id')
    channel_id = self.request.get('channel_id')
    media = Media.get_by_key_name(media_id)
    if media:
      User.set_last_media(self.current_user, media)
      broadcast.broadcastViewerChange(self.current_user, None, channel_id,
                                      None, None, media);

class ProgramHandler(BaseHandler):
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
      self.response.out.write(simplejson.dumps(program.toJson(False)))

class InfoHandler(BaseHandler):
  def get(self, id):
    media = Media.get(id, fetch_publisher=True)
    if media:
      response = {}
      response['description'] = media.description
      response['tweets'] = media.get_tweets()
      response['comments'] = [c.toJson() for c in Comment.get_by_media(media)]
      pollMedia = media.polls.get()
      uid = self.current_user.id if self.current_user else None
      response['poll'] = pollMedia.poll.to_json(uid) if pollMedia else None
      if self.current_user:
        response['seen'] = media.seen_by(self.current_user)
      self.response.out.write(simplejson.dumps(response))

class FriendsHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    fetch_only = self.request.get('offline')
    reset = self.request.get('reset')

    if reset:
      user = self.current_user
      user.has_following = False
      user.following = []
      user.put()

    friends_json = []
    if self.current_user.has_following:
      for fid in self.current_user.following:
        # Only fetch if it's from the following list, otherwise this call would take too long
        user_json = User.get_user_entry(fid)
        if user_json:
          friends_json.append(user_json)
    else:
      friends_json = self.current_user.get_following()
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
        c_a = UserActivity.all().filter('comment =', c).get()
        n = Notification.all().filter('comment =', c).get()
        c.delete()
        if c_a:
          c_a.delete()
        if n:
          n.remove()
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
                      acl=acl, parent_id=parent_id, to_user=to_user)

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

      Stat.add_comment(media, self.current_user, facebook, tweet)
      if to_user and to_user.id != self.current_user.id:
        n = Notification.add(to_user, constants.NotificationType.REPLY, comment=c)
        broadcast.broadcastNotification(n)
      broadcast.broadcastNewComment(c, new_tweet, to_user, self.request.host_url);

      response = {
                  'comment': c.toJson(),
                  'tweet': new_tweet.to_json() if new_tweet else None
                  }
      self.response.out.write(simplejson.dumps(response))


class PollHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id):
    media = Media.get_by_id(id)
    if media:
      pollMedia = media.polls.get()
      if pollMedia:
        self.response.out.write(simplejson.dumps(pollMedia.poll.to_json((self.current_user.id if self.current_user else None))))
        return
    self.response.out.write(simplejson.dumps(None))

  def post(self):
    id = self.request.get('id')
    media_id = self.request.get('media_id')
    title = self.request.get('title')
    options = self.request.get('options')

    logging.info(self.current_user)
    if id and self.current_user:
      pollOption = PollOption.get_by_id(int(id))
      if not self.current_user.id in pollOption.voters:
        pollOption.add_vote(self.current_user.id)
      return

    media = Media.get_by_key_name(media_id)
    if media and title and options:
      poll = Poll(media=media, title=title)
      poll.put()
      json = poll.to_json(self.current_user.id)
      options = options.split('|')
      options_json = []
      for o in options:
        if o == '':
          continue
        option = PollOption(poll=poll, name=o)
        option.put()
        options_json.append(option.to_json(self.current_user.id))
      json['options'] = options_json
      pm = PollMedias(poll=poll, media=media)
      pm.put()
      self.response.out.write(simplejson.dumps(json))


class MessageHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self, id=None):
    offset = self.request.get('offset') or 0
    messages = []
    if not id or id == self.current_user.id:
      messages = Message.get(self.current_user, offset=int(offset))
    else:
      user2 = User.get_by_key_name(id)
      messages = Message.get(self.current_user, user2=user2, offset=int(offset))
    self.response.out.write(simplejson.dumps(messages))
  @BaseHandler.logged_in
  def post(self):
    from_id = self.request.get('from_id')
    to_id = self.request.get('to_id')
    text = self.request.get('text')
    media_id = self.request.get('media_id')
    id = self.request.get('id')
    has_read = self.request.get('read')
    if id and has_read:
      message = Message.get_by_id(int(id))
      message.set_read()
      return
    if from_id and to_id and text:
      from_user = User.get_by_key_name(from_id)
      to_user = User.get_by_key_name(to_id)
      if not to_user:
        to_user = User(key_name=to_id, id=to_id, temp=True, access_level=1)
        to_user.put()

        # Send them notification on FB
        fetch = urlfetch.fetch(url='https://graph.facebook.com/%s/notifications' % to_id,
                               payload='access_token=%s&template=%s&href=%s' %
                               (constants.facebook_app()['APP_ACCESS_TOKEN'],
                               '@[' + user.id + ']' + ('sent you a video!' if media_id else ' sent you a message!'),
                               '?fb=1'),
                               method=urlfetch.POST)
      media = None
      if media_id:
        media = Media.get_by_key_name(media_id)
      message = Message.add(from_user=from_user, to_user=to_user, text=text, media=media)
      broadcast.broadcastNewMessage(message)
      self.response.out.write(simplejson.dumps(message.toJson()))

class NotificationHandler(BaseHandler):
  @BaseHandler.logged_in
  def get(self):
    notifications = Notification.get(self.current_user)
    self.response.out.write(simplejson.dumps(notifications))
  @BaseHandler.logged_in
  def post(self):
    id = self.request.get('id')
    has_read = self.request.get('read')
    if id and has_read:
      notification = Notification.get_by_id(int(id))
      if notification:
        notification.set_read()

class LinkHandler(BaseHandler):
  @BaseHandler.logged_in
  def post(self):
    url = self.request.get('url')
    name = self.request.get('name')
    link = Link.get_or_add(url, custom=name)
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
    media_id = self.request.get('media_id')
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

    media = Media.get_by_key_name(media_id) if media_id else None
    broadcast.broadcastViewerChange(self.current_user, last_channel_id, channel_id,
                                    session.key().id(), session.tune_in.isoformat(),
                                    media=media);

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


  def post(self):
    reddit_id = self.request.get('reddit_id')
    modhash = self.request.get('modhash')

    if reddit_id and modhash:
      dir = '0' if self.request.get('delete') else '1'
      fetch = urlfetch.fetch('http://www.reddit.com/api/vote',
                     payload=urllib.urlencode({
                               'dir': dir,
                               'id': reddit_id,
                               'modhash': modhash
                              }),
                     method=urlfetch.POST)
      logging.info(fetch.content)
    if self.current_user:
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
  def post(self):
    reddit_id = self.request.get('reddit_id')
    modhash = self.request.get('modhash')

    if reddit_id and modhash:
      dir = '0' if self.request.get('delete') else '-1'
      urlfetch.fetch('http://www.reddit.com/api/vote',
                     payload=urllib.urlencode({
                               'dir': dir,
                               'id': reddit_id,
                               'modhash': modhash
                              }),
                     method=urlfetch.POST)

    if self.current_user:
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
  def get(self):
    response = {}
    page_token = self.request.get('pagetoken')
    yt_channel_id = self.request.get('channel_id')
    data_json = Channel.youtube_channel(yt_channel_id=yt_channel_id, page_token=page_token)
    self.response.out.write(simplejson.dumps(data_json))
  def post(self):
    response = {}
    token = self.request.get('token')
    name = self.request.get('name')
    page_token - self.request.get('pagetoken')
    yt_channel_id = self.request.get('channel_id')
    yt_playlist_id = self.request.get('playlist_id')
    data_json = Channel.youtube_channel(name, user=self.current_user, token=token, yt_channel_id=yt_channel_id,
                                        yt_playlist_id=yt_playlist_id, page_token=page_token)
    self.response.out.write(simplejson.dumps(data_json))
