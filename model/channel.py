from common import *

from media import Media
from user import User
from collection import Collection

class Channel(db.Model):
  name = db.StringProperty()
  current_program = db.IntegerProperty()
  keywords = db.StringListProperty()
  next_gen = db.DateTimeProperty() # Next programming generation time
  privacy = db.IntegerProperty(default=Privacy.PUBLIC)
  next_time = db.DateTimeProperty()
  suggested = db.ReferenceProperty(Collection)
  user = db.ReferenceProperty(User, collection_name='channel')
  online = db.BooleanProperty(default=False)

  @property
  def id(self):
    return str(self.key().name())

  @classmethod
  def make_key(cls, name):
    return name.replace(' ', '-').lower()

  @classmethod
  def get_public(cls):
    return Channel.all().filter('privacy =', Privacy.PUBLIC).filter('online =', True).fetch(None)

  @classmethod
  def get_all(cls):
    return Channel.all().fetch(None)

  def get_programming(self):
    channel_programs = ChannelProgram.all().filter('channel =', self).order('-time').fetch(limit=100)
    return [c_p.program for c_p in channel_programs]
  
  def get_current_program(self):
    # MEMCACHE THIS!!
    current_program = Program.get_by_id(self.current_program) if self.current_program else None
    if current_program and current_program.time <= datetime.datetime.now() <= \
          current_program.time + datetime.timedelta(seconds=current_program.media.duration):
      return current_program

    # WAYYY TOO EXPENSIVE
    channel_programs = ChannelProgram.all().filter('channel =', self).order('-time').fetch(limit=30)
    for c_p in channel_programs:
      if c_p.time <= datetime.datetime.now() <= \
          c_p.time + datetime.timedelta(seconds=c_p.program.media.duration):
        self.current_program = c_p.program.key().id()
        return c_p.program
    return None
  
  def update_next_time(self):
    last_program = self.programs.order('-time').get()
    next_time = datetime.datetime.now()
    if last_program:
      next_time = last_program.program.time + datetime.timedelta(seconds=last_program.program.media.duration)
    self.next_time = max(datetime.datetime.now(), next_time)

  def get_next_time(self):
    next_time = self.next_time or datetime.datetime.utcnow()
    return max(datetime.datetime.utcnow(), next_time)
  
  def get_collections(self):
    return [chan_col.collection for chan_col in self.collections.fetch(20)]
  
  def get_suggested(self):
    col = self.suggested
    if not col:
      col = Collection(name=self.name + ' Suggestions')
      col.put()
      self.suggested = col
      self.put()
    return col

  def toJson(self, get_programming=False):
    json = {}
    json['id'] = self.key().name()
    json['name'] = self.name
    if get_programming:
      json['programming'] = [p.toJson(False) for p in self.get_programming()]
    json['online'] = self.online
    json['my_channel'] = self.privacy == Privacy.PRIVATE
    json['next_time'] = self.next_time.isoformat() if self.next_time else datetime.datetime.now().isoformat()
    return json

from program import *
# Collections that may play into this collection
class ChannelCollection(db.Model):
  
  collection = db.ReferenceProperty(Collection, collection_name='channels')
  channel = db.ReferenceProperty(Channel, collection_name='collections')
  
  @classmethod
  def get_channels(cls, collection):
    collection_channels = ChannelCollection.all().filter('collection =', collection).fetch(100);
    return [c_c.channel for c_c in collection_channels]
  
  @classmethod
  def get_collections(cls, channel):
    cols = {}
    collection_channels = ChannelCollection.all().filter('channel =', channel).fetch(100);
    for c_c in collection_channels:
      cols[c_c.collection.key().id()] = c_c.collection
    return [x for x in cols.itervalues()]
  
  @classmethod
  def add(cls, channel, collection):
    collection_channel = ChannelCollection.all().filter('channel =', channel).filter('collection =', collection).get()
    if not collection_channel:
      collection_channel = ChannelCollection(collection=collection, channel=channel)
      collection_channel.put()
    return collection_channel

class ChannelAdmins(db.Model):
  channel = db.ReferenceProperty(Channel, collection_name='admins')
  admin = db.ReferenceProperty(User, collection_name='channels')
