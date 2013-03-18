from common import *

from programming import Programming


#--------------------------------------
# ADMIN HANDLERS
#--------------------------------------

class StorySortHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      name = self.request.get('channel')
      sim = self.request.get('sim')
      pending = self.request.get('pending') == '1' or False
      limit = int(self.request.get('limit')) if self.request.get('limit') else 100
      offset = int(self.request.get('offset')) if self.request.get('offset') else 0
      template_data = {}

      channel = Channel.all().filter('name =', name or 'Broken News').get()
      cols = channel.get_collections()
      medias = []
      for col in cols:
        medias += col.get_medias(limit=limit, offset=offset, pending=pending)
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
    @BaseHandler.super_admin
    def get(self, id=None):
      offset = self.request.get('offset') or 0
      if id:
        users = [User.get_by_key_name(id)]
        self.response.out.write(simplejson.dumps(user.toJson()))
      else:
        users = User.all().order('-created').fetch(50, offset)
        self.response.out.write(simplejson.dumps([u.toJson(admin=True) for u in users]))

class AccessLevelHandler(BaseHandler):
    @BaseHandler.super_admin
    def post(self):
      user = User.get_by_key_name(self.request.get('uid'))
      access_level = int(self.request.get('level'))
      if user.access_level == 0 and access_level == 1:
        welcome_email = emailer.Email(emailer.Message.WELCOME, {'name' : user.first_name})
        welcome_email.send(user)
      user.access_level = access_level
      user.put()
      self.response.out.write('')
      
class DemoHandler(BaseHandler):
    @BaseHandler.super_admin
    def post(self):
      user = User.get_by_key_name(self.request.get('uid'))
      demo = self.request.get('demo') == 'true'
      if user:
        user.demo = demo
        user.put()
      self.response.out.write('') 

class PositionThumbHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      media = Media.get_by_key_name(self.request.get('media'))
      pos = int(self.request.get('pos'))
      media.thumb_pos = pos
      media.put()

class AddProgramHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      channel = Channel.get_by_key_name(self.request.get('channel'))
      media = Media.get_by_key_name(self.request.get('media'))
      program = Program.add_program(channel, media)
      self.response.out.write(simplejson.dumps(program.toJson(False)))

class CategoriesHandler(BaseHandler):
    @BaseHandler.admin
    def get(self):
      cats = Category.get_all()
      self.response.out.write(simplejson.dumps([cat.to_json() for cat in cats]))

class AddToCollectionHandler(BaseHandler):
    @BaseHandler.admin
    def post(self, id):
      col = Collection.get_by_id(int(id))
      url = self.request.get('url')
      if col:
        response = {}
        parsed_url = urlparse.urlparse(url)
        host = parsed_url.hostname
        qs = urlparse.parse_qs(parsed_url.query)
        if 'user' in url:
          response['type'] = 'publisher'
          publisher = Publisher.add_from_url(url)
          if publisher:
            CollectionPublisher.add(col, publisher)
          response['data'] = publisher.toJson() if publisher else None
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

class EditCollectionHandler(BaseHandler):
    @BaseHandler.admin
    def post(self, id):
      col = Collection.get_by_id(int(id))
      cat_id = self.request.get('cat_id')
      feed_id = self.request.get('feed_id')
      feed_cat = self.request.get('feed_cat')
      enabled = self.request.get('enabled') == 'true'
      if cat_id:
        if enabled and cat_id not in col.categories:
          col.categories.append(cat_id)
        elif not enabled and cat_id in col.categories:
          col.categories.remove(cat_id)
        elif not enabled and not len(col.categories):
          all_cats = Category.get_all()
          for cat in all_cats:
            if cat.id != cat_id:
              col.categories.append(cat.id)
        col.put()
      if feed_id:
        col.feed_id = feed_id if enabled else None
        col.put()
      if feed_cat:
        if enabled:
          col.feed_categories.append(feed_cat)
        elif feed_cat in col.feed_categories:
          col.feed_categories.remove(feed_cat)
        col.put()
      self.response.out.write('')
      

class RemoveFromCollectionHandler(BaseHandler):
    @BaseHandler.admin
    def post(self, id):
      col = Collection.get_by_id(int(id))
      pub_id = self.request.get('pub_id')
      pl_id = self.request.get('pl_id')
      if col:
        if pub_id:
          publisher = Publisher.get_by_key_name(pub_id)
          cp = CollectionPublisher.all().filter('publisher =', publisher).get()
          if cp:
            cp.delete()
          cms = CollectionMedia.all().filter('publisher =', publisher).fetch(None)
          for cm in cms:
            cm.delete()
        if pl_id:
          playlist = Playlist.get_by_key_name(pub_id)
          cp = CollectionPlaylist.all().filter('playlist =', playlist).get()
          if cp:
            cp.delete()
      self.response.out.write('')

class CollectionsHandler(BaseHandler):
    @BaseHandler.admin
    def get(self, channel_id):
      channel = Channel.get_by_key_name(channel_id)
      cols = channel.collections.fetch(None)
      self.response.out.write(simplejson.dumps([cc.collection.toJson() for cc in cols]))
      
    @BaseHandler.admin
    def post(self):
      channel_id = self.request.get('cid')
      name = self.request.get('name')
      if channel_id and name:
        channel = Channel.get_by_key_name(channel_id)
        collection = Collection(name=name)
        collection.put()
        ChannelCollection.add(channel=channel, collection=collection)
        self.response.out.write(simplejson.dumps(collection.toJson()))

    @BaseHandler.admin  
    def delete(self, id):
      if id:
        deferred.defer(Collection.delete_all, id,
                       _name='delete-collection-' + str(id) + '-' + str(uuid.uuid1()),
                       _queue='youtube')
        self.response.out.write(simplejson.dumps({'deleted': True}))

