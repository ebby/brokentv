from common import *


class User(db.Model):
    id = db.StringProperty()
    access_level = db.IntegerProperty(default=AccessLevel.WAITLIST)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    name = db.StringProperty(required=True)
    profile_url = db.StringProperty()
    email = db.StringProperty()
    access_token = db.StringProperty()
    location = db.StringProperty()

    def to_session(self):
        return dict(name=self.name, profile_url=self.profile_url, id=self.id, access_token=self.access_token)

    def toJson(self):
      json = {}
      json['id'] = self.id
      json['name'] = self.name
      json['profile_url'] = self.profile_url
      json['location'] = self.location
      json['access_level'] = self.access_level
      return json