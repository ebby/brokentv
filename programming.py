import simplejson
import urllib
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import inits
import logging
import uuid

from google.appengine.api import taskqueue
from google.appengine.api import memcache
from google.appengine.api import urlfetch

from model import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=today'

  def __init__(self, fetch=None):
    fetch = True if fetch == None else fetch
    
    self.queue = taskqueue.Queue()
    self.queue.purge()
    
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
      if fetch:
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
    viewers = simplejson.loads(memcache.get('channel_viewers') or '{}').get(channel_id, [])
    cols = channel.get_collections()
    all_medias = []
    for col in cols:
      medias = []
      limit = 50
      offset = 0
      while not len(medias):
        medias = col.get_medias(limit=limit, offset=offset)
        if not len(medias):
          print 'NO MORE MEDIA FOR: ' + col.name
          break
        # Don't repeat the same program within an hour
        medias = [c for c in medias if not c.last_programmed or
                 (datetime.datetime.now() - c.last_programmed).seconds > 3200]
        # At most, 30% of the audience has already "witnessed" this program
        medias = [m for m in medias if not len(viewers) or
                  float(len(Programming.have_seen(m, viewers)))/len(viewers) < .3]
        offset += limit

      all_medias += medias
    
    # StorySort algorithm
    all_medias = Programming.story_sort(all_medias)
    
    for m in all_medias:
      print m.name
    
    # Grab 10 minutes of programming
    all_medias = Programming.timed_subset(all_medias, 600)
    
    programs = []
    for media in all_medias:
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
    if len(programs):
      next_gen = programs[-2].time if len(programs) > 1 else programs[-1].time
      deferred.defer(Programming.set_programming, channel.key().id(),
                     _name=channel.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                     _countdown=max((next_gen - datetime.datetime.now()).seconds, 30))

    return programs
  
  '''
    Our secret sauce sorting algorithm
  '''
  @classmethod
  def story_sort(cls, medias):
    if not len(medias):
      return medias
    
    # Normalize on the max viewcount for set
    max_views = max(medias, key=lambda x: x.host_views).host_views
    max_views = max(max_views, 1)

    def story_score(media):
      a = 1
      b = 1
      c = 1
      d = 1
      e = max(len(media.opt_out), 1) # Each comment outweighs an opt-out
      f = 999999999
      score = a * float(media.host_views)/max_views \
            + b * len(media.seen) \
            + c * len(media.opt_in) \
            - d * len(media.opt_out) \
            + e * media.comment_count \
            + f * (0 if media.last_programmed else 1)/max_views
      score *= max_views
      return int(score)

    return sorted(medias, key=story_score, reverse=True)
  
  '''
    Subset of users who have seen the media item
  '''
  @classmethod
  def have_seen(cls, media, viewers):
    return [v for v in viewers if v in media.seen or v in media.opt_in or v in media.opt_out]

  '''
    Subset of programs within 'cutoff' seconds from current time
  '''
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
  
  '''
    Subset of medias with approx duration of span (in seconds)
  '''
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

    
    


