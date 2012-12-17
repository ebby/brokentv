import simplejson
import urllib

from google.appengine.api import urlfetch

from models import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=today'

  @classmethod
  def add_youtube_feeds(cls):
    channels = Channel.all().fetch(100)
    for channel in channels:
      for keyword in channel.keywords:
        response = urlfetch.fetch(Programming.YOUTUBE_FEED % ('most_popular', keyword))
        if response.status_code == 200:
          medias = Media.add_from_json(simplejson.loads(response.content)['feed'])
          for media in medias:
            Program.add_program(channel, media.key().id())
            
  @classmethod
  def clear(cls):
    channels = Channel.all().fetch(10)
    for c in channels:
      c.programming = []
      c.put()
    for model in ['Program', 'Media']:
      try:
        while True:
          q = db.GqlQuery("SELECT __key__ FROM " + model)
          assert q.count()
          db.delete(q.fetch(200))
          time.sleep(0.5)
      except Exception, e:
        pass


