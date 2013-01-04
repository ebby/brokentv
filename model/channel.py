from common import *

from media import Media

class Channel(db.Model):
  name = db.StringProperty()
  current_program = db.IntegerProperty()
  keywords = db.StringListProperty()
  next_gen = db.DateTimeProperty() # Next programming generation time

  @classmethod
  def get_all(cls):
    return Channel.all().fetch(100)

  def get_programming(self):
    channel_programs = ChannelProgram.all().filter('channel =', self).order('-time').fetch(limit=100)
    return [c_p.program for c_p in channel_programs]

  def get_next_time(self):
    next_time = datetime.datetime.utcnow()
    programming = self.get_programming()
    if len(programming):
      last_program = programming[0]
      next_time = last_program.time + datetime.timedelta(seconds=last_program.media.duration)
    return max(datetime.datetime.utcnow(), next_time)
  
  def get_collections(self):
    return [chan_col.collection for chan_col in self.channelCollections.fetch(100)]

  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    json['programming'] = [p.toJson(False) for p in self.get_programming()]
    json['current_program'] = Program.get_by_id(self.current_program).toJson(False) if self.current_program else None
    return json

from program import *
from collection import *
# Collections that may play into this collection
class ChannelCollection(db.Model):
  
  collection = db.ReferenceProperty(Collection, collection_name='channelCollections')
  channel = db.ReferenceProperty(Channel, collection_name='channelCollections')
  
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
    collection_channel = ChannelCollection.all().filter('channel =', channel).get()
    if not collection_channel:
      collection_channel = ChannelCollection(collection=collection, channel=channel)
      collection_channel.put()
    return collection_channel