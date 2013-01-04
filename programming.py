import simplejson
import urllib
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import inits
import logging

from google.appengine.api import memcache
from google.appengine.api import urlfetch

from model import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=today'

  def __init__(self):
    self.channels = {}
    self.publishers = {}
    self.collections = {}
    
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
      self.collections[name] = collection
      collection.fetch()
    
    for name, properties in inits.CHANNELS.iteritems():
      channel = Channel.all().filter('name =', name).get()
      if not channel:
        channel = Channel(name=name, keywords=properties['keywords'])
        channel.put()
      self.channels[name] = channel
      for col_name in properties['collections']:
        col = self.collections[col_name]
        chan_col = ChannelCollection.add(channel=channel, collection=col)

      # We need to generate some programming now
      Programming.set_programming(channel.key().id())
    
    # Cache the channels
    memcache.set('channels', simplejson.dumps([c.toJson() for c in self.channels.itervalues()]))
      
  @classmethod
  def set_programming(cls, channel_id):
    channel = Channel.get_by_id(channel_id)
    cols = channel.get_collections()
    programs = []
    for col in cols:
      #col.fetch() # This step won't be needed when pubsubhubbub is setup
      medias = []
      limit = 10
      offset = 0
      while not len(medias):
        medias = col.get_medias(limit=limit, offset=offset)
        if not len(medias):
          break
        # Don't repeat the same program within an hour
        medias = Programming.timed_subset([c for c in medias if not c.last_programmed or
                 (datetime.datetime.now() - c.last_programmed).seconds > 3200], 600)
        offset += limit
      for media in medias:
        programs.append(Program.add_program(channel, media))
    broadcast.broadcastNewPrograms(channel, programs)

    # Update memcache
    programming = simplejson.loads(memcache.get('programming') or '{}')
    channel_id = str(channel_id) # Memcache keys are all strings
    
    # Add new programs to filtered, current programs
    programming[channel_id] = Programming.cutoff_programs(programming.get(channel_id), 1800) + \
        [p.toJson(fetch_channel=False, media_desc=False) for p in programs]
    memcache.set('programming', simplejson.dumps(programming))

    # Schedule our next programming selection
    next_gen = programs[-1].time
    if not channel.next_gen or channel.next_gen <= next_gen:
      # Condition needed?
      channel.next_gen = next_gen
      channel.put()
      deferred.defer(Programming.set_programming, channel.key().id(),
                     _countdown=max((next_gen - datetime.datetime.now()).seconds, 0))
    return programs

  @classmethod
  def cutoff_programs(cls, programs, cutoff):
    # Cutoff in seconds, programs are json
    if not programs or not len(programs):
      return []
    cutoff_index = 0
    for p in programs:
      time = iso8601.parse_date(p['time']).replace(tzinfo=None)
      if (datetime.datetime.now() - time).seconds < cutoff:
        # Stop when within 30 minutes
        break
      cutoff_index += 1
    return programs[cutoff_index:]
  
  @classmethod
  def timed_subset(cls, medias, span):
    # Span in seconds, medias are entities
    if not medias or not len(medias):
      return []
    cutoff_index = 0
    while span >= 0 and cutoff_index < len(medias):
      span -= medias[cutoff_index].duration
      cutoff_index += 1
    return medias[:cutoff_index]

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
    memcache.delete('programming')
    for c in channels:
      c.programming = []
      c.put()
    for model in ['Program', 'ChannelProgram']:
      try:
        while True:
          q = db.GqlQuery("SELECT __key__ FROM " + model)
          assert q.count()
          db.delete(q.fetch(200))
          time.sleep(0.5)
      except Exception, e:
        pass


