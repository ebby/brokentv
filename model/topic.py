from common import *

from media import Media
from collection import *

class Topic(db.Model):
  # KEY_NAME == FREEBASE_ID
  name = db.StringProperty()
  type_id = db.StringProperty()
  type = db.StringProperty()
  description = db.TextProperty()
  
  
  @property
  def id(self):
    return self.key().name()
  
  @classmethod
  def add(cls, id):
    topic = Topic.get_by_key_name(id)
    if not topic:
      topic_response = get_freebase_topic(id)
      properties = topic_response.get('property')
      if properties:
        description = ''
        if properties.get('/common/topic/article') and \
            properties['/common/topic/article']['values'][0]['property'].get('/common/document/text'):
          description = properties['/common/topic/article']['values'][0]['property'] \
                          ['/common/document/text']['values'][0]['value']
          
        topic = Topic(key_name=id,
                      name=properties['/type/object/name']['values'][0]['text'],
                      type=properties['/type/object/type']['values'][0]['text'],
                      type_id=properties['/type/object/type']['values'][0]['id'],
                      description=description)
        topic.put()
      else:
        topic = Topic(key_name=id)
        topic.put()
    return topic


'''
  ALL BELOW STRUCTURES ARE ONE-TO-MANY RELATIONSHIPS
'''
    
# Media with this topic
class TopicMedia(db.Model):
  topic = db.ReferenceProperty(Topic, collection_name='medias')
  media = db.ReferenceProperty(Media, collection_name='topics')
  
  @classmethod
  def add(cls, topic, media):
    topic_media = TopicMedia.get_or_insert(topic.id + media.id,
                                           topic=topic,
                                           media=media) 
    return topic_media
  
# Media with this topic
class TopicCollectionMedia(db.Model):
  topic = db.ReferenceProperty(Topic, collection_name='collection_medias')
  collection = db.ReferenceProperty(Collection, collection_name='topic_medias')
  media = db.ReferenceProperty(Media)
  approved = db.IntegerProperty(default=Approval.PENDING)
  
  @classmethod
  def get_for_collections(self, cols):
    topics = {}
    for col in cols:
      tcms = col.topic_medias.fetch(None)
      for tcm in tcms:
        media = tcm.media.toJson()
        media['collection_id'] = tcm.collection.id
        if not topics.get(tcm.topic.name):
          topics[tcm.topic.name] = [media]
        else:
          topics[tcm.topic.name] = topics.get(tcm.topic.name).append(media)
    return topics

  @classmethod
  def add(cls, topic, collection, media, approved=None):
    tcm = TopicCollectionMedia.get_or_insert(
        topic.id + str(collection.id) + media.id,
        topic=topic,
        collection=collection,
        media=media)
    
#      else:
#        Topic.incr_pending(collection.key())
    return tcm
  

