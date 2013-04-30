import constants
import emailer
import simplejson
import types
import logging

from google.appengine.api import channel as webchannel
from google.appengine.api import memcache
from google.appengine.api import urlfetch

from model import *

#--------------------------------------
# CHANNEL HELPERS
#--------------------------------------

def broadcastViewerChange(user, last_channel_id, channel_id, session_id, time, media=None, online=True):
  response = {}
  response['type'] = 'viewer_change'
  response['user'] = user.toJson()
  response['last_channel_id'] = last_channel_id
  response['channel_id'] = channel_id
  response['time'] = time
  response['session_id'] = session_id
  response['online'] = online
  response['media'] = media.toJson(get_desc=False, pub_desc=False) if media else None
  channels = memcache.get('web_channels') or {}
  for client in channels.iterkeys():
    if client in user.friends:
      webchannel.send_message(client, simplejson.dumps(response))
    
def broadcastNewComment(comment, tweet, to_user, host_url):
  response = {}
  response['type'] = 'new_comment'
  response['comment'] = comment.toJson()
  response['tweet'] = tweet.to_json() if tweet else ''
  channels = memcache.get('web_channels') or {}
  if to_user and to_user.id not in channels:
    
    ''' FACEBOOK NOTIFICATIONS (REQUIRES SSL AND CANVAS APP)
    fetch = urlfetch.fetch(url='https://graph.facebook.com/%s/notifications' % to_user.id,
                        payload='access_token=%s&template=%s&href=%s' %
                        (constants.facebook_app(host_url)['APP_ACCESS_TOKEN'],
                         '@[' + to_user.id + ']' + ' replied to your comment',
                         comment.media.link),
                        method=urlfetch.POST)
    '''

    if to_user.email_reply != False:
      comment_email = emailer.Email(emailer.Message.COMMENT(comment.user.first_name),
                                    {'first_name' : comment.user.first_name,
                                     'name': comment.user.name,
                                     'link': comment.media.link,
                                     'image': comment.media.thumb
                                    })
      comment_email.send(to_user)
      
  logging.info('shoudl broadcast reply')
      
  for client in channels.iterkeys():
    if (comment.parent_comment and client in comment.user.friends) or (client in comment.acl) or \
        (to_user and client == to_user.id):
      webchannel.send_message(client, simplejson.dumps(response))

def broadcastNewMessage(message):
  response = {}
  response['type'] = 'new_message'
  response['message'] = message.toJson()
  channels = memcache.get('web_channels') or {}
  if message.to_user.id not in channels:
    
    ''' FACEBOOK NOTIFICATIONS (REQUIRES SSL AND CANVAS APP)
    fetch = urlfetch.fetch(url='https://graph.facebook.com/%s/notifications' % to_user.id,
                        payload='access_token=%s&template=%s&href=%s' %
                        (constants.facebook_app(host_url)['APP_ACCESS_TOKEN'],
                         '@[' + to_user.id + ']' + ' replied to your comment',
                         comment.media.link),
                        method=urlfetch.POST)
    '''

    if message.to_user.email_message != False:
      message_email = emailer.Email(emailer.Message.MESSAGE(message.from_user.first_name),
                                    {'first_name' : message.from_user.first_name,
                                     'name': message.from_user.name,
                                     'image': message.from_user.thumbnail,
                                     'link': 'http://www.xylocast.com'
                                    })
      message_email.send(message.to_user)
  else:
     webchannel.send_message(message.to_user.id, simplejson.dumps(response))
    
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
    
def broadcastNewPrograms(channel, programs, new_channel=False, to_owner=True):
  programs = programs if isinstance(programs, types.ListType) else [programs]

  response = {}
  response['type'] = 'new_programs'
  response['channel_id'] = channel.id
  response['channel'] = channel.toJson() if new_channel else None
  response['programs'] = [p.toJson(False) for p in programs]
  channels = memcache.get('web_channels') or {}
  
  if channel.privacy != constants.Privacy.PUBLIC and to_owner:
    if channel.user.id in channels.iterkeys():
      webchannel.send_message(channels.get(channel.user.id), simplejson.dumps(response))
  
  if channel.privacy == constants.Privacy.FRIENDS:
    for fid in channel.user.friends:
      if fid in channels.iterkeys():
        webchannel.send_message(channels.get(fid), simplejson.dumps(response))
  
  if channel.privacy == constants.Privacy.PUBLIC:
    for client in channels.iterkeys():
      webchannel.send_message(channels.get(client), simplejson.dumps(response))
    
def broadcastTwitterAuth(user):
  response = {}
  response['type'] = 'twitter_auth'
  response['success'] = True
  channels = memcache.get('web_channels') or {}
  if user.id in channels.iterkeys():
    webchannel.send_message(user.id, simplejson.dumps(response))
