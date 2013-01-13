from common import *

from user import User
from channel import Channel
from media import Media
from comment import Comment
from usersession import UserSession

class UserActivity(db.Model):
  type = db.StringProperty()
  user = db.ReferenceProperty(User)
  comment = db.ReferenceProperty(Comment)
  session = db.ReferenceProperty(UserSession)
  media = db.ReferenceProperty(Media)
  time = db.DateTimeProperty(auto_now_add=True)
  acl = db.StringListProperty(default=[])
  
  @classmethod
  def add_session(cls, user, session):
    u_a = UserActivity(type=ActivityType.SESSION, user=user, session=session, acl=user.friends)
    u_a.put()
    return u_a
  
  @classmethod
  def add_comment(cls, user, comment):
    u_a = UserActivity(type=ActivityType.COMMENT, user=user, comment=comment, acl=user.friends)
    u_a.put()
    return u_a
  
  @classmethod
  def add_starred(cls, user, media):
    u_a = UserActivity(type=ActivityType.STARRED, user=user, media=media, acl=user.friends)
    u_a.put()
    return u_a

  @classmethod
  def get_stream(cls, user, offset=0):
    u_a = UserActivity.all().filter('acl =', user.id).order('-time').fetch(10, offset)
    return u_a

  @classmethod
  def get_for_user(cls, user, offset=0):
    u_a = UserActivity.all().filter('user =', user).order('-time').fetch(10, offset)
    return u_a

  def toJson(self):
    json = {}
    json['type'] = self.type
    json['user'] = self.user.toJson()
    json['comment'] = self.comment.toJson() if self.comment else None
    json['session'] = self.session.toJson(get_media=True) if self.session else None
    json['media'] = self.media.toJson() if self.media else None
    json['time'] = self.time.isoformat()
    return json
  