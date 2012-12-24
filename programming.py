import simplejson
import urllib
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import inits

from google.appengine.api import urlfetch

from model import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=today'

  def __init__(self):
    self.channels = {}
    self.publishers = {}
    self.collections = []
    
    for name, properties in inits.CHANNELS.iteritems():
      channel = Channel.all().filter('name =', name).get()
      if not channel:
        channel = Channel(name=name, keywords=properties['keywords'])
        channel.put()
      self.channels[name] = channel
    
    for name, properties in inits.PUBLISHERS.iteritems():
      publisher = Publisher.all().filter('name =', name).get()
      if not publisher:
        publisher = Publisher(name=name, host_id=properties['youtube'])
        publisher.put()
      self.publishers[publisher.name] = publisher
    
    for name, properties in inits.COLLECTIONS.iteritems():
      collection = Collection.all().filter('name =', name).get()
      if not collection:
        collection = Collection(name=name, keywords=properties['keywords'])
        collection.put()
        for publisher in properties['publishers']:
          collection_publisher = CollectionPublisher(collection=collection,
                                                     publisher=self.publishers[publisher])
          collection_publisher.put()
        for channel in properties['channels']:
          logging.info(channel)
          logging.info(self.channels[channel])
          collection_channel = CollectionChannel(collection=collection,
                                                   channel=self.channels[channel])
          collection_channel.put()
      collection.fetch()
      for channel in collection.get_channels():
        for media in collection.get_medias(100):
          if (datetime.datetime.now() - media.published).days < 2:
            Program.add_program(channel, media)

  @classmethod
  def add_youtube_feeds(cls):
    channels = Channel.all().fetch(100)
    for channel in channels:
      for keyword in channel.keywords:
        yt_service = gdata.youtube.service.YouTubeService()
        gdata.alt.appengine.run_on_appengine(yt_service)
        uri = Programming.YOUTUBE_FEED % ('most_popular', keyword)
        feed = yt_service.GetRecentlyFeaturedVideoFeed()
        medias = Media.add_from_entry(feed.entry)
        for media in medias:
          Program.add_program(channel, media)
            
  @classmethod
  def clear(cls):
    channels = Channel.all().fetch(10)
    for c in channels:
      c.programming = []
      c.put()
    for model in ['PublisherMedia','CollectionMedia','Program', 'Media']:
      try:
        while True:
          q = db.GqlQuery("SELECT __key__ FROM " + model)
          assert q.count()
          db.delete(q.fetch(200))
          time.sleep(0.5)
      except Exception, e:
        pass


