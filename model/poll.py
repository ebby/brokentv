from common import *

from media import Media
from user import User

class Poll(db.Model):
  owner = db.ReferenceProperty(User)
  title = db.StringProperty()
  votes = db.StringListProperty()
  vote_count = db.IntegerProperty(default=0)
  time = db.DateTimeProperty(auto_now_add=True)

  @classmethod
  def get_by_media(cls, media):
    return Poll.all().filter('media =', media).get()

  def to_json(self, uid):
    json = {}
    json['id'] = self.key().id()
    json['title'] = self.title
    json['vote_count'] = self.vote_count
    json['options'] = [o.to_json(uid) for o in PollOption.all().filter('poll =', self).fetch(None)]
    return json

class PollOption(db.Model):
  poll = db.ReferenceProperty(Poll, collection_name='pollOptions')
  name = db.StringProperty()
  vote_count = db.IntegerProperty(default=0)
  voters = db.StringListProperty(default=[])
  percent = db.IntegerProperty(default=0)

  def add_vote(self, user_id):
    self.poll.vote_count += 1
    self.poll.put()
    self.vote_count += 1
    self.voters.append(user_id)
    self.percent = int(self.vote_count/self.poll.vote_count)
    self.put()

  def to_json(self, uid=None):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    json['vote_count'] = self.vote_count
    json['percent'] = self.percent
    logging.info(uid)
    logging.info(uid in self.voters)
    json['voted'] = uid in self.voters if uid else False
    return json

class PollMedias(db.Model):
  poll = db.ReferenceProperty(Poll, collection_name='medias')
  media = db.ReferenceProperty(Media, collection_name='polls')
