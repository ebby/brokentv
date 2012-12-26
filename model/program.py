from common import *

from channel import Channel
from media import Media

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