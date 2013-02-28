from common import *


class User(db.Model):
    id = db.StringProperty()
    access_level = db.IntegerProperty(default=AccessLevel.WAITLIST)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    last_login = db.DateTimeProperty()
    session_count = db.IntegerProperty(default=0)
    ave_session = db.FloatProperty(default=0.0)
    name = db.StringProperty(required=True)
    profile_url = db.StringProperty()
    email = db.StringProperty()
    access_token = db.StringProperty()
    location = db.StringProperty()
    friends = db.StringListProperty(default=[])
    twitter_token = db.StringProperty()
    twitter_secret = db.StringProperty()
    twitter_id = db.IntegerProperty()
    twitter_handle = db.StringProperty()
    
    show_guide = db.BooleanProperty(default=True)
    show_sidebar = db.BooleanProperty(default=True)
    post_facebook = db.BooleanProperty(default=False)
    post_twitter = db.BooleanProperty(default=False)
    
    def set_twitter_info(self, info):
      self.twitter_token = info['token']
      self.twitter_secret = info['secret']
      self.twitter_id = info['id']
      self.twitter_handle = info['username']
      self.put()

    def to_session(self):
        return dict(name=self.name, profile_url=self.profile_url, id=self.id, access_token=self.access_token)
      
    @classmethod
    def get_by_twitter_id(cls, id):
      return User.all().filter('twitter_id =', id).get()

    def toJson(self, admin=False, configs=False):
      json = {}
      json['id'] = self.id
      json['name'] = self.name
      json['profile_url'] = self.profile_url
      json['location'] = self.location
      json['access_level'] = self.access_level
      if admin:
        json['last_login'] = self.last_login.isoformat() if self.last_login else None
        json['session_count'] = self.session_count if self.session_count else 0
        json['ave_session'] = self.ave_session if self.ave_session else 0
      if configs:
        # To Configure UI
        json['show_sidebar'] = self.show_sidebar
        json['show_guide'] = self.show_guide
        json['post_twitter'] = self.post_facebook
        json['post_facebook'] = self.post_twitter
      return json
