from common import *

from user import User
from media import Media
from publisher import Publisher
from channel import Channel


class Collection(db.Model):
  YT_PLAYLIST = 'http://gdata.youtube.com/feeds/api/playlists/%s?start-index=%s'
  
  name = db.StringProperty()
  keywords = db.StringListProperty(default=[])
  hashtags = db.StringListProperty(default=[])
  admins = db.StringListProperty(default=[])
  lifespan = db.IntegerProperty() # Age of allowed content in days
  yt_playlist = db.StringProperty()
  last_fetch = db.DateTimeProperty()
  pending = db.IntegerProperty(default=0)
  
  def fetch(self, approve_all=False):
    publishers = self.get_publishers()
    medias = []
    
    if self.yt_playlist and not self.last_fetch:
      yt_service = gdata.youtube.service.YouTubeService()
      gdata.alt.appengine.run_on_appengine(yt_service)
      offset = 1
      while offset <= 1000:
        feed = yt_service.GetYouTubePlaylistVideoFeed(
            uri=Collection.YT_PLAYLIST % (self.yt_playlist, offset))
        if len(feed.entry) == 0:
          break
        medias = Media.add_from_entry(feed.entry)
        for media in medias:
          CollectionMedia.add(collection=self, media=media,
                              approved=(True if approve_all else None))
        offset += len(medias)

    if self.keywords:
      for publisher in publishers:
        publisher_medias = publisher.get_media_by_category(self.keywords[0])
        for media in publisher_medias:
          CollectionMedia.add(self, media, approved=(True if approve_all else None))
          medias.append(media)
    
    return medias
    
  def add_media(self, media):
    CollectionMedia.add(self, media)
    
  def remove_media(self, media):
    col_media = CollectionMedia.all().filter('media =', media).get()
    if col_media:
      col_media.delete()
    
  def get_publishers(self):
    return CollectionPublisher.get_publishers(self)
  
  def get_channels(self):
    return CollectionChannel.get_channels(self)
  
  def get_medias(self, limit, offset=0, pending=False, last_programmed=None):
    col_medias = self.collectionMedias
    if pending:
      col_medias = col_medias.filter('approved =', Approval.PENDING)
    else:
      col_medias = col_medias.filter('approved =', Approval.APPROVED)
    if self.lifespan:
      cutoff = datetime.datetime.now() - datetime.timedelta(days=self.lifespan)
      col_medias.filter('published >', cutoff)
    
    col_medias = col_medias.order('-published').fetch(limit=limit, offset=offset)
    medias = [c_m.media for c_m in col_medias]

    for col_col in self.collections.fetch(10):
      medias += col_col.child_col.get_medias(limit, offset)

    return medias
  
  @classmethod
  @db.transactional
  def incr_pending(cls, key=None, incr=1, id=None, key_name=None):
    if key:
      obj = Collection.get(key)
    elif id:
      obj = Collection.get_by_id(id)
    elif key_name:
      obj = Collection.get_by_key_name(key_name)
    obj.pending += incr
    obj.put()
  
  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    json['pending'] = self.pending
    #json['medias'] = [c_m.media.toJson() for c_m in self.get_medias(100)]
    return json


'''
  ALL BELOW STRUCTURES ARE ONE-TO-MANY RELATIONSHIPS
'''

class CollectionPublisher(db.Model):
  collection = db.ReferenceProperty(Collection, collection_name='publishers')
  publisher = db.ReferenceProperty(Publisher)
  
  @classmethod
  def get_publishers(cls, collection):
    collection_publishers = CollectionPublisher.all().filter('collection =', collection).fetch(100);
    return [c_p.publisher for c_p in collection_publishers]
    
# Media in this collection
class CollectionMedia(db.Model):
  collection = db.ReferenceProperty(Collection, collection_name='collectionMedias')
  media = db.ReferenceProperty(Media, collection_name='collectionMedias')
  published = db.DateTimeProperty() # For sorted queries
  approved = db.IntegerProperty(default=Approval.PENDING)
  
  @classmethod
  def add(cls, collection, media, approved):
    collection_media = CollectionMedia.all().filter('collection =', collection) \
        .filter('media =', media).get()
    if not collection_media:
      collection_media = CollectionMedia(collection=collection, media=media, published=media.published)
      if approved is not None:
        collection_media.approved = Approval.APPROVED if approved else Approval.REJECTED
      else:
        Collection.incr_pending(collection.key())
      collection_media.put()
    return collection_media
  
  def approve(self, approved):
    self.approved = Approval.APPROVED if approved else Approval.REJECTED
    self.put()
    Collection.incr_pending(self.collection.key(), -1)

# Channels that may play from this collection
#class CollectionChannel(db.Model):
#  collection = db.ReferenceProperty(Collection, collection_name='channels')
#  channel = db.ReferenceProperty(Channel)
#  
#  @classmethod
#  def get_channels(cls, collection):
#    collection_channels = CollectionChannel.all().filter('collection =', collection).fetch(100);
#    return [c_c.channel for c_c in collection_channels]
#  
#  @classmethod
#  def get_collections(cls, channel):
#    cols = {}
#    collection_channels = CollectionChannel.all().filter('channel =', channel).fetch(100);
#    for c_c in collection_channels:
#      cols[c_c.collection.key().id()] = c_c.collection
#    return [x for x in cols.itervalues()]
#  
#  @classmethod
#  def add(cls, collection, channel):
#    collection_channel = CollectionChannel.all().filter('channel =', channel).get()
#    if not collection_channel:
#      collection_channel = CollectionChannel(collection=collection, channel=channel)
#      collection_channel.put()
#    return collection_channel

class CollectionCollection(db.Model):
  parent_col = db.ReferenceProperty(Collection, collection_name='collections')
  child_col = db.ReferenceProperty(Collection)
   
  @classmethod
  def add(cls, parent_col, child_col):
    col_col = CollectionCollection.all().filter('parent =', parent_col) \
        .filter('child =', child_col).get()
    if not col_col:
      col_col = CollectionCollection(parent_col=parent_col, child_col=child_col)
      col_col.put()
    return col_col
