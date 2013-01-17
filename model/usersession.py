from common import *

from user import User
from channel import Channel
from media import Media

class UserSession(db.Model):
  user = db.ReferenceProperty(User)
  tune_in = db.DateTimeProperty()
  tune_out = db.DateTimeProperty()
  channel = db.ReferenceProperty(Channel)
  
  @property
  def id(self):
    return str(self.key().id())

  @classmethod
  def new(cls, user, channel):
    session = UserSession(user=user, channel=channel, tune_in=datetime.datetime.now())
    session.put()
    return session

  @classmethod
  def get_by_user(cls, user):
    return UserSession.all().filter('user =', user).order('-tune_in').fetch(5)
  
  def add_media(self, media):
    key_name = str(self.key().id()) + media.key().name()
    s_m = SessionMedia.get_or_insert(key_name, session=self, media=media)
    return s_m
  
  def end_session(self):
    tune_out = datetime.datetime.now()
    self.put()
    
    # Track user activity
    if self.sessionMedias.get():
      from useractivity import UserActivity
      broadcast.broadcastNewActivity(UserActivity.add_session(self.user, self))

  def toJson(self, get_media=False):
    json = {}
    json['id'] = self.key().id()
    json['user'] = self.user.toJson()
    json['tune_in'] = self.tune_in.isoformat()
    json['tune_out'] = self.tune_out.isoformat() if self.tune_out else None
    json['channel_id'] = self.channel.id
    json['media'] = [s_m.media.toJson() for s_m in self.sessionMedias.fetch(10)] if get_media else []
    return json
  
class SessionMedia(db.Model):
  session = db.ReferenceProperty(UserSession, collection_name='sessionMedias')
  media = db.ReferenceProperty(Media, collection_name='sessionMedias')
  time = db.DateTimeProperty(auto_now_add=True)
