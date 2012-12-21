from common import *

from media import Media

class Channel(db.Model):
  name = db.StringProperty()
  current_program = db.IntegerProperty()
  keywords = db.StringListProperty()

  @classmethod
  def get_all(cls):
    return Channel.all().fetch(100)

  def get_programming(self):
    channel_programs = ChannelProgram.all().filter('channel =', self).order('-time').fetch(limit=100)
    return [c_p.program for c_p in channel_programs]

  def get_next_time(self):
    next_time = datetime.datetime.utcnow()
    programming = self.get_programming()
    if len(programming):
      last_program = programming[0]
      next_time = last_program.time + datetime.timedelta(seconds=last_program.media.duration)
    return max(datetime.datetime.utcnow(), next_time)

  def toJson(self):
    json = {}
    json['id'] = self.key().id()
    json['name'] = self.name
    json['programming'] = [p.toJson(False) for p in self.get_programming()]
    json['current_program'] = Program.get_by_id(self.current_program).toJson(False) if self.current_program else None
    return json
  
class Program(db.Model):
  media = db.ReferenceProperty(Media)
  channel = db.ReferenceProperty(Channel)
  time = db.DateTimeProperty()

  @classmethod
  def get_current_programs(cls):
    cutoff = datetime.datetime.now() - datetime.timedelta(hours=9)
    return Program.all().filter('time >', cutoff).order('time').fetch(100)

  @classmethod
  def add_program(cls, channel, media):
    if media:
      program = Program(media=media,
                        channel=channel,
                        time=channel.get_next_time())
      program.put()
      
      channelProgram = ChannelProgram(channel=channel, program=program, time=program.time)
      channelProgram.put()
      return program

  def remove(self):
    effected = Program.all().filter('channel =', self.channel).filter('time >', self.time) \
        .order('time').fetch(100);
    for program in effected:
      program.time = program.time - datetime.timedelta(seconds=self.media.duration)
      program.put()
    c_p = ChannelProgram.all().filter('program =', self).get()
    self.delete()
    c_p.delete()
    return effected
  def toJson(self, fetch_channel=True):
    json = {}
    json['id'] = self.key().id()
    json['media'] = self.media.toJson()
    json['time'] = self.time.isoformat() if self.time else None
    json['channel'] = self.channel.toJson() if fetch_channel else {'id': self.channel.key().id()}
    return json

class ChannelProgram(db.Model):
  channel = db.ReferenceProperty(Channel, collection_name='channelPrograms')
  program = db.ReferenceProperty(Program, collection_name='channelPrograms')
  time = db.DateTimeProperty()
