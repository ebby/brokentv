from common import *

from media import Media
from user import User

class Comment(db.Model):
  media = db.ReferenceProperty(Media, collection_name='comments')
  user = db.ReferenceProperty(User)
  is_parent = db.BooleanProperty(default=True)
  parent_comment = db.SelfReferenceProperty(collection_name='replies')
  text = db.StringProperty()
  time = db.DateTimeProperty(auto_now_add=True)
  acl = db.StringListProperty(default=[])
  mentions = db.StringListProperty(default=[])

  @classmethod
  def get_by_media(cls, media, uid=None, limit=20, offset=0):
    query = Comment.all().filter('media =', media)
    if uid:
      query = query.filter('acl =', uid)
    return query.order('time').fetch(limit, offset)

  @classmethod
  def add(cls, media, user, text, acl, parent_id=None, to_user=None):
    from notification import Notification
    
    c = Comment(media=media, user=user, text=text)
    c.mentions = [x[0] for x in re.findall(r"@\[(\d+):([a-zA-z\s]+)\]", text)]
    
    if parent_id:
      c.parent_comment = Comment.get_by_id(int(parent_id))
      c.is_parent = False
    else:
      # ACL only needed on parent. Replies don't need ACLs.
      c.acl = acl
    c.put()

    media.comment_count += 1
    media.put()
    
    for m in c.mentions:
      if not to_user or (to_user and m != to_user.id): 
        mentioned_user = User.get_by_key_name(m)
        if not mentioned_user or True:
          # Send them notification on FB
          fetch = urlfetch.fetch(url='https://graph.facebook.com/%s/notifications' % m,
                                 payload='access_token=%s&template=%s&href=%s' %
                                 (constants.facebook_app()['APP_ACCESS_TOKEN'],
                                 '@[' + user.id + ']' + ' mentioned you in a comment on ' + media.name + '!',
                                 media.get_path()),
                                 method=urlfetch.POST)
        else:
          n = Notification.add(mentioned_user, constants.NotificationType.MENTION, c)
          broadcast.broadcastNotification(n)

    if c.is_parent:
      from useractivity import UserActivity
      broadcast.broadcastNewActivity(UserActivity.add_comment(c.user, c))
    return c
  
  @classmethod
  def flattenMentions(cls, text):
    return re.sub(r"@\[(\d+):([a-zA-z\s]+)\]", r"\2", text)

  def toJson(self):
    json = {}
    json['id'] = str(self.key().id())
    json['media'] = self.media.toJson()
    json['parent_id'] = str(self.parent_comment.key().id()) if self.parent_comment else None
    json['user'] = self.user.toJson()
    json['text'] = self.text
    json['time'] = self.time.isoformat()
    json['replies'] = [r.toJson() for r in self.replies.fetch(None)]
    return json
  
