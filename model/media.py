from common import *

import urlparse

from link import Link
from user import User


class Media(db.Model):
  YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json&fields=entry(id,author)'
  TWITTER_SEARCH = 'http://search.twitter.com/search.json?q=%s'

  type = db.IntegerProperty(default=0)
  name = db.TextProperty()
  host_id = db.StringProperty()
  host = db.StringProperty(default='youtube')
  published = db.DateTimeProperty()
  duration = db.FloatProperty()
  description = db.TextProperty()
  category = db.StringProperty()
  seen = db.StringListProperty(default=[])
  last_programmed = db.DateTimeProperty()
  last_twitter_fetch = db.DateTimeProperty()
  thumb_pos = db.IntegerProperty(default=50) # Percent to center of thumbnail
  path = db.StringProperty()
  
  # Statistics
  started = db.StringListProperty(default=[]) # Users who let the program play
  opt_in = db.StringListProperty(default=[]) # Users who tune-in or async play
  opt_out = db.StringListProperty(default=[]) # Users who change channels or log out
  host_views = db.IntegerProperty(default=0)
  comment_count = db.IntegerProperty(default=0)
  star_count = db.IntegerProperty(default=0)
  programmed_count = db.IntegerProperty(default=0)

  @property
  def id(self):
    return self.key().name()

  @property
  def link(self): 
    if not self.path:
      self.path = Link.get_or_add('/?m=' + self.id).path
      self.put()
    return constants.SHARE_URL + self.path

  @classmethod
  def get(cls, id):
    media = Media.get_by_id(id)
    if not media:
      tries = 0
      while (tries < 4):
        response = urlfetch.fetch(Media.YOUTUBE_DATA % id)
        tries += 1
        if response.status_code == 200:
          media = Media.add_from_json(simplejson.loads(response.content))
          break
    return media
  
  @classmethod
  def add_from_url(cls, url):
    yt_service = get_youtube_service()
    parsed_url = urlparse.urlparse(url)
    host_id = urlparse.parse_qs(parsed_url.query)['v'][0]
    entry = yt_service.GetYouTubeVideoEntry(video_id=host_id)
    return Media.add_from_entry([entry])[0]
  
  @classmethod
  def add_from_snippet(cls, items, collection=None, publisher=None, enforce_category=False, approve=False):
    from publisher import Publisher
    from publisher import PublisherMedia
    from collection import CollectionMedia
    from topic import Topic
    from topic import TopicMedia
    from topic import TopicCollectionMedia
    
    medias = []
    for item in items:
      id = item['id']
      media = Media.get_by_key_name(MediaHost.YOUTUBE + id)
      if not media:
        duration = re.search('PT((\d*)H)?((\d*)M)?((\d*)S)?', item['contentDetails']['duration']).groups()
        duration = float(3600*float(duration[1] or 0) + 60*float(duration[3] or 0) + float(duration[5] or 0))
        media = cls(key_name=(MediaHost.YOUTUBE + id),
                    type=MediaType.VIDEO,
                    host_id=id,
                    name=db.Text(item['snippet']['title']),
                    published=iso8601.parse_date(item['snippet']['publishedAt']).replace(tzinfo=None),
                    duration=duration,
                    description=db.Text(item['snippet']['description'].replace("\n", r" ") if item['snippet']['description'] else ''),
                    host_views=int(item['statistics']['viewCount']) if item['statistics']['viewCount'] else 0)
        media.put()

      collection_media = None
      if collection and \
          (not enforce_category or (item['snippet'].get('categoryId') in collection.categories)):
        collection_media = CollectionMedia.add(collection, media, publisher=publisher, approved=(True if approve else None))

      PublisherMedia.add(publisher=publisher, media=media)

      if item.get('topicDetails'):
        for topic_id in item['topicDetails']['topicIds']:
          topic = Topic.add(topic_id)
          TopicMedia.add(topic, media)
          if collection_media:
            TopicCollectionMedia.add(topic, collection_media)
      
      logging.info('FETCHED: ' + media.name)
      medias.append(media)
    return medias
        
  
  @classmethod
  def add_from_entry(cls, entries):
    from publisher import Publisher
    from publisher import PublisherMedia
    
    medias = []
    for entry in [e for e in entries if e.media.player and not e.noembed]:
      content_url = urlparse.urlparse(entry.media.player.url)
      id = urlparse.parse_qs(content_url.query)['v'][0]
      media = Media.get_by_key_name(MediaHost.YOUTUBE + id)
      if not media:
        name = entry.media.title.text.decode('utf-8')
        desc = entry.media.description.text
        desc = desc.decode('utf-8').replace("\n", r" ") if desc else None
        category = entry.media.category[0].text
        category = category.decode('utf-8') if category else None
        media = cls(key_name=(MediaHost.YOUTUBE + id),
                    type=MediaType.VIDEO,
                    host_id=id,
                    name=db.Text(name),
                    published=iso8601.parse_date(entry.published.text).replace(tzinfo=None),
                    duration=float(entry.media.duration.seconds),
                    description=desc,
                    host_views=int(entry.statistics.view_count) if entry.statistics else 0,
                    category=category)
        
        publisher_name = entry.author[0].name.text.lower()
        publisher = Publisher.add(MediaHost.YOUTUBE, publisher_name)
        PublisherMedia.add(publisher, media)
        media.put()
      medias.append(media)
    return medias

  @classmethod
  def add_from_json(cls, json):
    entries = json.get('entry')
    entries = entries if isinstance(entries, types.ListType) else [entries]
    medias = []
    for entry in entries:
      media = cls(type=MediaType.VIDEO,
                  host_id=entry['media$group']['yt$videoid']['$t'],
                  name=db.Text(entry['title']['$t']),
                  duration=float(entry['media$group']['yt$duration']['seconds']),
                  description=entry['media$group']['media$description']['$t'])
      media.put()
      medias.append(media)
    return medias if len(medias) > 1 else medias[0]

  def get_tweets(self, limit=10, offset=0):
    from tweet import Tweet
    return Tweet.all().filter('media =', self).order('-time').fetch(limit, offset=offset)

  def seen_by(self, user=None):
    if user and not user.id in self.seen:
      self.seen.append(user.id)
      self.put()
      return None
    else:
      return [User.get_by_key_name(uid).toJson() for uid in self.seen]
    
  @classmethod
  @db.transactional
  def add_started(cls, key_name, uid):
    obj = Media.get_by_key_name(key_name)
    if uid not in obj.started:
      obj.started.append(uid)
      obj.put()
  
  @classmethod
  @db.transactional
  def add_opt_in(cls, key_name, uid):
    obj = Media.get_by_key_name(key_name)
    if uid not in obj.opt_in:
      obj.opt_in.append(uid)
      obj.put()

  @classmethod
  @db.transactional
  def add_opt_out(cls, key_name, uid):
    obj = Media.get_by_key_name(key_name)
    if uid not in obj.opt_out:
      obj.opt_out.append(uid)
      obj.put()

  def toJson(self, get_desc=True, pub_desc=True):
    json = {}
    json['id'] = self.key().name()
    json['name'] = self.name
    json['publisher'] = self.publisherMedias.get().publisher.toJson(pub_desc) if self.publisherMedias.get() else ''
    json['host_id'] = self.host_id
    json['host'] = self.host
    json['duration'] = self.duration
    json['published'] = self.published.isoformat()
    if get_desc:
      json['description'] = self.description
    json['link'] = self.link
    json['thumb_pos'] = self.thumb_pos
    json['star_count'] = self.star_count
    return json