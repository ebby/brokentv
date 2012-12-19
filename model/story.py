from common import *

from media import Media
from publisher import Publisher
from channel import Channel


class Story(db.Model):
  name = db.StringProperty()
  keywords = db.StringListProperty(default=[])
  hashtags = db.StringListProperty(default=[])
  # Add related links

  def get_medias(self):
    return StoryMedia.all().filter('story =', self)


'''
  ALL BELOW STRUCTURES ARE ONE-TO-MANY RELATIONSHIPS
'''
    
# Media in this story
class StoryMedia(db.Model):
  story = db.ReferenceProperty(Story)
  media = db.ReferenceProperty(Media)
  
  @classmethod
  def add(cls, story, media):
    story_media = StoryMedia.all().filter('media =', media).get()
    if not story_media:
      story_media = StoryMedia(story=story, media=media)
      story_media.put()
    return story_media
