from common import *

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