from common import *

from media import Media

class Channel(db.Model):
  name = db.StringProperty()
  programming = db.StringListProperty()
  current_program = db.IntegerProperty()
  keywords = db.StringListProperty()

  @classmethod
  def get_all(cls):
    return Channel.all().fetch(100)

  def get_programming(self):
    return Program.all().filter('channel =', self).fetch(limit=100)

  def get_next_time(self):
    next_time = datetime.datetime.utcnow()
    if len(self.programming):
      last_program = Program.get_by_id(int(self.programming[-1]))
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
      channel.programming.append(str(program.key().id()))
      channel.put()
      return program

  def toJson(self, fetch_channel=True):
    json = {}
    json['id'] = self.key().id()
    json['media'] = self.media.toJson()
    json['time'] = self.time.isoformat() if self.time else None
    json['channel'] = self.channel.toJson() if fetch_channel else {'id': self.channel.key().id()}
    return json