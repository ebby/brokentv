from common import *

from media import Media
from user import User

class Message(db.Model):
  from_user = db.ReferenceProperty(User, collection_name='from_user')
  to_user = db.ReferenceProperty(User, collection_name='to_user')
  text = db.StringProperty()
  acl = db.StringListProperty()
  time = db.DateTimeProperty(auto_now_add=True)

  @classmethod
  def add(cls, from_user, to_user, text):
    m = Message(from_user=from_user, to_user=to_user, text=text, acl=[from_user.id, to_user.id])
    m.put()
    return m

  @classmethod
  def get(cls, user1_id, user2_id=None, limit=10, offset=10):
    if user2_id:
      m = Message.all().filter('acl =', user1_id).filter('acl =', user2_id).order('time').fetch(limit=limit, offset=offset)
    else:
      m = Message.all().filter('to_user =', user1_id).order('time').fetch(limit=limit, offset=offset)
    return m

  def toJson(self):
    json = {}
    json['id'] = str(self.key().id())
    json['from_user'] = self.from_user.toJson()
    json['to_user'] = self.to_user.toJson()
    json['text'] = self.text
    json['time'] = self.time.isoformat()
    return json
