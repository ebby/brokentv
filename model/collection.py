from common import *

from user import User
from media import Media
from publisher import Publisher
from playlist import Playlist
from category import Category


class Collection(db.Model):
  YT_PLAYLIST = 'http://gdata.youtube.com/feeds/api/playlists/%s?start-index=%s'
  
  # Takes: (REGION, FEED_ID)
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/%s/%s?v=2&alt=json&time=today'

  # Takes: (REGION, FEED_ID, CATEGORY)
  YOUTUBE_CATEGORY_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/%s/%s_%s?v=2&alt=json&time=today'
  
  name = db.StringProperty()
  keywords = db.StringListProperty(default=[])
  channel_id = db.StringProperty()
  feed_id = db.StringProperty()
  hashtags = db.StringListProperty(default=[])
  admins = db.StringListProperty(default=[])
  lifespan = db.IntegerProperty() # Age of allowed content in days
  last_fetch = db.DateTimeProperty()
  pending = db.IntegerProperty(default=0)
  categories = db.StringListProperty(default=[])
  feed_categories = db.StringListProperty(default=[])
  region = db.StringProperty(default='US')
  reddit = db.StringProperty()

  @property
  def id(self):
    return self.key().id()
  
  @classmethod
  def get_popular(self):
    col = Collection.all().filter('name =', 'xylo-popular').get()
    if not col:
      col = Collection(name='xylo-popular')
      col.put()
    return col

  @classmethod
  def add_publisher_media(cls, collection_id, publisher_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    publisher = Publisher.get_by_key_name(publisher_id)
    publisher_medias = publisher.fetch(collection=collection, approve_all=approve_all)
    
  @classmethod
  def add_reddit_media(cls, collection_id, reddit_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    response = urlfetch.fetch('http://www.reddit.com/r/%s.json?limit=50' % reddit_id)
    content = simplejson.loads(response.content) or {}
    if content.get('error'):
      logging.error('REDDIT ERROR: ' + str(content.get('error')))
    data = content.get('data')
    if data:
      links = data.get('children')
      ids = []
      reddit_ids = {}
      logging.info('FETCHING %s VIDEOS FROM REDDIT' % str(len(links)))
      for link in links:
        link_data = link.get('data') or {}
        if link_data.get('domain') == 'youtube.com' and not link_data.get('over_18') and link_data.get('score') > 100:
          url = link_data.get('url')
          parsed_url = urlparse.urlparse(url)
          host_id = urlparse.parse_qs(parsed_url.query)['v'][0]
          reddit_ids[host_id] = link.get('kind') + '_' + link_data.get('id')
          ids.append(host_id)
  
      youtube3 = get_youtube3_service()
      
      while len(ids) > 0:
        videos_response = youtube3.videos().list(
          id=','.join(ids[0:10]),
          part="id,snippet,topicDetails,contentDetails,statistics"
        ).execute()
        if videos_response.get('error'):
          logging.error(videos_response.get('error').get('error')[0]['reason'])
          return
        medias = Media.add_from_snippet(videos_response.get("items", []),
                                        collection=collection,
                                        approve=approve_all)
        for media in medias:
          if reddit_ids[media.host_id]:
            media.reddit_id = reddit_ids[media.host_id]
            media.put()
        ids = ids[10:]
      
    

  @classmethod
  def add_playlist_media(cls, collection_id, playlist_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    playlist = Playlist.get_by_key_name(playlist_id)
    playlist_medias = playlist.fetch(collection=collection, approve_all=approve_all)

  @classmethod
  def add_channel_media(cls, collection_id, approve_all):
    collection = Collection.get_by_id(int(collection_id))
    logging.info('FETCHING: ' + collection.name)
    medias = fetch_youtube_channel(collection.channel_id, collection=collection,
                                   approve_all=approve_all)

  @classmethod
  def add_feed_media(cls, collection_id, feed_category=None, approve_all=False):
    collection = Collection.get_by_id(int(collection_id))
    medias = []
    if feed_category:
      uri = Collection.YOUTUBE_CATEGORY_FEED % ((collection.region or 'US'), collection.feed_id,
                                                feed_category)
    else:
      uri = Collection.YOUTUBE_FEED % ((collection.region or 'US'), collection.feed_id)
    response = urlfetch.fetch(uri)
    if response.status_code == 200:
      data = simplejson.loads(response.content) or {}
      entries = data['feed']['entry'] if data.get('feed') else []
      ids = ''
      publisher_map = {}
      for entry in entries:
        id = re.search('video:(.*)', entry['id']['$t']).group(1)
        publisher = Publisher.add(host=MediaHost.YOUTUBE, host_id=entry['author'][0]['yt$userId']['$t'])
        deferred.defer(Publisher.fetch_details, publisher.id,
                       _name='publisher-' + publisher.id + '-' + str(uuid.uuid1()),
                       _queue='youtube')
        ids += id + ','
        publisher_map[id] = publisher
      if len(ids):
        youtube3 = get_youtube3_service()
        videos_response = youtube3.videos().list(
          id=ids,
          part='id,snippet,topicDetails,contentDetails,statistics'
        ).execute()
        logging.info('ADD FEED VIDEO: ' + id)
        medias = Media.add_from_snippet(videos_response.get('items', []), collection=collection,
                                        publisher=publisher, approve=approve_all)
    return medias

  def fetch(self, approve_all=False):
    if self.reddit:
      logging.info(self.reddit)
      deferred.defer(Collection.add_reddit_media, self.id, self.reddit, approve_all=approve_all,
                     _name='fetch-reddit-' + self.reddit + '-' + str(uuid.uuid1()), _queue='youtube')
    
    if self.feed_id:
      if 'All' in self.feed_categories:
        job_name = self.name.replace(' ', '') + '-all'
        deferred.defer(Collection.add_feed_media, self.id, approve_all=False, 
                       _name='fetch-' + job_name + '-' + str(uuid.uuid1()), _queue='youtube')
      for feed_cat in self.feed_categories:
        job_name = self.name.replace(' ', '') + '-' + feed_cat
        deferred.defer(Collection.add_feed_media, self.id, feed_category=feed_cat, approve_all=False, 
                       _name='fetch-' + job_name + '-' + str(uuid.uuid1()), _queue='youtube')

    if self.channel_id:
      deferred.defer(Collection.add_channel_media, self.id, approve_all=approve_all,
                     _name='fetch-' + self.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                     _queue='youtube')

    publishers = self.get_publishers()
    for publisher in publishers:
      deferred.defer(Collection.add_publisher_media, self.id, publisher.id, approve_all=approve_all,
                     _name='fetch-' + publisher.id + '-' + str(uuid.uuid1()), _queue='youtube')
    
    playlists = self.get_playlists()
    for playlist in playlists:
      logging.info('FETCHING PLAYLISTS')
      deferred.defer(Collection.add_playlist_media, self.id, playlist.id, approve_all=approve_all,
                     _name='fetch-' + playlist.id + '-' + str(uuid.uuid1()), _queue='youtube')

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
                 last_programmed=None, lifespan=None, by_popularity=False, never_emailed=False):
    col_medias = self.collectionMedias
    if pending:
      col_medias = col_medias.filter('approved =', Approval.PENDING)
    else:
      col_medias = col_medias.filter('approved =', Approval.APPROVED)
    if self.lifespan:
      cutoff = datetime.datetime.now() - datetime.timedelta(days=self.lifespan)
      if self.reddit:
        col_medias = col_medias.filter('added >', cutoff)
      else:
        col_medias = col_medias.filter('published >', cutoff)

    if self.reddit:
      col_medias = col_medias.order('-added').fetch(limit=limit, offset=offset)
    else:
      col_medias = col_medias.order('-published').fetch(limit=limit, offset=offset)
    medias = [c_m.media for c_m in col_medias]

    if deep:
      for col_playlist in self.playlists.fetch(None):
        medias += col_playlist.playlist.get_medias(limit, offset, lifespan=self.lifespan)

      for col_col in self.collections.fetch(None):
        medias += col_col.child_col.get_medias(limit, offset)
    
    if by_popularity:
      medias = sorted(medias, key=lambda x:x.host_views)

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
  
  @classmethod
  def delete_all(cls, id):
    collection = Collection.get_by_id(int(id))
    for cm in collection.collectionMedias.fetch(None):
      cm.delete()
    for cp in collection.publishers.fetch(None):
      cp.delete()
    for cp in collection.playlists.fetch(None):
      cp.delete()
    for cc in collection.collections.fetch(None):
      cc.delete()
    for cc in collection.channels.fetch(None):
      cc.delete()
#    for tcm in collection.topic_medias.fetch(None):
#      tcm.delete()
    collection.delete()
  
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
  publisher = db.ReferenceProperty(Publisher)
  published = db.DateTimeProperty() # For sorted queries
  added = db.DateTimeProperty(auto_now_add=True)
  approved = db.IntegerProperty(default=Approval.PENDING)
  last_programmed = db.DateTimeProperty()
  emailed = db.BooleanProperty(default=False)
  
  @classmethod
  def add(cls, collection, media, publisher=None, approved=None):
    collection_media = collection.collectionMedias.filter('media =', media).get()
    if not collection_media:
      collection_media = CollectionMedia(collection=collection, media=media, publisher=publisher,
                                         published=media.published)
      if approved is not None:
        collection_media.approved = Approval.APPROVED if approved else Approval.REJECTED
      else:
        Collection.incr_pending(collection.key())
      collection_media.put()
    else:
      collection_media.added = datetime.datetime.now()
      collection_media.put()
    return collection_media
  
  def approve(self, approved):
    self.approved = Approval.APPROVED if approved else Approval.REJECTED
    self.put()
    for tcm in self.collection.topic_medias.fetch(None):
      if tcm.media.id == self.media.id:
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