class TopicMediaHandler(BaseHandler):
    @BaseHandler.admin
    def get(self, channel_id):
      offset = self.request.get('offset') or 0

      channel = Channel.get_by_key_name(channel_id)
      cols = [cc.collection for cc in channel.collections.fetch(None)]
      topics = TopicCollectionMedia.get_for_collections(cols)
      self.response.out.write(simplejson.dumps(topics))
      
class CollectionMediaHandler(BaseHandler):
    @BaseHandler.admin
    def get(self, col_id):
      col = Collection.get_by_id(int(col_id))
      pending = self.request.get('pending') == '1'
      offset = self.request.get('offset') or 0
      res = {}
      medias = [m.toJson() for m in col.get_medias(20, pending=pending, offset=int(offset))]
      res['categories'] = {
                           'categories' : col.categories,
                           'feed_id' : col.feed_id,
                           'feed_categories': col.feed_categories
                           }
      res['publishers'] = [p.toJson() for p in col.get_publishers()]
      res['playlists'] = [p.toJson() for p in col.get_playlists()]
      res['medias'] = medias
      self.response.out.write(simplejson.dumps(res))
   
    @BaseHandler.admin
    def post(self):
      approve = self.request.get('approve') == 'true'
      media = Media.get_by_key_name(self.request.get('media'))
      if self.request.get('col'):
        col = Collection.get_by_id(int(self.request.get('col')))
        col_media = col.collectionMedias.filter('media =', media).get()
        tcms = TopicCollectionMedia.all().filter('collection_media =', col_media).fetch(None)
        if col_media and approve is not None:
          col_media.approve(approve)
      else:
        col_medias = media.collectionMedias.fetch(None)
        for cm in col_medias:
          col_media = cm.collection.collectionMedias.filter('media =', media).get()
          tcms = TopicCollectionMedia.all().filter('collection_media =', col_media).fetch(None)
          if col_media and approve is not None:
            col_media.approve(approve)

class FetchHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      if self.request.get('col_id'):
        col = Collection.get_by_id(int(self.request.get('col')))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user.id in col.admin:
          col.fetch(constants.APPROVE_ALL)
      elif self.request.get('channel_id'):
        channel = Channel.get_by_key_name(self.request.get('channel_id'))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user in channel.admins.fetch(None):
          for cc in channel.collections.fetch(None):
            cc.collection.fetch(constants.APPROVE_ALL)
            
class ConstantsHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      self.response.out.write('To be implemented')

class ClearHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      cid = self.request.get('channel_id')
      all = self.request.get('all') == 'true'
      clear_programs(cid, all)
      # backup
      if cid:
        channel = Channel.get_by_key_name(cid)
        programming.Programming.clear_channel(channel)
      elif all:
        programming.Programming.clear()
      else:
        programming.Programming.clear_channels()
      self.response.out.write('Done')

def clear_programs(cls, cid=None, all=False):
  deferred.defer(programming.Programming.clear_programs, cid=cid, all=all,
                 _name='clear-channel-' + str(cid) + '-' + str(uuid.uuid1()),
                 _queue='youtube')

class ProgramHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      if self.request.get('channel_id'):
        channel = Channel.get_by_key_name(self.request.get('channel_id'))
        if self.current_user.id in constants.SUPER_ADMINS or self.current_user in channel.admins.fetch(None):
          Programming.set_programming(channel.id, queue='programming', schedule_next=False,
                                      fetch_twitter=(not constants.DEVELOPMENT))
        
class InitProgrammingHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      fetch = self.request.get('fetch') == 'true'
      Programming(fetch) # Do fetch if no media
      self.response.out.write('done')

class SetProgrammingHandler(BaseHandler):
    @BaseHandler.super_admin
    def get(self):
      channel_name = self.request.get('channel')
      twitter = self.request.get('fetch') == 'true'
      duration = self.request.get('duration') or 600
      if channel_name:
        channels = Channel.all().filter('name =', channel_name).fetch(1)
      else:
        channels = Channel.get_public()
      for channel in channels:
        Programming.set_programming(channel.id, duration=int(duration),
                                    fetch_twitter=(not constants.DEVELOPMENT and twitter))
      self.response.out.write('done')

class ChannelsHandler(BaseHandler):
    @BaseHandler.admin
    def get(self):
      channels = []
      if self.current_user.id in SUPER_ADMINS:
        channels = Channel.all().fetch(None)
      else:
        channels = [ca.admin for ca in self.current_user.channels]
      self.response.out.write(simplejson.dumps([c.toJson() for c in channels if c.privacy == Privacy.PUBLIC]))
    
    @BaseHandler.super_admin  
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
    
    @BaseHandler.super_admin    
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
    @BaseHandler.admin
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
    @BaseHandler.super_admin
    def get(self, id):
      publisher = Publisher.get_by_key_name(id)
      if publisher:
        for pm in publisher.publisherMedias:
          pm.delete()
        publisher.delete()
      self.response.out.write('done')
      

class RemoveProgramHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      channel = program.channel;
      effected = program.remove()
      # Update memcache
      Program.get_current_programs([channel])
      broadcastProgramChanges(channel, effected)
      
class RescheduleProgramHandler(BaseHandler):
    @BaseHandler.admin
    def post(self):
      program = Program.get_by_id(int(self.request.get('program')))
      new_time = datetime.datetime.fromtimestamp(float(self.request.get('time')))
      channel = program.channel;
      effected = program.reschedule(new_time)
      # Update memcache
      Program.get_current_programs([channel])
      #broadcastProgramChanges(channel, effected)