from common import *

from channel import Channel
from media import Media


class Program(db.Model):
  media = db.ReferenceProperty(Media)
  channel = db.ReferenceProperty(Channel)
  time = db.DateTimeProperty()
  async = db.BooleanProperty(default=False)
  seek = db.IntegerProperty(default=0)

  @classmethod
  def get_current_programs(cls, channels, limit=5):    
    cutoff = datetime.datetime.now() - datetime.timedelta(minutes=5)
    programming = memcache.get('programming') or {}

    for channel in channels:
      programs = [x.program for x in
                  channel.programs.filter('time >', cutoff).order('time').fetch(limit=limit)]
      
      programming[channel.id] = [p.toJson(fetch_channel=False, media_desc=False, pub_desc=False) \
                                 for p in programs]

    memcache.set('programming', programming)
    return programming

  @classmethod
  @db.transactional(xg=True)
  def atomic_add(cls, media, channel, time=None, min_time=None, max_time=None, async=False):
    program = None
    if not time:
      time = channel.next_time or datetime.datetime.now()
    if True: #async or min_time.replace(microsecond=0) <= channel.get_next_time().replace(microsecond=0) <= max_time.replace(microsecond=0):
      program = Program(media=media, channel=channel,
                        time=time,
                        async=async)
      program.put()
      channel.next_time = program.time + datetime.timedelta(seconds=program.media.duration)
      if async:
        channel.current_program = program.key().id()
        channel.current_media = media
        channel.seek = 0
      channel.put()
    return program

  @classmethod
  def add_program(cls, channel, media, time=None, async=False, min_time=None, max_time=None):

    # Microseconds break equalities when passing datetimes between front/backend
    program = Program.atomic_add(media=media, channel=channel, time=time, min_time=min_time,
                                 max_time=max_time, async=async)
    if program:
      channelProgram = ChannelProgram(channel=channel, program=program, time=program.time)
      channelProgram.put()

      media.last_programmed = program.time
      media.programmed_count += 1
      media.put()

    return program

  def remove(self):
    effected = Program.all().filter('channel =', self.channel).filter('time >', self.time) \
        .order('time').fetch(None)
    
    for program in effected:
      program.time = program.time - datetime.timedelta(seconds=self.media.duration)
      program.put()
    c_p = self.channelPrograms.get()
    c_p.delete()
    self.delete()
    return effected
  
  def reschedule(self, new_time):
    effected = Program.all().filter('channel =', self.channel).filter('time >=', min(self.time, new_time)) \
        .order('time').fetch(1000)
    for i, program in enumerate(effected):
      if program.key().id() == self.key().id():
        continue
      if self.time < program.time <= new_time:
        program.time = program.time - datetime.timedelta(seconds=self.media.duration)
        program.put()
      elif new_time <= program.time < self.time:
        program.time = program.time + datetime.timedelta(seconds=self.media.duration)
        program.put()
    self.time = new_time
    self.put()
    return effected
  
  def toJson(self, fetch_channel=True, fetch_media=True, media_desc=True, pub_desc=True):
    json = {}
    json['id'] = str(self.key().id()) # Send as string, JS integers have 32 bit limit
    json['media'] = self.media.toJson(get_desc=media_desc, pub_desc=pub_desc) if fetch_media else self.media.key().name()
    json['time'] = self.time.isoformat() if self.time else None
    json['channel'] = self.channel.toJson() if fetch_channel else {'id': self.channel.id}
    json['async'] = self.async or False
    json['seek'] = self.seek
    return json

class ChannelProgram(db.Model):
  channel = db.ReferenceProperty(Channel, collection_name='programs')
  program = db.ReferenceProperty(Program, collection_name='channelPrograms')
  time = db.DateTimeProperty()
