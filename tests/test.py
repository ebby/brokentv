import unittest
import uuid

from google.appengine.api import apiproxy_stub_map
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext import testbed

from helpers import *
from model import *
from model import common
from programming import Programming

class YoutubeTestCase(unittest.TestCase):
  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()
    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()
    # Next, declare which service stubs you want to use.
    self.testbed.init_datastore_v3_stub()
    self.testbed.init_taskqueue_stub(root_path='.', auto_task_running=True)
    self.testbed.init_logservice_stub()
    self.testbed.init_urlfetch_stub()
    self.testbed.init_memcache_stub()
    
    self.taskqueue_stub = apiproxy_stub_map.apiproxy.GetStub('taskqueue')

  def testFetchVideo(self):
    collection = Collection(name='Test')
    collection.put()
    medias = add_video(collection)
    self.assertEqual(len(medias), 1)
    media = medias[0]
    self.assertEqual(media.name, 'Swedish House Mafia - Don\'t You Worry Child ft. John Martin')

    collection_medias = collection.get_medias(10)
    self.assertEquals(len(collection_medias), 1)

  def testFetchFeed(self):
    collection = Collection(name='Test',
                            feed_id='most_popular',
                            feed_categories=['News'])
    collection.put()
    collection.fetch()
    
    tasks = self.taskqueue_stub.GetTasks('youtube')
    self.taskqueue_stub.GetTasks('youtube')
    self.assertEqual(len(tasks), 1)
    run_tasks_shallow(self.taskqueue_stub, 'youtube')

    self.assertTrue(len(collection.get_medias(10, pending=True)) > 0)
    self.assertTrue(len(collection.get_medias(10, pending=False)) == 0)

    collection_medias = collection.collectionMedias.fetch(None)
    for cm in collection_medias:
      self.assertTrue(cm.approved == Approval.PENDING)


  def tearDown(self):
    self.testbed.deactivate()
    
    
class ProgrammingTestCase(unittest.TestCase):
  def setUp(self):
    # First, create an instance of the Testbed class.
    self.testbed = testbed.Testbed()
    # Then activate the testbed, which prepares the service stubs for use.
    self.testbed.activate()
    # Next, declare which service stubs you want to use.
    self.testbed.init_datastore_v3_stub()
    self.testbed.init_taskqueue_stub(root_path='.', auto_task_running=True)
    self.testbed.init_logservice_stub()
    self.testbed.init_urlfetch_stub()
    self.testbed.init_memcache_stub()
    
    self.taskqueue_stub = apiproxy_stub_map.apiproxy.GetStub('taskqueue')
    
  def testNextPrograms(self):
    programming = memcache.get('programming') or {}

    channel = Channel(name='test')
    channel.put()
    duration = 1200
    self.assertEquals(len(Programming.next_programs(programming.get(channel.id), duration, prelude=120)), 0)

  def testSetProgramming(self):
    collection = Collection(name='test')
    collection.put()
    media1 = fake_video(collection, 100)
    media2 = fake_video(collection, 360)
    
    channel = Channel.add('test')
    ChannelCollection.add(channel=channel, collection=collection)

    duration = media1[0].duration + 5
    programs = Programming.set_programming(channel.id, duration=duration)    
    self.assertEquals(len(programs), 1)
    self.assertEquals(programs[0].media.last_programmed, programs[0].time)
    self.assertEquals(programs[0].media.id, media2[0].id)

    # Check memcache
    programming = memcache.get('programming') or {}
    next_programs = Programming.next_programs(programming.get(channel.id), duration=1200, prelude=120)
    self.assertEquals(len(next_programs), 1)

    # Schedule second program
    memcache.set('programming', []) # Sidestep next_program check
    programs = Programming.set_programming(channel.id, duration=1200)
    self.assertEquals(len(programs), 1)
    self.assertEquals(programs[0].media.id, media1[0].id)
    
    
    
    # Clear memcache
    memcache.set('programming', [])
    print programs[0].media.last_programmed
    programs = Programming.set_programming(channel.id)
    print programs[0].time
    


  def tearDown(self):
    self.testbed.deactivate()
    
def fake_video(collection, duration):
  video_id = str(uuid.uuid1())
  publisher = Publisher.add(MediaHost.YOUTUBE, str(uuid.uuid1()))

  media = Media(key_name='youtube' + video_id,
                name='Fake Video',
                host_id=video_id,
                duration=float(duration),
                published=datetime.datetime.now())
  media.put()
  CollectionMedia.add(collection=collection, media=media, approved=True)
  PublisherMedia.add(publisher=publisher, media=media)
  return [media]

def add_video(collection):
  video_id = '1y6smkh6c-0'
  publisher = Publisher.add(MediaHost.YOUTUBE, 'SHMVEVO')

  youtube3 = get_youtube3_service()
  videos_response = youtube3.videos().list(
    id=video_id,
    part="id,snippet,topicDetails,contentDetails,statistics"
  ).execute()
  medias = Media.add_from_snippet(videos_response.get("items", []),
                                  collection=collection,
                                  publisher=publisher,
                                  enforce_category=len(collection.categories) > 0,
                                  approve=True)
  return medias
  

if __name__ == '__main__':
    unittest.main()
    