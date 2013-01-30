import simplejson
import urllib
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import inits
import logging
import uuid
import tweepy
import sys
import webapp2

from google.appengine.api import taskqueue
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext import deferred
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

from model import *

class Programming():
  YOUTUBE_FEED = 'https://gdata.youtube.com/feeds/api/standardfeeds/US/%s_%s?v=2&alt=json&time=today'

  def __init__(self, fetch=None):
    fetch = True if fetch == None else fetch
    
    self.channels = {}
    self.publishers = {}
    self.playlists = {}
    self.collections = {}
    
    for name, properties in inits.PUBLISHERS.iteritems():
      publisher = Publisher.add('youtube', host_id=properties['youtube'], name=name)
      self.publishers[publisher.name] = publisher
      
    for name, properties in inits.PLAYLISTS.iteritems():
      playlist = Playlist.get_or_insert('youtube' + properties.get('youtube').lower(),
                                        name=name,
                                        host='youtube',
                                        host_id=properties.get('youtube'),
                                        publisher=self.publishers[properties.get('publisher')])
      self.playlists[name] = playlist
      if fetch:
        deferred.defer(playlist.fetch, approve_all=True,
                       _name='fetch-' + playlist.name.replace(' ', '') + '-' + str(uuid.uuid1()))
    
    for name, properties in inits.COLLECTIONS.iteritems():
      collection = Collection.all().filter('name =', name).get()
      if not collection:
        
        collection = Collection(name=name,
                                keywords=properties.get('keywords', []),
                                lifespan=properties.get('lifespan'))
        collection.put()
        
        for publisher in properties.get('publishers', []):
          collection_publisher = CollectionPublisher(collection=collection,
                                                     publisher=self.publishers[publisher])
          collection_publisher.put()
      for child_col in properties.get('collections', []):
        col_col = CollectionCollection.add(parent_col=collection,
                                           child_col=self.collections[child_col])
      for playlist in properties.get('playlists', []):
        col_playlist = CollectionPlaylist.add(collection=collection,
                                              playlist=self.playlists[playlist])
      self.collections[name] = collection
      if fetch:
        collection.fetch(approve_all=True)
    
    for name, properties in inits.CHANNELS.iteritems():
      channel = Channel.get_or_insert(key_name=Channel.make_key(name),
                                      name=name, keywords=properties['keywords'])
      self.channels[channel.id] = channel
      for col_name in properties['collections']:
        col = self.collections[col_name]
        chan_col = ChannelCollection.add(channel=channel, collection=col)
    
    # Cache the channels
    memcache.set('channels', [c.toJson(get_programming=False) for c in self.channels.itervalues()])
      
  @classmethod
  def set_programming(cls, channel_id, duration=600, schedule_next=True, fetch_twitter=True,
                      queue='programming', target=None, kickoff=False):
    channel = Channel.get_by_key_name(channel_id)
    channel.update_next_time()
    viewers = (memcache.get('channel_viewers') or {}).get(str(channel_id), [])
    onlineUsers = memcache.get('web_channels') or {}
    cols = channel.get_collections()
    all_medias = []
    backup_medias = []
    for col in cols:
      medias = []
      backup = []
      limit = 50
      offset = 0
      while not len(medias):
        medias = col.get_medias(limit=limit, offset=offset, last_programmed = 3200)
        logging.info('MEDIAS COUNT: ' + str(len(medias)))
        backup = backup if len(backup) else medias
        if not len(medias):
          logging.info('NO MORE MEDIA FOR: ' + col.name)
          backup_medias += backup
          break
        # Don't repeat the same program within an hour
        medias = [c for c in medias if not c.last_programmed or
                 (datetime.datetime.now() - c.last_programmed).seconds > 3600]
        # At most, 30% of the audience has already "witnessed" this program
        medias = [m for m in medias if not len(viewers) or
                  float(len(Programming.have_seen(m, viewers)))/len(viewers) < .3]
        offset += limit
      all_medias += medias
    
    if not len(all_medias):
      all_medias = backup_medias
    
    # StorySort algorithm
    all_medias = Programming.story_sort(all_medias)
    
    # Grab 10 minutes of programming
    all_medias = Programming.timed_subset(all_medias, duration)
    
    if fetch_twitter:
      # Find related twitter posts
      deferred.defer(Programming.fetch_related_tweets, all_medias,
                     _name='twitter-' + channel.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                     _queue='twitter',
                     _countdown=30)
    
    programs = []
    for media in all_medias:  
      program = Program.add_program(channel, media)
      programs.append(program)
      logging.info('ADDING: ' + media.name + ' at: ' + program.time.isoformat())
    broadcast.broadcastNewPrograms(channel, programs)

    # Update memcache
    programming = simplejson.loads(memcache.get('programming') or '{}')

    # Add new programs to filtered, current programs
    programming[channel_id] = Programming.cutoff_programs(programming.get(channel_id), 1800) + \
        [p.toJson(fetch_channel=False, media_desc=False) for p in programs]
    memcache.set('programming', simplejson.dumps(programming))
    
    # Update channel's next_time
    channels = memcache.get('channels') or []
    for i,c in enumerate(channels):
      if c['id'] == channel_id:
        channels[i] = channel.toJson(get_programming=False)
    memcache.set('channels', channels)

    # Schedule our next programming selection
    if schedule_next and (kickoff or (len(medias) and len(onlineUsers.keys()))):
      next_gen = (programs[-2].time - datetime.datetime.now()).seconds if len(programs) > 1 \
          else 0
      next_gen = min(next_gen,
                     reduce(lambda x, y: x + y, [p.media.duration for p in programs], 0))
      next_gen = min(next_gen, duration - 120)
      logging.info('COUNTDOWN FOR ' + channel.name + ': ' + str(next_gen))
      deferred.defer(Programming.set_programming, channel.key().name(),
                     _name=channel.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                     _countdown=next_gen,
                     _queue=queue)

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
      g = 1
      h = 50
      score = a * float(media.host_views)/max_views \
            + b * len(media.seen) \
            + c * len(media.opt_in) \
            - d * len(media.opt_out) \
            + e * media.comment_count \
            + f * (0 if media.last_programmed else 1)/max_views \
            - g * (media.programmed_count or 0) \
            - h * (datetime.datetime.now() - media.published).days
      score *= max_views
      return int(score)

    return sorted(medias, key=story_score, reverse=True)
  
  '''
    Subset of users who have seen the media item
  '''
  @classmethod
  def have_seen(cls, media, viewers):
    return [v for v in viewers if v in media.seen or v in media.opt_in
            or v in media.opt_out or v in media.started]

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
  def fetch_related_tweets(cls, medias):
    api = tweepy.API()
    total = 0
    for media in medias:
      if media.last_twitter_fetch and \
          (datetime.datetime.now() - media.last_twitter_fetch).seconds < 3600:
        continue
      for tweet in tweepy.Cursor(api.search, q=media.host_id, rpp=100, result_type="recent",
                                 include_entities=True, lang="en").items():
        total += 1
        if not tweet.from_user.lower() in constants.TWITTER_USER_BLACKLIST and not \
            any(phrase in tweet.text.lower() for phrase in constants.TWITTER_PHRASE_BLACKLIST):
          Tweet.add_from_result(tweet, media)
      media.last_twitter_fetch = datetime.datetime.now()
      media.put()
      logging.info(str(total) + ' TWEETS FETCHED')

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
  def clear_collection(cls, col):
    for q in [col.collectionMedias, col.collections, col.publishers, col.channels]:
      try:
        while True:
          assert q.count()
          db.delete(q.fetch(200))
          time.sleep(0.5)
      except Exception, e:
        pass
    col.delete()
            
  @classmethod
  def clear(cls):
    channels = Channel.all().fetch(None)
    memcache.delete('channels')
    memcache.delete('programming')
    for c in channels:
      c.next_time = None
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
      
class StartHandler(webapp2.RequestHandler):
  def get(self):
    self.queue = taskqueue.Queue(name='programming')
    self.queue.purge()
    self.queue = taskqueue.Queue(name='twitter')
    self.queue.purge()
    
    channels = Channel.get_public()
    if not len(channels):
      no_media = len(Media.all().fetch(10)) == 0
      Programming(no_media) # Do fetch if no media
      channels = Channel.get_public()
    for c in channels:
      Programming.set_programming(c.key().name(), queue='programming')
    
  
app = webapp.WSGIApplication([('/_ah/start', StartHandler)], debug=True)
