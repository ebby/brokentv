import simplejson
import types

from google.appengine.api import channel as webchannel
from google.appengine.api import memcache

#--------------------------------------
# CHANNEL HELPERS
#--------------------------------------

def broadcastViewerChange(user, last_channel_id, channel_id, session_id, time):
  response = {}
  response['type'] = 'viewer_change'
  response['user'] = user.toJson()
  response['last_channel_id'] = last_channel_id
  response['channel_id'] = channel_id
  response['time'] = time
  response['session_id'] = session_id
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    if client in user.friends:
      webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastNewComment(comment, tweet):
  response = {}
  response['type'] = 'new_comment'
  response['comment'] = comment.toJson()
  response['tweet'] = tweet.to_json() if tweet else ''
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    if client in comment.acl:
      webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastNewActivity(activity):
  response = {}
  response['type'] = 'new_activity'
  response['activity'] = activity.toJson()
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    if client in activity.acl or client == activity.user.id:
      webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastProgramChanges(channel_id, programs=None, cached_programs=None):
  response = {}
  response['type'] = 'update_programs'
  response['channel_id'] = channel_id
  if programs:
    response['programs'] = [p.toJson(False) for p in programs]
  elif cached_programs:
    response['programs'] = cached_programs
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastNewPrograms(channel, programs):
  programs = programs if isinstance(programs, types.ListType) else [programs]
  
  response = {}
  response['type'] = 'new_programs'
  response['channel_id'] = channel.id
  response['programs'] = [p.toJson(False) for p in programs]
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastTwitterAuth(user):
  response = {}
  response['type'] = 'twitter_auth'
  response['success'] = True
  channels = memcache.get('web_channels') or {}
  if user.id in channels.iterkeys():
    webchannel.send_message(user.id, simplejson.dumps(response))
