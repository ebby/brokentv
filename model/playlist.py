from common import *

from user import User
from media import Media
from publisher import Publisher
from collection import *


class Playlist(db.Model):
  YT_PLAYLIST = 'http://gdata.youtube.com/feeds/api/playlists/%s?start-index=%s'
  
  name = db.StringProperty()
  publisher = db.ReferenceProperty(Publisher)
  host = db.StringProperty(default='youtube')
  host_id = db.StringProperty()
  last_fetch = db.DateTimeProperty()
  pending = db.IntegerProperty(default=0)
  
  @property
  def id(self):
    return self.key().name()
  
  def fetch(self, approve_all=False, max=50, collection=None):
    medias = []
    logging.info('Fetching playlist')
    max = 200 if not self.last_fetch else max
    yt_service = get_youtube_service()
    offset = 1
    while offset <= max:
      feed = yt_service.GetYouTubePlaylistVideoFeed(
          uri=Playlist.YT_PLAYLIST % (self.host_id, offset))
      if not self.name:
        self.name = feed.title.text
        self.publisher = Publisher.add('youtube', feed.author[0].name.text)
        self.put()
      if len(feed.entry) == 0:
        break
      medias = Media.add_from_entry(feed.entry, collection=collection, approve=approve_all, fetch_publisher=True)
      for media in medias:
        PlaylistMedia.add(playlist=self, media=media,
                            approved=(True if approve_all else None))
      offset += len(medias)
    self.last_fetch = datetime.datetime.now()
    self.put()
    return medias
  
  @classmethod
  def add_from_url(cls, url):
    playlist_url = urlparse.urlparse(url)
    host_id = urlparse.parse_qs(playlist_url.query)['list'][0]
    playlist = Playlist.get_or_insert('youtube' + host_id,
                                      host='youtube',
                                      host_id=host_id)
    playlist.fetch(max=1)
    return playlist
    
  def add_media(self, media, approved=False):
    PlaylistMedia.add(playlist=self, media=media, approved=approved)
    
  def remove_media(self, media):
    playlist_media = PlaylistMedia.all().filter('media =', media).get()
    if playlist_media:
      playlist_media.delete()
  
  def get_medias(self, limit, offset=0, pending=False, last_programmed=None, lifespan=None):
    medias = self.medias
    if pending:
      medias = medias.filter('approved =', Approval.PENDING)
    else:
      medias = medias.filter('approved =', Approval.APPROVED)
    if lifespan:
      cutoff = datetime.datetime.now() - datetime.timedelta(days=lifespan)
      medias = medias.filter('published >', cutoff)
    
    medias = medias.order('-published').fetch(limit=limit, offset=offset)
    medias = [p_m.media for p_m in medias]
    return medias
  
  @classmethod
  @db.transactional
  def incr_pending(cls, key=None, incr=1, id=None, key_name=None):
    if key:
      obj = Playlist.get(key)
    elif id:
      obj = Playlist.get_by_id(id)
    elif key_name:
      obj = Playlist.get_by_key_name(key_name)
    obj.pending += incr
    obj.put()
  
  def toJson(self):
    json = {}
    json['id'] = self.key().name()
    json['name'] = self.name
    #json['medias'] = [c_m.media.toJson() for c_m in self.get_medias(100)]
    return json


'''
  ALL BELOW STRUCTURES ARE ONE-TO-MANY RELATIONSHIPS
'''

# Media in this playlist
class PlaylistMedia(db.Model):
  playlist = db.ReferenceProperty(Playlist, collection_name='medias')
  media = db.ReferenceProperty(Media)
  published = db.DateTimeProperty() # For sorted queries
  approved = db.IntegerProperty(default=Approval.PENDING)
  
  @classmethod
  def add(cls, playlist, media, approved):
    playlist_media = PlaylistMedia.all().filter('playlist =', playlist) \
        .filter('media =', media).get()
    if not playlist_media:
      playlist_media = PlaylistMedia(playlist=playlist, media=media, published=media.published)
      if approved is not None:
        playlist_media.approved = Approval.APPROVED if approved else Approval.REJECTED
      else:
        Playlist.incr_pending(playlist.key())
      playlist_media.put()
    return playlist_media
  
  def approve(self, approved):
    self.approved = Approval.APPROVED if approved else Approval.REJECTED
    self.put()
    Playlist.incr_pending(self.playlist.key(), -1)

