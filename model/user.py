from common import *

class User(db.Model):
    id = db.StringProperty()
    access_level = db.IntegerProperty(default=AccessLevel.WAITLIST)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    last_login = db.DateTimeProperty()
    name = db.StringProperty(required=True)
    gender = db.StringProperty()
    profile_url = db.StringProperty()
    email = db.StringProperty()
    access_token = db.StringProperty()
    location = db.StringProperty()
    friends = db.StringListProperty(default=[])
    twitter_token = db.StringProperty()
    twitter_secret = db.StringProperty()
    twitter_id = db.IntegerProperty()
    twitter_handle = db.StringProperty()
    
    # Configs
    show_guide = db.BooleanProperty(default=True)
    show_sidebar = db.BooleanProperty(default=True)
    post_facebook = db.BooleanProperty(default=False)
    post_twitter = db.BooleanProperty(default=False)
    demo = db.BooleanProperty(default=False)
    welcomed = db.BooleanProperty(default=False)
    email_reply = db.BooleanProperty(default=True)
    
    # Stats
    session_count = db.IntegerProperty(default=0)
    ave_session_time = db.FloatProperty(default=0.0)
    total_session_time = db.FloatProperty(default=0.0)
    ave_session_time_alone = db.FloatProperty(default=0.0)
    ave_session_time_friends = db.FloatProperty(default=0.0)
    ave_session_medias = db.FloatProperty(default=0.0)
    comment_count = db.IntegerProperty(default=0)
    share_count = db.IntegerProperty(default=0)

    def set_twitter_info(self, info):
      self.twitter_token = info['token']
      self.twitter_secret = info['secret']
      self.twitter_id = info['id']
      self.twitter_handle = info['username']
      self.put()

    def to_session(self):
        return dict(name=self.name, profile_url=self.profile_url, id=self.id, access_token=self.access_token)

    @property
    def first_name(self):
      split = self.name.split(' ')
      return split[0] if len(split) else self.name

    @classmethod
    def get_by_twitter_id(cls, id):
      return User.all().filter('twitter_id =', id).get()

    def has_friend(self):
      for friend in self.friends:
        if User.get_by_key_name(friend):
          return True
      return False

    def has_female_friend(self):
      for friend in self.friends:
        user = User.get_by_key_name(friend)
        if user and user.gender == 'female':
          return True
      return False
    
    def send_invite(self):
      if self.access_level == 0:
        welcome_email = emailer.Email(emailer.Message.WELCOME,
                                      {'name' : self.first_name})
        welcome_email.send(self)
      self.access_level = AccessLevel.USER
      self.put()
      
    def send_friendly_invite(self, friend, channel_id=None):
      welcome_email = emailer.Email(emailer.Message.WELCOME_FRIEND(friend.first_name),
                                    {'name' : self.first_name,
                                     'friend_name': self.name,
                                     'friend_first_name': self.first_name,
                                     'image': 'https://graph.facebook.com/%s/picture' % friend.id,
                                     'link': 'http://www.xylocast.com' +
                                         ('/?c=' + channel_id if channel_id else '')})
      welcome_email.send(self)

    def send_waitlist_email(self, user_number):
      waitlist_email = emailer.Email(emailer.Message.WAITLIST,
                                     {'name' : self.first_name,
                                      'waitlist' : user_number})
      waitlist_email.send(self)

    def send_invite(self):
      welcome_email = emailer.Email(emailer.Message.WELCOME, {'name' : self.first_name})
      welcome_email.send(self)
      
    @staticmethod
    def update_waitlist(user_id, channel_id):
      if constants.INVITE_POLICY() != constants.InvitePolicy.NOBODY:
        user = User.get_by_key_name(user_id)
        for fid in user.friends:
          friend = User.get_by_key_name(fid)
          if friend and friend.access_level == constants.AccessLevel.WAITLIST:
            friend.grant_access(user, channel_id)

    def grant_access(self, friend=None, channel_id=None):
      if self.access_level == 0:
        if friend:
          self.send_friendly_invite(friend, channel_id)
        else:
          self.send_invite()
      self.access_level = AccessLevel.USER
      self.put()

    def toJson(self, admin=False, configs=False):
      json = {}
      json['id'] = self.id
      json['name'] = self.name
      json['profile_url'] = self.profile_url
      json['location'] = self.location
      json['access_level'] = self.access_level
      json['welcomed'] = self.welcomed
      if admin:
        json['demo'] = self.demo
        json['last_login'] = self.last_login.isoformat() if self.last_login else None
        json['session_count'] = self.session_count if self.session_count else 0
        json['ave_session_time'] = self.ave_session_time if self.ave_session_time else 0
      if configs:
        # To Configure UI
        json['show_sidebar'] = self.show_sidebar
        json['show_guide'] = self.show_guide
        json['post_twitter'] = self.post_twitter
        json['post_facebook'] = self.post_facebook
      return json
