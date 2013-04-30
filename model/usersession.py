from common import *

from user import User
from channel import Channel
from media import Media
from stat import Stat

class UserSession(db.Model):
  user = db.ReferenceProperty(User)
  tune_in = db.DateTimeProperty()
  tune_out = db.DateTimeProperty()
  channel = db.ReferenceProperty(Channel)
  with_friends = db.BooleanProperty(default=False)
  
  @property
  def id(self):
    return str(self.key().id())

  @classmethod
  def new(cls, user, channel, with_friends=False):
    session = UserSession(user=user, channel=channel, tune_in=datetime.datetime.now(),
                          with_friends=with_friends)
    session.put()
    
    cached_user = memcache.get(user.id) or {}
    cached_user['last_session'] = session.toJson()
    memcache.set(user.id, cached_user)

    return session

  @classmethod
  def reset_last_session(cls, user):
    cached_user = memcache.get(user.id) or {}
    last_session_json = cached_user.get('last_session')
    if last_session_json:
      last_session_json['tune_out'] = None
      cached_user['last_session'] = last_session_json
      memcache.set(user.id, cached_user)
    return last_session_json

  @classmethod
  def get_last_session(cls, uid):
    cached_user = memcache.get(uid) or {}
    last_session_json = cached_user.get('last_session')
    if not last_session_json:
      user = User.get_by_key_name(uid)
      last_session = UserSession.all().filter('user =', user).order('-tune_in').get()
      if last_session:
        last_session_json = last_session.toJson()
        cached_user['last_session'] = last_session_json
        memcache.set(user.id, cached_user)
    return last_session_json

  @classmethod
  def get_by_user(cls, user):
    return UserSession.all().filter('user =', user).order('-tune_in').fetch(5)
  
  def add_media(self, media):
    key_name = str(self.key().id()) + media.key().name()
    s_m = SessionMedia.get_or_insert(key_name, session=self, media=media)
    return s_m
  
  def end_session(self):
    self.tune_out = datetime.datetime.now()
    self.put()
    
    Stat.add_session(self)
    
    # Track user activity
    if self.sessionMedias.get() and self.channel.privacy != Privacy.PRIVATE:
      from useractivity import UserActivity
      broadcast.broadcastNewActivity(UserActivity.add_session(self.user, self))

  def toJson(self, get_media=False):
    json = {}
    json['id'] = self.id
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
