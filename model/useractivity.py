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
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.SESSION, user=user, session=session, acl=acl)
    u_a.put()
    return u_a
  
  @classmethod
  def add_comment(cls, user, comment):
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.COMMENT, user=user, comment=comment, acl=acl)
    u_a.put()
    return u_a
  
  @classmethod
  def add_starred(cls, user, media):
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.STARRED, user=user, media=media, acl=acl)
    u_a.put()
    return u_a

  @classmethod
  def get_stream(cls, user, offset=0):
    u_a = UserActivity.all()
    u_a = u_a.filter('acl =', user.id)
    u_a = u_a.order('-time').fetch(30, offset)
    return u_a

  @classmethod
  def get_for_user(cls, user, offset=0):
    u_a = UserActivity.all().filter('user =', user).order('-time').fetch(10, offset)
    return u_a

  def toJson(self):
    json = {}
    json['type'] = self.type
    json['user'] = self.user.toJson()
    json['media'] = self.media.toJson() if self.media else None
    json['time'] = self.time.isoformat()
    try:
      json['comment'] = self.comment.toJson() if self.comment else None
      json['session'] = self.session.toJson(get_media=True) if self.session else None
    except:
      json['comment'] = None
      json['session'] = None
      json['type'] = None
      # If there's a reference error, kill this entry
      self.delete()
    return json
  