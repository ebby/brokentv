import simplejson
import urllib

from google.appengine.api import urlfetch

from models import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=this_week'

  @classmethod
  def add_youtube_feeds(cls):
    channels = Channel.all().fetch(100)
    for channel in channels:
      for keyword in channel.keywords:
        response = urlfetch.fetch(Programming.YOUTUBE_FEED % ('most_popular', keyword))
        if response.status_code == 200:
          medias = Media.add_from_json(simplejson.loads(response.content)['feed'])
          for media in medias:
            Program.add_program(channel, media.id)

