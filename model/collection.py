from common import *

from media import Media
from publisher import Publisher
from channel import Channel


class Collection(db.Model):
  name = db.StringProperty()
  keywords = db.StringListProperty(default=[])
  hashtags = db.StringListProperty(default=[])
  # Add related links
  
  def fetch(self):
    publishers = self.get_publishers()
    medias = []
    logging.info(len(publishers))
    for publisher in publishers:
      logging.info(publisher.name)
      publisher_medias = publisher.get_media_by_category(self.keywords[0])
      for media in publisher_medias:
        CollectionMedia.add(self, media)
        medias.append(media)
    return medias
    
    
  def get_publishers(self):
    return CollectionPublisher.get_publishers(self)
  
  def get_channels(self):
    return CollectionChannel.get_channels(self)
  
  def get_medias(self, limit, offset=0):
    col_medias = CollectionMedia.all().filter('collection =', self).order('-published') \
        .fetch(limit=limit, offset=offset)
    return [c_m.media for c_m in col_medias]
  
  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    #json['medias'] = [c_m.media.toJson() for c_m in self.get_medias(100)]
    return json


'''
  ALL BELOW STRUCTURES ARE ONE-TO-MANY RELATIONSHIPS
'''

class CollectionPublisher(db.Model):
  collection = db.ReferenceProperty(Collection)
  publisher = db.ReferenceProperty(Publisher)
  
  @classmethod
  def get_publishers(cls, collection):
    logging.info(collection)
    collection_publishers = CollectionPublisher.all().filter('collection =', collection).fetch(100);
    logging.info(collection_publishers)
    return [c_p.publisher for c_p in collection_publishers]
    
# Media in this collection
class CollectionMedia(db.Model):
  collection = db.ReferenceProperty(Collection, collection_name='collectionMedias')
  media = db.ReferenceProperty(Media, collection_name='collectionMedias')
  published = db.DateTimeProperty() # For sorted queries
  
  @classmethod
  def add(cls, collection, media):
    collection_media = CollectionMedia.all().filter('media =', media).get()
    if not collection_media:
      collection_media = CollectionMedia(collection=collection, media=media, published=media.published)
      collection_media.put()
    return collection_media

# Channels that may play from this collection
class CollectionChannel(db.Model):
  collection = db.ReferenceProperty(Collection)
  channel = db.ReferenceProperty(Channel)
  
  @classmethod
  def get_channels(cls, collection):
    collection_channels = CollectionChannel.all().filter('collection =', collection).fetch(100);
    return [c_c.channel for c_c in collection_channels]
  
  @classmethod
  def get_collections(cls, channel):
    cols = {}
    collection_channels = CollectionChannel.all().filter('channel =', channel).fetch(100);
    for c_c in collection_channels:
      cols[c_c.collection.key().id()] = c_c.collection
    return [x for x in cols.itervalues()]
  
  @classmethod
  def add(cls, collection, channel):
    collection_channel = CollectionMedia.all().filter('channel =', channel).get()
    if not collection_channel:
      collection_channel = CollectionMedia(collection=collection, channel=channel)
      collection_channel.put()
    return collection_channel

class CollectionOfCollections(db.Model):
   parent_collection = db.ReferenceProperty(Collection, collection_name='parent_collection')
   child_collection = db.ReferenceProperty(Collection, collection_name='child_collection')
  