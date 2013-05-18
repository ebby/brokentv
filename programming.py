import broadcast
import datetime
import simplejson
import urllib
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import inits
import iso8601
import logging
import random
import uuid
import tweepy
import sys
import webapp2
import pickle

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
      publisher = Publisher.add('youtube', host_id=properties['youtube'].lower(), name=name)
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
                       _name='fetch-' + playlist.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                       _queue='youtube')
    
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
        collection.fetch(approve_all=constants.APPROVE_ALL)
    
    for name, properties in inits.CHANNELS.iteritems():
      channel = Channel.get_or_insert(key_name=Channel.make_key(name),
                                      name=name, keywords=properties['keywords'],
                                      online=True)
      self.channels[channel.id] = channel
      for col_name in properties['collections']:
        col = self.collections[col_name]
        chan_col = ChannelCollection.add(channel=channel, collection=col)
    
    # Cache the channels
    memcache.set('channels', [c.toJson(get_programming=False) for c in self.channels.itervalues()])
      
  @classmethod
  def set_programming(cls, channel_id, duration=2400, schedule_next=False, fetch_twitter=True,
                      queue='programming', target=None, kickoff=False):
    import broadcast
    import constants
    from model import Channel
    from model import Program
    
    # Stored programming
    programming = memcache.get('programming') or {}
    onlineUsers = memcache.get('web_channels') or {}

    logging.info('programming: ' + channel_id)
    
    next_programs = Programming.next_programs(programming.get(channel_id, []), duration, prelude=300)
    gap = Programming.gap(programming.get(channel_id, []), duration)
    
    logging.info('GAP: ' + str(gap))

    if programming.get(channel_id) and len(programming[channel_id]) and \
        programming[channel_id][0]['media'].get('live') == True:
      logging.info('live tweets')
      # Update tweets for live events
      media = Media.get_by_key_name(programming[channel_id][0]['media']['id'])
      deferred.defer(Programming.fetch_related_tweets, [],
                     _name='twitter-' + channel_id + '-' + str(uuid.uuid1()),
                     _queue='twitter')

    programs = []
    if not programming.get(channel_id) or gap > 60:
      channel = Channel.get_by_key_name(channel_id)
      #channel.update_next_time()
      viewers = (memcache.get('channel_viewers') or {}).get(str(channel_id), [])
      cols = channel.get_collections()
      all_medias = []
      backup_medias = []
      limit = 100
      for col in cols:
        medias = []
        filtered_medias = []
        offset = 0
        while True:
          medias = col.get_medias(limit=limit, offset=offset)
          if not len(medias):
            break
          backup_medias += medias    

          # Don't repeat the same program within an hour
          filtered_medias = [c for c in medias if not c.last_programmed or
                   (datetime.datetime.now() - c.last_programmed).seconds > 3600]
          
          # At most, 30% of the audience has already "witnessed" this program
          # filtered_medias = [m for m in filtered_medias if not len(viewers) or
          #           float(len(Programming.have_seen(m, viewers)))/len(viewers) < .3]
          all_medias += filtered_medias
          offset += limit

      all_medias = backup_medias if not len(all_medias) else all_medias

      # Don't repeat already programmed 
      all_medias = Programming.no_reprogram(next_programs, all_medias)

      # StorySort algorithm
      all_medias = Programming.story_sort(all_medias)

      # Only one publisher per story
      all_medias = Programming.unique_publishers(all_medias)

      # Grab "duration" seconds of programming
      all_medias = Programming.timed_subset(all_medias, duration)

      if fetch_twitter:
        # Find related twitter posts
        deferred.defer(Programming.fetch_related_tweets, all_medias,
                       _name='twitter-' + channel.name.replace(' ', '') + '-' + str(uuid.uuid1()),
                       _queue='twitter',
                       _countdown=30)

      # Truncate old programs
      programming[channel_id] = Programming.cutoff_programs(programming.get(channel_id), 300)

      for media in all_medias:
        program = Program.add_program(channel, media, min_time=datetime.datetime.now(),
                                      max_time=(datetime.datetime.now() + datetime.timedelta(seconds=duration)))
        logging.info(program)
        if program:
          if not programming.get(channel_id, None):
            programming[channel_id] = []
          programming.get(channel_id).append(program.toJson(fetch_channel=False, fetch_media=True, media_desc=False, pub_desc=False))
          programs.append(program)
          logging.info('ADDING: ' + media.name + ' at: ' + program.time.isoformat())
          if len(pickle.dumps(programming)) > 1000000:
            # We can only fit 1mb into memcache
            break
      
      if len(programs):
        broadcast.broadcastNewPrograms(channel, programs)
  
      memcache.set('programming', programming)

      channels = memcache.get('channels') or []
      updated = False
      for i,c in enumerate(channels):
        if c['id'] == channel_id:
          channels[i] = channel.toJson(get_programming=False)
          updated = True
      if not updated:
        channels.append(channel.toJson(get_programming=False))

      memcache.set('channels', channels)

    # Schedule our next programming selection
    if schedule_next and (not constants.SLEEP_PROGRAMMING or
                          (constants.SLEEP_PROGRAMMING and (kickoff or len(onlineUsers.keys())))):
      logging.info('NUMBER OF PROGRAMS: ' + str(len(programs)))
      if len(programs) > 1:
        next_gen = (programs[-2].time - datetime.datetime.now()).seconds / 2
      elif len(programs) == 1:
        next_gen = programs[0].media.duration / 2
      else:
        next_gen = 60
      next_gen = min(next_gen,
                     reduce(lambda x, y: x + y, [p.media.duration for p in programs], 0) \
                     if len(programs) else 10)
      next_gen = min(next_gen, duration / 2)
      logging.info('COUNTDOWN FOR ' + channel_id + ': ' + str(next_gen))
      deferred.defer(Programming.set_programming, channel_id, fetch_twitter=fetch_twitter,
                     _name=channel_id + '-' + str(uuid.uuid1()),
                     _countdown=next_gen,
                     _queue=queue)
    return programs
  
  @classmethod
  def add_program(self, channel, media, time):
    programming = memcache.get('programming') or {}
    program = Program.add_program(channel, media, time=time, min_time=time, max_time=(time + datetime.timedelta(media.duration + 50)))
    logging.info(program)
    if program:
      if not programming.get(channel.id, None):
        programming[channel.id] = []
      programming.get(channel.id).append(program.toJson(fetch_channel=False, fetch_media=True, media_desc=False, pub_desc=False))

    memcache.set('programming', programming)

  @classmethod
  def set_user_channel_programs(self, key, channel, medias, time=None, reset=False):
    from model import Program

    programs = []
    programs_json = []
    channel_json = {}

    if not reset and memcache.get(channel.id):
      channel_json = memcache.get(channel.id) or {}
      programs_json = channel_json.get('programs', [])
    else:
      channel_json['channel'] = channel.toJson()

    next_time = time or datetime.datetime.now()
    if len(programs_json):
      next_time = iso8601.parse_date(programs_json[-1]['time']).replace(tzinfo=None) + \
        datetime.timedelta(seconds=programs_json[-1]['media']['duration'])
    for media in medias:
      program = Program.add_program(channel, media, time=next_time)
      if program:
        programs.append(program)
        programs_json.append(program.toJson(fetch_channel=False, fetch_media=True, media_desc=False, pub_desc=False))
        next_time = next_time + datetime.timedelta(seconds=media.duration)
        if len(pickle.dumps(programs_json)) > 1000000:
            # We can only fit 1mb into memcache
            break

    deferred.defer(Programming.fetch_related_tweets, medias,
                   _name='twitter-' + channel.id + '-' + str(uuid.uuid1()),
                   _queue='twitter')

    user_obj = memcache.get(key) or {}
    user_channels = (user_obj.get('channels') or []) if user_obj else []
    if not channel.id in user_channels:
      user_channels.append(channel.id)
      user_obj['channels'] = user_channels
      memcache.set(key, user_obj)
    channel_json['programs'] = programs_json
    memcache.set(channel.id, channel_json)
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
      f = 10
      g = 1
      h = .1
      i = 1
      score = a * float(media.host_views)/max_views \
            + b * len(media.seen) \
            + c * len(media.opt_in) \
            - d * len(media.opt_out) \
            + e * media.comment_count \
            + f * (0 if media.last_programmed else 1)/max_views \
            - g * (media.programmed_count or 0) \
            - h * (datetime.datetime.now() - media.published).days \
            + i * (media.like_count + media.dislike_count)
      score *= max_views
      return int(score)

    return sorted(medias, key=story_score, reverse=True)
  
  '''
    Our secret sauce sorting algorithm
  '''
  @classmethod
  def unique_publishers(cls, medias):
    if not len(medias):
      return medias
    
    publishers = {}
    unique_medias = []
    for media in medias:
      publisher = media.publisherMedias.get().publisher
      if not publishers.get(publisher.id):
        unique_medias.append(media)
        publishers[publisher.id] = True
    return unique_medias
  
  '''
    Subset of users who have seen the media item
  '''
  @classmethod
  def have_seen(cls, media, viewers):
    return [v for v in viewers if v in media.seen or v in media.opt_in
            or v in media.opt_out or v in media.started]

  '''
    Subset of past programs within 'cutoff' seconds from current time
  '''
  @classmethod
  def cutoff_programs(cls, programs, cutoff):
    # Cutoff in seconds, programs are json
    if not programs or not len(programs):
      return []
    cutoff_index = 0
    for p in programs:
      time = iso8601.parse_date(p['time']).replace(tzinfo=None)
      if (datetime.datetime.now() - time).seconds < cutoff or \
          (time + datetime.timedelta(seconds=p['media']['duration'])) > datetime.datetime.now():
        # Program started more than "cutoff" seconds ago and it ended before the current time.
        break
      cutoff_index += 1
    return programs[cutoff_index:]

  '''
    Amount of un-programmed time between now and duration
  '''
  @classmethod
  def gap(cls, programs, duration):
    scheduled = 0
    for program in programs:
      time = iso8601.parse_date(program['time']).replace(tzinfo=None)
      if time > datetime.datetime.now():
        logging.info(program['media']['name'] + ' at: ' + program['time'])
        scheduled += int(program['media']['duration'])
    logging.info(scheduled)
    return max(0, duration - scheduled)

  '''
    Subset of programs starting after now and ending within 'duration' from now
  '''
  @classmethod
  def next_programs(cls, programs, duration, prelude=0):
    # duration in seconds, programs are json
    if not programs or not len(programs):
      return []
    index = 0
    start_index = None
    end_index = len(programs)
    for p in programs:
      time = iso8601.parse_date(p['time']).replace(tzinfo=None)
      if time > (datetime.datetime.now() - datetime.timedelta(seconds=prelude)) and \
          (time + datetime.timedelta(seconds=p['media']['duration']) < \
           (datetime.datetime.now() + datetime.timedelta(seconds=duration))):
        start_index = index if start_index is None else start_index
        end_index = index + 1
      index += 1
    start_index = start_index if start_index is not None else len(programs)
    return programs[start_index:end_index]


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
  def no_reprogram(cls, programs, medias):
    programmed_medias = {}
    for program in programs:
      programmed_medias[program['media']['id']] = True
    filtered_medias = []
    for media in medias:
      if not programmed_medias.get(media.id):
        filtered_medias.append(media)
    return filtered_medias


  @classmethod
  def remove_program(cls, channel_id, media):
    cached_programming = memcache.get('programming') or {}
    new_schedule = []
    sched = 0
    if cached_programming.get(channel_id):
      for program in cached_programming[channel_id]:
        time = iso8601.parse_date(program['time']).replace(tzinfo=None)
        if program['media']['id'] == media.id:
          sched += 1
          continue
        if sched:
          new_time = time - datetime.timedelta(seconds=(sched * media.duration))
          program['time'] = new_time.isoformat()
        new_schedule.append(program)
    channel = Channel.get_by_key_name(channel_id)
    channel.next_time = channel.next_time - datetime.timedelta(seconds=(sched * media.duration)) 
    channel.put()
    cached_programming[channel_id] = new_schedule
    memcache.set('programming', cached_programming)
    return new_schedule


  @classmethod
  def fetch_related_tweets(cls, medias):
    import constants
    from model import Tweet
    
    api = tweepy.API()
    total = 0
    for media in medias:
      if media.last_twitter_fetch and \
          (datetime.datetime.now() - media.last_twitter_fetch).seconds < 3600:
        continue

      try:
        tweets = tweepy.Cursor(api.search, q=media.host_id, rpp=100, result_type="recent",
                               include_entities=True, lang="en").items()
        for tweet in tweets:
          total += 1
          if not tweet.from_user.lower() in constants.TWITTER_USER_BLACKLIST and not \
              any(phrase in tweet.text.lower() for phrase in constants.TWITTER_PHRASE_BLACKLIST):
            Tweet.add_from_result(tweet, media)
        media.last_twitter_fetch = datetime.datetime.now()
        media.put()
        logging.info(str(total) + ' TWEETS FETCHED')
      except tweepy.TweepError, e:
        logging.info('query: ' + media.host_id + '\nreason: ' + e.reason + '\nresponse: ' + e.response)

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

  @classmethod
  def clear_channels(cls):
    channels = Channel.all().fetch(None)
    memcache.delete('channels')
    memcache.delete('programming')
    
    for c in channels:
      c.next_time = None
      c.put()
      chan_programs = c.programs.fetch(None)
      for cp in chan_programs:
        try:
          cp.program.delete()
        except:
          pass
        cp.delete()
        
  @classmethod
  def clear_programs(cls, cid=None, all=False):
    if cid:
      channel = Channel.get_by_key_name(cid)
      Programming.clear_channel(channel)
    elif all:
      Programming.clear()
    else:
      Programming.clear_channels()

  @classmethod
  def clear_channel(cls, c):
    c.next_time = None
    c.programming = []
    c.put()
    programming = memcache.get('programming') or {}
    programming[c.id] = []
    memcache.set('programming', programming)

    chan_programs = c.programs.fetch(None)
    for cp in chan_programs:
      try:
        cp.program.delete()
      except:
        pass
      cp.delete()

  @classmethod
  def clear_model(cls, model):
    channels = Channel.all().fetch(None)
    memcache.delete('channels')
    memcache.delete('programming')
    for c in channels:
      c.next_time = None
      c.programming = []
      c.put()
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
      Programming.set_programming(c.key().name(), queue='programming',
                                  fetch_twitter=(not constants.DEVELOPMENT))
    
  
app = webapp.WSGIApplication([('/_ah/start', StartHandler)], debug=True)
