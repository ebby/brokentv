from common import *


#--------------------------------------
# ADMIN HANDLERS
#--------------------------------------

class AdminAddProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_id(int(self.request.get('channel')))
      media = Media.get_by_key_name(self.request.get('media'))
      program = Program.add_program(channel, media)
      self.response.out.write(simplejson.dumps(program.toJson(False)))

class AdminRemoveProgramHandler(BaseHandler):
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      channel = program.channel;
      effected = program.remove()
      broadcastProgramChanges(channel, effected)
      
class AdminRescheduleProgramHandler(BaseHandler):
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      new_time = datetime.datetime.fromtimestamp(float(self.request.get('time')))
      channel = program.channel;
      effected = program.reschedule(new_time)
      #broadcastProgramChanges(channel, effected)