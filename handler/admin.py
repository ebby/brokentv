from common import *

from programming import Programming


#--------------------------------------
# ADMIN HANDLERS
#--------------------------------------

class StorySortHandler(BaseHandler):
    def get(self):
      name = self.request.get('channel')
      sim = self.request.get('sim')
      pending = self.request.get('pending') == '1' or False
      offset = int(self.request.get('offset')) if self.request.get('offset') else 0
      template_data = {}
      
      channel = Channel.all().filter('name =', name or 'Broken News').get()
      cols = channel.get_collections()
      medias = []
      for col in cols:
        medias += col.get_medias(limit=100, offset=offset, pending=pending)
      template_data['raw_medias'] = medias
      viewers = ['1240963']
      
      
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
            
      for media in medias:
        media.have_seen = Programming.have_seen(media, viewers)
        

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

class PositionThumbHandler(BaseHandler):
    def post(self):
      media = Media.get_by_key_name(self.request.get('media'))
      pos = int(self.request.get('pos'))
      media.thumb_pos = pos
      media.put()

class AdminAddProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_id(int(self.request.get('channel')))
      media = Media.get_by_key_name(self.request.get('media'))
      program = Program.add_program(channel, media)
      self.response.out.write(simplejson.dumps(program.toJson(False)))
     
      
class AddToCollectionHandler(BaseHandler):
    def post(self, id):
      col = Collection.get_by_id(int(id))
      url = self.request.get('url')
      if col:
        response = {}
        logging.info(url)
        parsed_url = urlparse.urlparse(url)
        host = parsed_url.hostname
        qs = urlparse.parse_qs(parsed_url.query)
        logging.info(qs)
        if 'list' in qs:
          response['type'] = 'playlist'
          playlist = Playlist.add_from_url(url)
          CollectionPlaylist.add(col, playlist)
          response['data'] = playlist.toJson()
        elif 'v' in qs:
          response['type'] = 'media'
          media = Media.add_from_url(url)
          cm = CollectionMedia.add(col, media)
          logging.info(cm)
          response['data'] = media.toJson()
        self.response.out.write(simplejson.dumps(response))

class CollectionsHandler(BaseHandler):
    def get(self):
      if (self.current_user.id in constants.SUPER_ADMINS):
        cols = Collection.all().fetch(100)
      else:
        cols = Collection.all().filter('admins =', self.current_user.id).fetch(100)
      self.response.out.write(simplejson.dumps([c.toJson() for c in cols]))
      
class CollectionMediaHandler(BaseHandler):
    def get(self, col_id):
      col = Collection.get_by_id(int(col_id))
      pending = self.request.get('pending') == '1'
      offset = self.request.get('offset') or 0
      logging.info(offset);
      res = {}
      res['medias'] = [m.toJson() for m in col.get_medias(20, pending=pending, offset=int(offset))]
      res['playlists'] = [p.toJson() for p in col.get_playlists()]
      self.response.out.write(simplejson.dumps(res))
   
    def post(self):
      approve = self.request.get('approve') == 'true'
      col = Collection.get_by_id(int(self.request.get('col')))
      media = Media.get_by_key_name(self.request.get('media'))
      col_media = col.collectionMedias.filter('media =', media).get()
      if col_media and approve is not None:
        col_media.approve(approve)

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