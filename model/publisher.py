from common import *

from media import Media

class Publisher(db.Model):
  YOUTUBE_USER = 'https://gdata.youtube.com/feeds/api/users/%s/uploads?alt=json'
  
  name = db.StringProperty()
  host = db.StringProperty(default=MediaHost.YOUTUBE)
  host_id = db.StringProperty()
  last_fetch = db.DateTimeProperty()

  def get_medias(self, limit, offset=0):
    # add .order('-published')
    pub_medias = PublisherMedia.all().filter('publisher =', self) \
        .fetch(limit=limit, offset=offset)
    return [p_m.media for p_m in pub_medias]

  def get_media_by_category(self, category):
    self.fetch([category])
    return PublisherMedia.get_medias(self, category)
  
  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    return json
  
  def fetch(self, categories=None):
    if self.host == MediaHost.YOUTUBE:
      yt_service = gdata.youtube.service.YouTubeService()
      gdata.alt.appengine.run_on_appengine(yt_service)
      query = gdata.youtube.service.YouTubeVideoQuery()
      query.author = self.host_id
      if categories:
        query.categories = categories
      query.orderby = 'published'
      query.max_results = 50
      offset = 1
      while offset <= 1:
        query.start_index = offset
        feed = yt_service.YouTubeQuery(query)
        if len(feed.entry) == 0:
          break
        medias = Media.add_from_entry(feed.entry)
        for media in medias:
          PublisherMedia.add(publisher=self, media=media)

        last_media = medias[-1] if isinstance(medias, list) else medias
        if self.last_fetch and last_media.published \
            and last_media.published.replace(tzinfo=None) < self.last_fetch:
          # We fetched all the latest media
          logging.info('UP TO DATE')
          break
        offset += len(medias)

    self.last_fetch = datetime.datetime.now()
    self.put()

class PublisherMedia(db.Model):
  publisher = db.ReferenceProperty(Publisher, collection_name='publisherMedias')
  media = db.ReferenceProperty(Media, collection_name='publisherMedias')
  published = db.DateTimeProperty()
  
  @classmethod
  def add(cls, publisher, media):
    publisher_media = PublisherMedia.all().filter('media =', media).get()
    if not publisher_media:
      publisher_media = PublisherMedia(publisher=publisher, media=media)
      publisher_media.published = media.published
      publisher_media.put()
    return publisher_media
  
  @classmethod
  def get_medias(cls, publisher, category=None):
    publisher_medias = PublisherMedia.all().filter('publisher =', publisher).fetch(1000)
    medias = []
    for p_m in publisher_medias:
      if category:
        if p_m.media.category == category:
          medias.append(p_m.media)
      else:
        medias.append(p_m.media)
    return medias
