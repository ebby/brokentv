from common import *

from media import Media
from user import User
from comment import Comment

class Notification(db.Model):
  user = db.ReferenceProperty(User, collection_name='user')
  type = db.StringProperty()
  comment = db.ReferenceProperty(Comment)
  read = db.BooleanProperty(default=False)
  time = db.DateTimeProperty(auto_now_add=True)
  
  @property
  def id(self):
    return str(self.key().id())
  
  @classmethod
  def add(cls, user, type, comment):
    n = Notification(user=user, type=type, comment=comment)
    n.put()
    
    # Update memcache
    user_obj = memcache.get(user.id) or {}
    ns = user_obj.get('notifications', [])
    ns.insert(0, n.to_json())
    user_obj['notifications'] = ns
    memcache.set(user.id, user_obj)

    return n
  
  @classmethod
  def get(cls, user, limit=10, offset=10):
    user_obj = memcache.get(user.id) or {}
    ns = user_obj.get('notifications')
    if not ns:
      ns = Notification.all().filter('user =', user).order('-time').fetch(limit=limit, offset=offset)
      ns = [n.to_json() for n in ns]
      user_obj['notifications'] = ns
      memcache.set(user.id, user_obj)
    return ns

  def set_read(self):
    self.read = True
    self.put()
    
    user_obj = memcache.get(self.user.id) or {}
    ns = user_obj.get('notifications', [])
    updated = False
    for n in ns:
      if n and n['id'] == self.id:
        n['read'] = True
        updated = True
    if updated:
      user_obj['notifications'] = ns
      memcache.set(self.user.id, user_obj)
      
  def remove(self):
    user_obj = memcache.get(self.user.id) or {}
    ns = user_obj.get('notifications')
    user_obj['notifications'] = [n for n in ns if n.id != self.id]
    memcache.set(self.user.id, user_obj)
    self.delete()
  
  def to_json(self):
    json = {}
    json['id'] = self.id
    json['type'] = self.type
    json['user'] = self.user.toJson()
    json['time'] = self.time.isoformat()
    json['read'] = self.read
    try:
      json['comment'] = self.comment.toJson() if self.comment else None
    except:
      # Comment has been deleted
      self.delete()
      json['comment'] = None
    return json
  
  