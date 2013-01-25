from common import *

from channel import Channel
from media import Media

from google.appengine.ext import deferred

class Program(db.Model):
  media = db.ReferenceProperty(Media)
  channel = db.ReferenceProperty(Channel)
  time = db.DateTimeProperty()

  @classmethod
  def get_current_programs(cls, channels):    
    cutoff = datetime.datetime.now() - datetime.timedelta(hours=1)
    programming = simplejson.loads(memcache.get('programming') or '{}')

    for channel in channels:
      programs = [x.program for x in
                  channel.channelPrograms.filter('time >', cutoff).order('time').fetch(None)]
      
      programming[channel.id] = [p.toJson(fetch_channel=False, media_desc=False) for p in programs]

    memcache.set('programming', simplejson.dumps(programming))
    return programming
  
  @classmethod
  @db.transactional
  def atomic_add(cls, media, channel):
    program = Program(media=media, channel=channel,
                      time=channel.get_next_time().replace(microsecond=0))
    program.put()
    return program
      
  @classmethod
  def add_program(cls, channel, media):
    if media:
      # Microseconds break equalities when passing datetimes between front/backend
      program = Program.atomic_add(media=media, channel=channel)

      channelProgram = ChannelProgram(channel=channel, program=program, time=program.time)
      channelProgram.put()
      
      channel.next_time = program.time + datetime.timedelta(seconds=program.media.duration)
      channel.put()
      
      media.last_programmed = datetime.datetime.now()
      media.programmed_count += 1
      media.put()

      return program

  def remove(self):
    effected = Program.all().filter('channel =', self.channel).filter('time >', self.time) \
        .order('time').fetch(100)
    for program in effected:
      program.time = program.time - datetime.timedelta(seconds=self.media.duration)
      program.put()
    c_p = ChannelProgram.all().filter('program =', self).get()
    self.delete()
    c_p.delete()
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
  
  def toJson(self, fetch_channel=True, fetch_media=True, media_desc=True):
    json = {}
    json['id'] = self.key().id()
    json['media'] = self.media.toJson(media_desc) if fetch_media else self.media.key().name()
    json['time'] = self.time.isoformat() if self.time else None
    json['channel'] = self.channel.toJson() if fetch_channel else {'id': self.channel.id}
    return json

class ChannelProgram(db.Model):
  channel = db.ReferenceProperty(Channel, collection_name='channelPrograms')
  program = db.ReferenceProperty(Program, collection_name='channelPrograms')
  time = db.DateTimeProperty()