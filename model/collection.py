from common import *

from user import User
from media import Media
from publisher import Publisher
from playlist import Playlist


class Collection(db.Model):
  YT_PLAYLIST = 'http://gdata.youtube.com/feeds/api/playlists/%s?start-index=%s'
  
  name = db.StringProperty()
  keywords = db.StringListProperty(default=[])
  channel_id = db.StringProperty()
  hashtags = db.StringListProperty(default=[])
  admins = db.StringListProperty(default=[])
  lifespan = db.IntegerProperty() # Age of allowed content in days
  last_fetch = db.DateTimeProperty()
  pending = db.IntegerProperty(default=0)
  categories = db.StringListProperty(default=[])
  
  @property
  def id(self):
    return self.key().id()
  
  @classmethod
  def add_publisher_media(cls, collection_id, publisher_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    publisher = Publisher.get_by_key_name(publisher_id)
    logging.info('FETCHING: ' + publisher.name)
    publisher_medias = publisher.fetch(collection=collection, approve_all=approve_all)
    
  @classmethod
  def add_channel_media(cls, collection_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    logging.info('FETCHING: ' + collection.name)
    medias = fetch_youtube_channel(collection.channel_id, collection=collection,
                                   approve_all=approve_all)

  def fetch(self, approve_all=False):
    if self.channel_id:
      deferred.defer(Collection.add_channel_media, self.id, approve_all,
                     _name='fetch-' + collection.name.replace(' ', '') + '-' + str(uuid.uuid1()))

    publishers = self.get_publishers()
    for publisher in publishers:
      deferred.defer(Collection.add_publisher_media, self.id, publisher.id, approve_all,
                     _name='fetch-' + publisher.name.replace(' ', '') + '-' + str(uuid.uuid1()))

  def add_media(self, media, approved=False):
    CollectionMedia.add(collection=self, media=media, approved=approved)

  def remove_media(self, media):
    col_media = CollectionMedia.all().filter('media =', media).get()
    if col_media:
      col_media.delete()

  def get_publishers(self):
    return CollectionPublisher.get_publishers(self)

  def get_playlists(self):
    return [p.playlist for p in self.playlists.fetch(None)]
  
  def get_channels(self):
    return CollectionChannel.get_channels(self)
  
  def get_medias(self, limit, offset=0, deep=True, pending=False,
                 last_programmed=None, lifespan=None):
    col_medias = self.collectionMedias
    if pending:
      col_medias = col_medias.filter('approved =', Approval.PENDING)
    else:
      col_medias = col_medias.filter('approved =', Approval.APPROVED)
    if self.lifespan:
      cutoff = datetime.datetime.now() - datetime.timedelta(days=self.lifespan)
      col_medias = col_medias.filter('published >', cutoff)
    
    col_medias = col_medias.order('-published').fetch(limit=limit, offset=offset)
    medias = [c_m.media for c_m in col_medias]

    if deep:
      for col_playlist in self.playlists.fetch(None):
        medias += col_playlist.playlist.get_medias(limit, offset, lifespan=self.lifespan)
      
      for col_col in self.collections.fetch(None):
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
    collection_publishers = CollectionPublisher.all().filter('collection =', collection).fetch(None);
    return [c_p.publisher for c_p in collection_publishers]
  
  @classmethod
  def add(cls, collection, publisher):
    col_pub = CollectionPublisher.all().filter('collection =', collection) \
        .filter('publisher =', publisher).get()
    if not col_pub:
      col_pub = CollectionPublisher(collection=collection, publisher=publisher)
      col_pub.put()
    return col_pub
    
# Media in this collection
class CollectionMedia(db.Model):
  collection = db.ReferenceProperty(Collection, collection_name='collectionMedias')
  media = db.ReferenceProperty(Media, collection_name='collectionMedias')
  published = db.DateTimeProperty() # For sorted queries
  approved = db.IntegerProperty(default=Approval.PENDING)
  
  @classmethod
  def add(cls, collection, media, approved=None):
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
    for tcm in self.topic_media.fetch(None):
      tcm.approved = Approval.APPROVED if approved else Approval.REJECTED
      tcm.put()
    Collection.incr_pending(self.collection.key(), -1)

class CollectionPlaylist(db.Model):
  collection = db.ReferenceProperty(Collection, collection_name='playlists')
  playlist = db.ReferenceProperty(Playlist)
   
  @classmethod
  def add(cls, collection, playlist):
    col_playlist = collection.playlists.filter('playlist =', playlist).get()
    if not col_playlist:
      col_playlist = CollectionPlaylist(collection=collection, playlist=playlist)
      col_playlist.put()
    return col_playlist

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
