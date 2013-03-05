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

class UsersHandler(BaseHandler):
    def get(self, id=None):
      offset = self.request.get('offset') or 0
      if id:
        users = [User.get_by_key_name(id)]
        self.response.out.write(simplejson.dumps(user.toJson()))
      else:
        users = User.all().fetch(20, offset)
        self.response.out.write(simplejson.dumps([u.toJson(admin=True) for u in users]))

class AccessLevelHandler(BaseHandler):
    def post(self):
      user = User.get_by_key_name(self.request.get('uid'))
      access_level = int(self.request.get('level'))
      if user.access_level == 0 and access_level == 1:
        welcome_email = emailer.Email(emailer.Message.WELCOME)
        welcome_email.send(user)
      user.access_level = access_level
      user.put()
      self.response.out.write('')

class PositionThumbHandler(BaseHandler):
    def post(self):
      media = Media.get_by_key_name(self.request.get('media'))
      pos = int(self.request.get('pos'))
      media.thumb_pos = pos
      media.put()

class AdminAddProgramHandler(BaseHandler):
    def post(self):
      channel = Channel.get_by_key_name(self.request.get('channel'))
      media = Media.get_by_key_name(self.request.get('media'))
      program = Program.add_program(channel, media)
      self.response.out.write(simplejson.dumps(program.toJson(False)))
        
class AddToCollectionHandler(BaseHandler):
    def post(self, id):
      col = Collection.get_by_id(int(id))
      url = self.request.get('url')
      if col:
        response = {}
        parsed_url = urlparse.urlparse(url)
        host = parsed_url.hostname
        qs = urlparse.parse_qs(parsed_url.query)
        if 'list' in qs:
          response['type'] = 'playlist'
          playlist = Playlist.add_from_url(url)
          CollectionPlaylist.add(col, playlist)
          response['data'] = playlist.toJson()
        elif 'v' in qs:
          response['type'] = 'media'
          media = Media.add_from_url(url)
          cm = CollectionMedia.add(col, media)
          response['data'] = media.toJson()
        self.response.out.write(simplejson.dumps(response))

class CollectionsHandler(BaseHandler):
    def get(self, channel_id):
      channel = Channel.get_by_key_name(channel_id)
      cols = channel.collections.fetch(None)
      self.response.out.write(simplejson.dumps([cc.collection.toJson() for cc in cols]))
      
    def post(self):
      channel_id = self.request.get('cid')
      name = self.request.get('name')
      if channel_id and name:
        channel = Channel.get_by_key_name(channel_id)
        collection = Collection(name=name)
        collection.put()
        ChannelCollection.add(channel=channel, collection=collection)
        self.response.out.write(simplejson.dumps(collection.toJson()))
        
    def delete(self, id):
      if id:
        collection = Collection.get_by_id(int(id))
        for cm in collection.collectionMedias.fetch(None):
          cm.delete()
        for cp in collection.publishers.fetch(None):
          cp.delete()
        for cp in collection.playlists.fetch(None):
          cp.delete()
        for cc in collection.collections.fetch(None):
          cc.delete()
        for cc in collection.channels.fetch(None):
          cc.delete()
        for tcm in collection.topic_medias.fetch(None):
          tcm.delete()
        collection.delete()
        self.response.out.write(simplejson.dumps({'deleted': True}))

class TopicMediaHandler(BaseHandler):
    def get(self, channel_id):
      offset = self.request.get('offset') or 0

      channel = Channel.get_by_key_name(channel_id)
      cols = [cc.collection for cc in channel.collections.fetch(None)]
      topics = TopicCollectionMedia.get_for_collections(cols)
      self.response.out.write(simplejson.dumps(topics))
      
class CollectionMediaHandler(BaseHandler):
    def get(self, col_id):
      col = Collection.get_by_id(int(col_id))
      pending = self.request.get('pending') == '1'
      offset = self.request.get('offset') or 0
      res = {}
      medias = [m.toJson() for m in col.get_medias(20, pending=pending, offset=int(offset))]
      res['playlists'] = [p.toJson() for p in col.get_playlists()]
      res['medias'] = medias
      self.response.out.write(simplejson.dumps(res))
   
    def post(self):
      approve = self.request.get('approve') == 'true'
      col = Collection.get_by_id(int(self.request.get('col')))
      media = Media.get_by_key_name(self.request.get('media'))
      col_media = col.collectionMedias.filter('media =', media).get()
      tcms = TopicCollectionMedia.all().filter('collection_media =', col_media).fetch(None)
      if col_media and approve is not None:
        col_media.approve(approve)
        
