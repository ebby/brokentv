from common import *
import base62


class Link(db.Model):
  url = db.StringProperty()
  
  @property
  def id(self):
    return self.key().id()
  
  @property
  def path(self):
    return base62.base62_encode(self.id)

  @classmethod
  def get_by_path(self, path):
    try:
      id = base62.base62_decode(path)
      return Link.get_by_id(id)
    except:
      return None
  
  @classmethod
  def get_or_add(self, url):
    link = Link.all().filter('url =', url).get()
    if not link:
      link = Link(url=url)
      link.put()
    return link