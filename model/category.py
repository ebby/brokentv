from common import *

from media import Media
from collection import *

class Category(db.Model):
  id = db.StringProperty()
  name = db.StringProperty()
  channel_id = db.StringProperty()
  region = db.StringProperty()
  
  @property
  def id(self):
    return self.key().name()

  @classmethod
  def fetch(cls, region_code='US'):
    youtube3 = get_youtube3_service()
    response = youtube3.videoCategories().list(part='snippet', regionCode=region_code).execute()
    cats = []
    for item in response.get('items', []):
      cat = Category.get_or_insert(item['id'],
                                   id=item['id'],
                                   name=item['snippet']['title'],
                                   channel_id=item['snippet']['channelId'],
                                   region=region_code)
      cats.append(cat)
    return cats

  @classmethod
  def get_all(cls, region_code=None):
    q = Category.all()
    if region_code:
      q = q.filter('region =', region_code)
    cats = q.fetch(None)
    if not cats or not len(cats):
      cats = Category.fetch()
    return cats

  def to_json(self):
    json = {}
    json['id'] = self.id
    json['name'] = self.name
    return json

      
      