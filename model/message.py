from common import *

from media import Media
from user import User

class Message(db.Model):
  from_user = db.ReferenceProperty(User, collection_name='from_user')
  to_user = db.ReferenceProperty(User, collection_name='to_user')
  text = db.StringProperty()
  acl = db.StringListProperty()
  read = db.BooleanProperty(default=False)
  time = db.DateTimeProperty(auto_now_add=True)
  
  @property
  def id(self):
    return str(self.key().id())

  @classmethod
  def add(cls, from_user, to_user, text):
    m = Message(from_user=from_user, to_user=to_user, text=text, acl=[from_user.id, to_user.id])
    m.put()
    
    # Update memcache
    user_obj = memcache.get(to_user.id) or {}
    ms = user_obj.get('messages')
    if ms:
      # Remove last message from this sender
      ms = [m.toJson()] + [msg for msg in ms if msg['from_user']['id'] != from_user.id]
      user_obj['messages'] = ms
      memcache.set(to_user.id, user_obj)

    return m

  @classmethod
  def get(cls, user1, user2=None, limit=10, offset=10):
    if user2:
      ms = Message.all().filter('acl =', user1.id).filter('acl =', user2.id).order('-time').fetch(limit=limit, offset=offset)
      ms = [m.toJson() for m in ms]
    else:
      user_obj = memcache.get(user1.id) or {}
      ms = user_obj.get('messages')
      if not ms:
        unique_senders = []
        senders = {}
        #ms = [1]
        while len(unique_senders) < 10:
          ms = Message.all().filter('to_user =', user1).order('-time').fetch(limit=limit, offset=offset)
          if not len(ms):
            break
          for m in ms:
            if not senders.get(m.from_user.id):
              unique_senders.append(m)
              senders[m.from_user.id] = True
          offset += limit
        ms = [m.toJson() for m in unique_senders]
        user_obj['messages'] = ms
        memcache.set(user1.id, user_obj)
    return ms

  def set_read(self):
    self.read = True
    self.put()
    
    user_obj = memcache.get(self.to_user.id) or {}
    ms = user_obj.get('messages')
    updated = False
    for m in ms:
      if m['id'] == self.id:
        m['read'] = True
        updated = True
    if updated:
      user_obj['messages'] = ms
      memcache.set(self.to_user.id, user_obj)

  def toJson(self):
    json = {}
    json['id'] = self.id
    json['from_user'] = self.from_user.toJson()
    json['to_user'] = self.to_user.toJson()
    json['text'] = self.text
    json['read'] = self.read
    json['time'] = self.time.isoformat()
    return json
