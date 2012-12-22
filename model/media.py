from common import *

from user import User


class Media(db.Model):
  YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json'
  TWITTER_SEARCH = 'http://search.twitter.com/search.json?q=%s'

  type = db.IntegerProperty(default=0)
  name = db.StringProperty()
  host_id = db.StringProperty()
  host = db.StringProperty(default='youtube')
  published = db.DateTimeProperty()
  duration = db.FloatProperty()
  description = db.TextProperty()
  category = db.StringProperty()
  host_views = db.IntegerProperty()
  seen = db.StringListProperty(default=[])

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
  def add_from_entry(cls, entries):
    medias = []
    for entry in entries:
      id = re.match('.+/(.*)$', entry.id.text).group(1)
      media = Media.get_by_key_name(MediaHost.YOUTUBE + id)
      if not media:
        name = unicode(entry.media.title.text, errors='replace')
        desc = entry.media.description.text
        desc = unicode(desc, errors='replace') if desc else None
        category = entry.media.category[0].text
        category = unicode(category, errors='replace') if category else None
        media = cls(key_name=(MediaHost.YOUTUBE + id),
                    type=MediaType.VIDEO,
                    host_id=id,
                    name=name,
                    published=iso8601.parse_date(entry.published.text),
                    duration=float(entry.media.duration.seconds),
                    description=desc,
                    host_views=int(entry.statistics.view_count) if entry.statistics else None,
                    category=category)
      media.put()
      medias.append(media)
    return medias if len(medias) > 1 else medias[0] if len(medias) else None

  @classmethod
  def add_from_json(cls, json):
    entries = json.get('entry')
    entries = entries if isinstance(entries, types.ListType) else [entries]
    medias = []
    for entry in entries:
      media = cls(type=MediaType.VIDEO,
                  host_id=entry['media$group']['yt$videoid']['$t'],
                  name=entry['title']['$t'],
                  duration=float(entry['media$group']['yt$duration']['seconds']),
                  description=entry['media$group']['media$description']['$t'])
      media.put()
      medias.append(media)
    return medias if len(medias) > 1 else medias[0]
  
  def get_tweets(self):
    response = urlfetch.fetch(Media.TWITTER_SEARCH % (MediaHostUrl.YOUTUBE % self.host_id))
    if response.status_code == 200:
      results = simplejson.loads(response.content)['results']
    

  def seen_by(self, user=None):
    if user and not user.id in self.seen:
      self.seen.append(user.id)
      self.put()
      return None
    else:
      return [User.get_by_key_name(uid).toJson() for uid in self.seen]

  def toJson(self):
    json = {}
    json['id'] = self.key().name()
    json['name'] = self.name
    json['publisher'] = self.publisherMedias.get().publisher.toJson() if self.publisherMedias.get() else ''
    json['host_id'] = self.host_id
    json['host'] = self.host
    json['duration'] = self.duration
    json['published'] = self.published.isoformat()
    json['description'] = self.description.replace("\n", r" ") if self.description else None
    return json