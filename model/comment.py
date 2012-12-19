from common import *

from media import Media
from user import User

class Comment(db.Model):
  media = db.ReferenceProperty(Media)
  user = db.ReferenceProperty(User)
  parent_comment = db.SelfReferenceProperty()
  text = db.StringProperty()
  time = db.DateTimeProperty(auto_now_add=True)

  @classmethod
  def get_by_media(cls, media):
    return Comment.all().filter('media =', media).order('time').fetch(100)
  
  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['media'] = self.media.toJson()
    json['parent_comment_id'] = self.parent_comment.key().id() if self.parent_comment else None
    json['user'] = self.user.toJson()
    json['text'] = self.text
    json['time'] = self.time.isoformat()
    return json