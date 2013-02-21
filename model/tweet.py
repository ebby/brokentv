from common import *

from media import Media
from user import User

class Tweet(db.Model):
  id = db.IntegerProperty()
  media = db.ReferenceProperty(Media, collection_name='tweets')
  user = db.ReferenceProperty(User, collection_name='tweets')
  text = db.TextProperty()
  time = db.DateTimeProperty()
  handle = db.StringProperty()
  name = db.TextProperty()
  user_id = db.IntegerProperty()
  picture_url = db.StringProperty()
  picture_url_https = db.StringProperty()
  
  @classmethod
  def add_from_result(cls, result, media):
    user = User.get_by_twitter_id(result.from_user_id)
    return Tweet.get_or_insert(str(result.id),
                               id=result.id,
                               media=media,
                               user=user,
                               text=db.Text(result.text),
                               time=result.created_at,
                               handle=result.from_user,
                               name=result.from_user_name,
                               user_id=result.from_user_id,
                               picture_url=result.profile_image_url,
                               picture_url_https=result.profile_image_url_https)
    
  def to_json(self):
    json = {}
    json['text'] = self.text
    json['id'] = self.id
    json['handle'] = self.handle
    json['picture'] = self.picture_url
    json['time'] = self.time.isoformat()
    return json
