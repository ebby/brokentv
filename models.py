import constants
import datetime
import logging
import simplejson
import urllib
import types

from google.appengine.api import urlfetch
from google.appengine.ext import db

class Privacy:
  PRIVATE = 0
  PUBLIC = 1
  FRIENDS = 2

class MediaType:
  VIDEO = 0
  PICTURE = 1

class MediaHost:
  YOUTUBE = 'youtube'

class User(db.Model):
    id = db.StringProperty()
    show_signup = db.BooleanProperty(default=True)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    name = db.StringProperty(required=True)
    profile_url = db.StringProperty()
    photo_url = db.StringProperty()
    access_token = db.StringProperty()
    followers = db.StringListProperty(default=[])
    following = db.StringListProperty(default=[])
    friends = db.StringListProperty(default=[])
    home = db.StringProperty()
    location = db.StringProperty()

    def to_session(self):
        return dict(name=self.name, profile_url=self.profile_url, id=self.id, access_token=self.access_token)

    def follow(self, user):
      self.following.append(user.id)
      user.followers.append(self.id)

      if user.id in self.followers:
        self.friends.append(user.id)
        user.friends.append(self.id)
      self.put()
      user.put()

    def unfollow(self, user):
      if user.id in self.following:
        self.following.remove(user.id)

      if self.id in user.followers:
        user.followers.remove(self.id)

      if user.id in self.friends:
        self.friends.remove(user.id)
        user.friends.remove(self.id)
      self.put()
      user.put()

    def isFollowing(self, user):
      return user.id in self.following

    def getRelationship(self, user):
    	if user.id == self.id:
    		return 'self'
    	if user.id in self.friends:
    		return 'friends'
    	if user.id in self.following:
    		return 'following'
    	if user.id in self.followers:
    		return 'follower'
    	return None

    def getFollowersJsonArray(self):
      json = []
      for follower in self.followers:
        json.append(follower.toJson())
      return json

    def getFollowingJsonArray(self):
      json = []
      for following in self.following:
        json.append(following.toJson())
      return json

    def getFriendsJsonArray(self):
      json = []
      for friend in self.friends:
        json.append(friend.toJson())
      return json

    def getFollowingPreviewJsonArray(self):
      json = []
      if len(self.friends) > 26:
        for i in range(26):
          friend = User.get_by_key_name(self.friends[i])
          if friend:
            json.append(friend.toJson())
      else:
        for friend in self.friends:
          json.append(User.get_by_key_name(friend).toJson())

        i = 0
        while len(json) < min(26, len(self.following)):
          userId = self.following[i]
          if not userId in self.friends:
            json.append(User.get_by_key_name(userId).toJson())
          i += 1

      return json

    def getFollowersPreviewJsonArray(self):
      json = []
      for i in range(min(26, len(self.followers))):
        json.append(User.get_by_key_name(self.followers[i]).toJson())
      return json

    def toJson(self):
      json = {}
      json['id'] = self.id
      json['name'] = self.name
      json['profile_url'] = self.profile_url
      json['photo_url'] = self.photo_url
      json['location'] = self.location
      return json

class Channel(db.Model):
  name = db.StringProperty()
  programming = db.StringListProperty()
  current_program = db.IntegerProperty()
  keywords = db.StringListProperty()

  @classmethod
  def get_all(cls):
    return Channel.all().fetch(100)

  def get_programming(self):
    return Program.all().filter('channel =', self).fetch(limit=100)

  def get_next_time(self):
    next_time = datetime.datetime.utcnow()
    if len(self.programming):
      last_program = Program.get_by_id(int(self.programming[-1]))
      next_time = last_program.time + datetime.timedelta(seconds=last_program.media.duration)
    return max(datetime.datetime.utcnow(), next_time)

  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    json['programming'] = [p.toJson(False) for p in self.get_programming()]
    json['current_program'] = Program.get_by_id(self.current_program).toJson(False) if self.current_program else None
    return json


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

class Media(db.Model):
  YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json'

  type = db.IntegerProperty(default=0)
  name = db.StringProperty()
  id = db.StringProperty()
  host = db.StringProperty(default='youtube')
  duration = db.FloatProperty()
  description = db.TextProperty()

  @classmethod
  def get(cls, id):
    media = Media.get_by_key_name(id)
    if not media:
      tries = 0
      while (tries < 4):
        response = urlfetch.fetch(Media.YOUTUBE_DATA % id)
        tries += 1
        if response.status_code == 200:
          media = Media.add_from_json(simplejson.loads(response.content))
          break
    return media

  @classmethod
  def add_from_json(cls, json):
    entries = json.get('entry')
    entries = entries if isinstance(entries, types.ListType) else [entries]
    medias = []
    for entry in entries:
      media = cls(type=MediaType.VIDEO,
                  id=entry['media$group']['yt$videoid']['$t'],
                  name=entry['title']['$t'],
                  duration=float(entry['media$group']['yt$duration']['seconds']),
                  description=entry['media$group']['media$description']['$t'])
      media.put()
      medias.append(media)
    return medias if len(medias) > 1 else medias[0]

  def toJson(self):
    json = {}
    json['name'] = self.name
    json['id'] = self.id
    json['host'] = self.host
    json['duration'] = self.duration
    return json

class Program(db.Model):
  media = db.ReferenceProperty(Media)
  channel = db.ReferenceProperty(Channel)
  time = db.DateTimeProperty()

  @classmethod
  def get_current_programs(cls):
    cutoff = datetime.datetime.now() - datetime.timedelta(hours=9)
    return Program.all().filter('time >', cutoff).order('time').fetch(100)

  @classmethod
  def add_program(cls, channel, id):
    media = Media.get(id)
    if media:
      program = Program(media=media,
                        channel=channel,
                        time=channel.get_next_time())
      program.put()
      channel.programming.append(str(program.key().id()))
      channel.put()
      return program

  def toJson(self, fetch_channel=True):
    json = {}
    json['id'] = self.key().id()
    json['media'] = self.media.toJson()
    json['time'] = self.time.isoformat() if self.time else None
    json['channel'] = self.channel.toJson() if fetch_channel else {'id': self.channel.key().id()}
    return json


