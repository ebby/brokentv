from common import *
import base62


class Link(db.Model):
  url = db.StringProperty()
  
  @property
  def id(self):
    if self.key().name():
      return self.key().name()
    return self.key().id()
  
  @property
  def path(self):
    if self.key().name():
      return self.key().name()
    return base62.base62_encode(self.id)

  @classmethod
  def get_by_path(self, path):
    link = Link.get_by_key_name(path)
    if link:
      return link
    try:
      id = base62.base62_decode(path)
      return Link.get_by_id(id)
    except:
      return None
  
  @classmethod
  def get_or_add(self, url, custom=None):
    link = Link.all().filter('url =', url).get()
    if not link:
      link = Link(key_name=custom, url=url)
      link.put()
    return link