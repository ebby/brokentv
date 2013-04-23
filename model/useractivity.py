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
  
  @property
  def id(self):
    return str(self.key().id())
  
  @classmethod
  def add_session(cls, user, session):
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.SESSION, user=user, session=session, acl=acl)
    u_a.put()
    
    cached_activity = memcache.get(user.id + '-activity') or {}
    cached_activity['activities'] = [u_a.toJson()] + cached_activity.get('activities', [])
    cached_activity['time'] = datetime.datetime.now().isoformat()
    memcache.set(user.id + '-activity', cached_activity)
    
    return u_a
  
  @classmethod
  def add_comment(cls, user, comment):
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.COMMENT, user=user, comment=comment, acl=acl)
    u_a.put()
    
    cached_activity = memcache.get(user.id + '-activity') or {}
    cached_activity['activities'] = [u_a.toJson()] + cached_activity.get('activities', [])
    cached_activity['time'] = datetime.datetime.now().isoformat()
    memcache.set(user.id + '-activity', cached_activity)
    
    return u_a
  
  @classmethod
  def add_like(cls, user, media):
    acl = user.friends
    if user.demo:
      acl += SUPER_ADMINS
    u_a = UserActivity(type=ActivityType.LIKED, user=user, media=media, acl=acl)
    u_a.put()
    
    cached_activity = memcache.get(user.id + '-activity') or {}
    cached_activity['activities'] = [u_a.toJson()] + cached_activity.get('activities', [])
    cached_activity['time'] = datetime.datetime.now().isoformat()
    memcache.set(user.id + '-activity', cached_activity)

    return u_a

  @classmethod
  def get_stream(cls, user, limit=20, offset=0):
    cached_stream = memcache.get(user.id + '-stream') or {}
    new_stream = []
    new_count = 0

    u_a = UserActivity.all()
    u_a = u_a.filter('acl =', user.id)
    if 'time' in cached_stream and offset == 0:
      time = iso8601.parse_date(cached_stream['time']).replace(tzinfo=None)
      u_a = u_a.filter('time >', time)
    u_a = u_a.order('-time').fetch(limit, offset)
    
    if len(u_a):
      new_time = u_a[0].time
      inserted = False
      # Insert by timestamp
      c_a = cached_stream.get('activities', [])
      for i in range(len(c_a)):
        time = iso8601.parse_date(c_a[i]['time']).replace(tzinfo=None)
        if new_time > time:
          for a in u_a:
            if a.id == c_a[i]['id']:
              break
            new_count += 1
            new_stream.append(a.toJson())
          inserted = True
        if inserted:
          new_stream += c_a[i:]
          break
        new_stream.append(c_a[i])

      if not len(cached_stream.get('activities', [])) or not inserted:
        new_stream = cached_stream.get('activities', []) + [a.toJson() for a in u_a]

    cached_stream['activities'] = new_stream if len(new_stream) else cached_stream.get('activities', [])
    cached_stream['time'] = datetime.datetime.now().isoformat()
    cached_stream['new_count'] = new_count
    memcache.set(user.id + '-stream', cached_stream)

    cached_stream['activities'] = cached_stream['activities'][offset:offset+limit]
    return cached_stream

  @classmethod
  def get_for_user(cls, user, limit=20, offset=0):
    cached_activity = memcache.get(user.id + '-activity') or {}
    new_stream = []

    if not 'dirty' in cached_activity or cached_activity['dirty']:
      u_a = UserActivity.all()
      u_a = u_a.filter('user =', user)
      if 'time' in cached_activity and offset == 0:
        time = iso8601.parse_date(cached_activity['time']).replace(tzinfo=None)
        u_a = u_a.filter('time >', time)
      u_a = u_a.order('-time').fetch(limit, offset)
      
      if len(u_a):
        new_time = u_a[0].time
        inserted = False
        # Insert by timestamp
        c_a = cached_activity.get('activities', [])
        for i in range(len(c_a)):
          time = iso8601.parse_date(c_a[i]['time']).replace(tzinfo=None)
          if new_time > time:
            for a in u_a:
              if a.id == c_a[i]['id']:
                break
              new_stream.append(a.toJson())
            inserted = True
          if inserted:
            new_stream += c_a[i:]
            break
          new_stream.append(c_a[i])
  
        if not len(cached_activity.get('activities', [])) or not inserted:
          new_stream = cached_activity.get('activities', []) + [a.toJson() for a in u_a]
  
      cached_activity['activities'] = new_stream if len(new_stream) else cached_activity.get('activities', [])
      cached_activity['time'] = datetime.datetime.now().isoformat()
      cached_activity['dirty'] = False
      memcache.set(user.id + '-activity', cached_activity)
      
      
    cached_activity['activities'] = cached_activity['activities'][offset:offset+limit]
    return cached_activity

  def toJson(self):
    json = {}
    json['id'] = self.id
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
  