class FetchHandler(BaseHandler):
    def post(self):
      if self.request.get('col_id'):
        col = Collection.get_by_id(int(self.request.get('col')))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user.id in col.admin:
          col.fetch(False)
      elif self.request.get('channel_id'):
        channel = Channel.get_by_key_name(self.request.get('channel_id'))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user in channel.admins.fetch(None):
          for cc in channel.collections.fetch(None):
            cc.collection.fetch(False)
            
class ProgramHandler(BaseHandler):
    def post(self):
      if self.request.get('channel_id'):
        channel = Channel.get_by_key_name(self.request.get('channel_id'))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user in channel.admins.fetch(None):
          Programming.set_programming(channel.id, queue='programming', fetch_twitter=(not constants.DEVELOPMENT))
        
class InitProgrammingHandler(BaseHandler):
    def get(self):
      if not self.current_user.id in constants.SUPER_ADMINS:
        return
      fetch = self.request.get('fetch') == 'true'
      Programming(fetch) # Do fetch if no media
      self.response.out.write('done')

class SetProgrammingHandler(BaseHandler):
    def get(self):
      if not self.current_user.id in constants.SUPER_ADMINS:
        return
      channel_name = self.request.get('channel')
      twitter = self.request.get('fetch') == 'true'
      duration = self.request.get('duration') or 600
      if channel_name:
        channels = Channel.all().filter('name =', channel_name).fetch(1)
      else:
        channels = Channel.get_public()
      for channel in channels:
        Programming.set_programming(channel.id, duration=int(duration), schedule_next=False,
                                    fetch_twitter=(not constants.DEVELOPMENT and twitter))
      self.response.out.write('done')

class ChannelsHandler(BaseHandler):
    def get(self):
      channels = []
      if self.current_user.id in SUPER_ADMINS:
        channels = Channel.all().fetch(None)
      else:
        channels = [ca.admin for ca in self.current_user.channels]
      self.response.out.write(simplejson.dumps([c.toJson() for c in channels if c.privacy == Privacy.PUBLIC]))
      
    def post(self):
      if self.current_user.id in SUPER_ADMINS and self.request.get('uid'):
        channel = Channel.get_by_key_name(self.request.get('channel_id'))
        admin = User.get_by_key_name(self.request.get('uid'))
        ca = ChannelAdmin(channel=channel, admin=admin)
        ca.put()
        self.response.out.write('done')
      elif self.current_user.id in SUPER_ADMINS:
        name = self.request.get('name')
        if name:
          channel = Channel.get_or_insert(key_name=Channel.make_key(name), name=name)
          if channel.online:
            Programming.set_programming(channel.id, queue='programming',
                                        fetch_twitter=(not constants.DEVELOPMENT))
          self.response.out.write(simplejson.dumps(channel.toJson()))
          
    def delete(self, id):
      if self.current_user.id in SUPER_ADMINS and id:
        channel = Channel.get_by_key_name(id)
        for cc in channel.collections.fetch(None):
          cc.delete()
        for cp in channel.programs.fetch(None):
          cp.delete()
        for session in UserSession.all().filter('channel =', channel).fetch(None):
          session.delete()
        channel.delete()
        self.response.out.write(simplejson.dumps({ 'deleted': True }))
          
class ChannelOnlineHandler(BaseHandler):
    def post(self, cid):
      channel = Channel.get_by_key_name(cid)
      if self.current_user.id in SUPER_ADMINS or self.current_user in channel.admins.fetch(None):
        channel.online = (self.request.get('online') == '1' or self.request.get('online') == 'true')
        channel.put()
        if channel.online:
            Programming.set_programming(channel.id, queue='programming',
                                        fetch_twitter=(not constants.DEVELOPMENT))
        self.response.out.write(simplejson.dumps(channel.toJson()))
        
class RemovePublisher(BaseHandler):
    def get(self, id):
      publisher = Publisher.get_by_key_name(id)
      if publisher:
        for pm in publisher.publisherMedias:
          pm.delete()
        publisher.delete()
      self.response.out.write('done')
      

class AdminRemoveProgramHandler(BaseHandler):
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      channel = program.channel;
      effected = program.remove()
      # Update memcache
      Program.get_current_programs([channel])
      broadcastProgramChanges(channel, effected)
      
class AdminRescheduleProgramHandler(BaseHandler):
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      new_time = datetime.datetime.fromtimestamp(float(self.request.get('time')))
      channel = program.channel;
      effected = program.reschedule(new_time)
      # Update memcache
      Program.get_current_programs([channel])
      #broadcastProgramChanges(channel, effected)