from google.appengine.api import memcache

def cas(key, value):
  client = memcache.Client()
  while True: # Retry loop
    entity = client.gets(key)
    if client.cas(key, value):
       break

def update_following(user_id):
  from model import User
  
  user = User.get_by_key_name(user_id)
  for fid in user.friends:
    friend = User.get_by_key_name(fid)
    if friend and not user_id in friend.following:
      friend.following.append(user_id)
      friend.put()

def update_waitlist(cls, user_id, channel_id):
  import constants
  from model import User

  if constants.INVITE_POLICY() != constants.InvitePolicy.NOBODY:
    user = User.get_by_key_name(user_id)
    for fid in user.friends:
      friend = User.get_by_key_name(fid)
      if friend and friend.access_level == constants.AccessLevel.WAITLIST:
        friend.grant_access(user, channel_id)

def schedule_youtube_channel(user_id, name, channel_id, yt_channel_id=None, yt_playlist_id=None):
  import broadcast
  import constants
  import programming
  
  from model import Media
  from model import Channel
  from model import User
  from model import common
  
  user = User.get_by_key_name(user_id)
  channel = Channel(key_name=user_id + '-' + (yt_channel_id or yt_playlist_id),
                    name=name, privacy=constants.Privacy.FRIENDS, online=True, user=user)
  medias = []
  youtube3 = common.get_youtube3_service()
  next_page_token = ''
  
  search_response = {}
  if yt_channel_id:
    if yt_channel_id.startswith('HC'):
      channel_response = youtube3.channels().list(
        id=yt_channel_id,
        part='topicDetails',
        maxResults=1
      ).execute()
      if len(channel_response.get('items', [])):
        topic_id = channel_response.get('items')[0]['topicDetails']['topicIds'][0]
        search_response = youtube3.search().list(
          topicId=topic_id,
          order='date',
          part='id,snippet',
          maxResults=10,
          fields='items',
          type='video'
        ).execute()
    else:   
      search_response = youtube3.search().list(
          channelId=yt_channel_id,
          part='id,snippet',
          order='date',
          maxResults=10,
          type='video'
        ).execute()
  elif yt_playlist_id:
    search_response = youtube3.playlistItems().list(
        playlistId=yt_playlist_id,
        part='id,snippet',
        maxResults=10,
        fields='items'
      ).execute()
  search_ids = ''
  for item in search_response.get('items', [])[1:]:
    if item['kind'] == 'youtube#searchResult':
      search_ids += item['id']['videoId'] + ','
    elif item['kind'] == 'youtube#playlistItem':
      search_ids += item['snippet']['resourceId']['videoId'] + ','
  videos_response = youtube3.videos().list(
    id=search_ids,
    part="id,snippet,topicDetails,contentDetails,statistics"
  ).execute()
  for item in videos_response.get("items", []):
    medias = Media.add_from_snippet([item], approve=True)
    programs = programming.Programming.set_user_channel_programs(user_id, channel, medias)
    broadcast.broadcastNewPrograms(channel, programs)