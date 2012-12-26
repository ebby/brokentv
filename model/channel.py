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

from program import *
