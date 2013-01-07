from common import *

from programming import Programming


#--------------------------------------
# ADMIN HANDLERS
#--------------------------------------

class StorySortHandler(BaseHandler):
    def get(self):
      name = self.request.get('col')
      sim = self.request.get('sim')
      offset = self.request.get('offset') or 0
      template_data = {}
      col = Collection.all().filter('name =', name or 'Top News Stories').get()
      medias = col.get_medias(limit=100, offset=offset)
      template_data['raw_medias'] = medias
      viewers = ['1240963', '13423', '2423', '23534']
      
      
      for i, m in enumerate(medias):
        m.seen_percent = int(float(len(m.seen))/len(viewers) * 100)
        if sim:
          # Mark a random set of medias seen, opt-in, opt-out:
          if i%2 == 0 and not '1240963' in m.seen:
            m.seen.append('1240963')
          if i%3 == 0 and not '1240963' in m.opt_in:
            m.opt_in.append('1240963')
          if i%5 == 0 and not '1240963' in m.opt_out:
            m.opt_out.append('1240963')
          if i%(len(medias)/2 - 1) == 0:
            m.comment_count = 10
        

      # Don't repeat the same program within an hour
      medias = [c for c in medias if not c.last_programmed or
                (datetime.datetime.now() - c.last_programmed).seconds > 3200]

      # At most, 30% of the audience has already seen this program
      medias = [m for m in medias if not len(viewers) or
               float(len(Programming.have_seen(m, viewers)))/len(viewers) < .3]
      
      # StorySort it
      sorted_medias = Programming.story_sort(medias)
      template_data['sorted_medias'] = sorted_medias
      
      path = os.path.join(os.path.dirname(__file__), '../templates/storysort.html')
      self.response.out.write(template.render(path, template_data))

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