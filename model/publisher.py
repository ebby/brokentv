from common import *

from media import Media

class Publisher(db.Model):
  YOUTUBE_USER = 'https://gdata.youtube.com/feeds/api/users/%s/uploads?alt=json'
  
  name = db.StringProperty()
  host = db.StringProperty(default=MediaHost.YOUTUBE)
  host_id = db.StringProperty()
  channel_id = db.StringProperty()
  picture = db.BlobProperty()
  link = db.StringProperty()
  description = db.TextProperty()
  last_fetch = db.DateTimeProperty()
  
  @property
  def id(self):
    return str(self.key().name())

  def get_medias(self, limit, offset=0):
    # add .order('-published')
    pub_medias = PublisherMedia.all().filter('publisher =', self) \
        .fetch(limit=limit, offset=offset)
    return [p_m.media for p_m in pub_medias]
  
  def toJson(self):
    json = {}
    json['id'] = self.key().name()
    json['name'] = self.name
    json['description'] = self.description
    json['picture'] = '/images/publisher/' + str(self.key().name())
    json['link'] = self.link
    return json
  
  @classmethod
  def add(self, host, host_id, name=None):
    publisher = Publisher.get_or_insert(key_name=host+host_id,
                                        host_id=host_id,
                                        name=name)
    return publisher
  
  def fetch(self, collection=None, approve_all=False):
    logging.info('FETCH')

    if self.host == MediaHost.YOUTUBE:
      if not self.channel_id:
        yt_service = get_youtube_service()
        try:
          user_entry = yt_service.GetYouTubeUserEntry(username=self.host_id)
        except Exception as e:
          logging.error(e)
          return
        picture = urlfetch.fetch(user_entry.thumbnail.url)
        self.picture = db.Blob(picture.content)
        self.description = user_entry.content.text
        self.link = user_entry.link[0].href
        self.channel_id = re.search('/channel/(.*)', self.link).groups()[0]
        self.put()

      youtube3 = get_youtube3_service()
      next_page_token = ''
      while next_page_token is not None:
        search_response = youtube3.search().list(
          channelId=self.channel_id,
          part='id',
          order='date',
          pageToken=next_page_token,
          publishedAfter=self.last_fetch.isoformat('T') + 'Z' if self.last_fetch else '1970-01-01T00:00:00Z',
          maxResults=10
        ).execute()
        search_ids = ''
        for item in search_response.get('items', []):
          if item['id']['kind'] == 'youtube#video':
            search_ids += item['id']['videoId'] + ','
        videos_response = youtube3.videos().list(
          id=search_ids,
          part="id,snippet,topicDetails,contentDetails,statistics"
        ).execute()
        medias = Media.add_from_snippet(videos_response.get("items", []), collection=collection,
                                        approve=approve_all)
        for media in medias:
          logging.info('FETCHED: ' + media.name)
          PublisherMedia.add(publisher=self, media=media)
        next_page_token = search_response.get('tokenPagination', {}).get('nextPageToken')
          

        
        '''
        query = gdata.youtube.service.YouTubeVideoQuery()
        query.author = self.host_id
        if categories:
          query.categories = categories
        query.orderby = 'published'
        query.max_results = 50
        offset = 1
        while offset <= 1 if constants.DEVELOPMENT else 100: # Max is 1000
          query.start_index = offset
          feed = yt_service.YouTubeQuery(query)
          if len(feed.entry) == 0:
            break
          medias = Media.add_from_entry(feed.entry)
          for media in medias:
            logging.info('FETCHED: ' + media.name)
            PublisherMedia.add(publisher=self, media=media)
  
          last_media = medias[-1] if isinstance(medias, list) else medias
          
          logging.info(self.last_fetch)
          logging.info(last_media.toJson(False))
          
          if self.last_fetch and last_media.published \
              and last_media.published.replace(tzinfo=None) < self.last_fetch:
            # We fetched all the latest media
            logging.info('UP TO DATE')
            break
          offset += len(medias)
        '''

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
    publisher_medias = publisher.publisherMedias.fetch(None)
    medias = [pm.media for pm in publisher_medias]
    for p_m in publisher_medias:
      if not p_m.media:
        p_m.delete()
      if category:
        if p_m.media.category == category:
          medias.append(p_m.media)
      else:
        medias.append(p_m.media)
    return medias
