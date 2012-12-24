from common import *

from user import User
from channel import Channel

class UserSession(db.Model):
  user = db.ReferenceProperty(User)
  tune_in = db.DateTimeProperty()
  tune_out = db.DateTimeProperty()
  channel = db.ReferenceProperty(Channel)

  @classmethod
  def new(cls, user, channel):
    session = UserSession(user=user, channel=channel, tune_in=datetime.datetime.now())
    session.put()
    return session

  @classmethod
  def get_by_user(cls, user):
    return UserSession.all().filter('user =', user).order('-tune_in').fetch(5)

  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['user'] = self.user.toJson()
    json['tune_in'] = self.tune_in.isoformat()
    json['tune_out'] = self.tune_out.isoformat() if self.tune_out else None
    json['channel_id'] = self.channel.key().id()
    return json