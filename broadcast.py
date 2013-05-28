import constants
import emailer
import simplejson
import types
import logging
import uuid

from google.appengine.api import channel as webchannel
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext import deferred

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
    

def broadcastNotification(n):
  response = {}
  response['type'] = 'notification'
  response['notification'] = n.to_json()
  channels = memcache.get('web_channels') or {}
  if n.user.id in channels:
    webchannel.send_message(n.user.id, simplejson.dumps(response))
  else:
    user_obj = memcache.get(n.user.id) or {}
    outbox = user_obj.get('outbox', [])
    outbox.insert(0, response)
    user_obj['outbox'] = outbox
    memcache.set(n.user.id, user_obj)
    deferred.defer(email_outbox, n.user.id,
                   _name='email-outbox-' + n.user.id + '-' + str(uuid.uuid1()),
                   _countdown=600)
    

def broadcastNewComment(comment, tweet, to_user, host_url):
  response = {}
  response['type'] = 'new_comment'
  response['comment'] = comment.toJson()
  response['tweet'] = tweet.to_json() if tweet else ''
  channels = memcache.get('web_channels') or {}
  
  if to_user and to_user.id not in channels:
    user_obj = memcache.get(to_user.id) or {}
    outbox = user_obj.get('outbox', [])
    outbox.insert(0, response)
    user_obj['outbox'] = outbox
    memcache.set(to_user.id, user_obj)
    deferred.defer(email_outbox, to_user.id,
                   _name='email-outbox-' + to_user.id + '-' + str(uuid.uuid1()),
                   _countdown=600)

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
    user_obj = memcache.get(message.to_user.id) or {}
    outbox = user_obj.get('outbox', [])
    outbox.insert(0, response)
    user_obj['outbox'] = outbox
    memcache.set(message.to_user.id, user_obj)
    deferred.defer(email_outbox, message.to_user.id,
                   _name='email-outbox-' + message.to_user.id + '-' + str(uuid.uuid1()),
                   _countdown=600)

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
    
def email_outbox(user_id):
  from model import User
  from model import Comment
  
  user_obj = memcache.get(user_id) or {}
  outbox = user_obj.get('outbox', [])
  if len(outbox):
    user = User.get_by_key_name(user_id)
    from_users = {}
    while len(outbox):
      msg = outbox.pop(0)
      if msg['type'] == 'new_message' and user.email_message != False \
          and from_users.get(msg['message']['from_user']['id']) != True:
        split = msg['message']['from_user']['name'].split(' ')
        first_name = split[0] if len(split) else msg['message']['from_user']['name']
        message_email = emailer.Email(emailer.Message.MESSAGE(first_name),
                                      {'first_name' : first_name,
                                       'name': msg['message']['from_user']['name'],
                                       'text': msg['message']['text'],
                                       'image': 'https://graph.facebook.com/%s/picture' % msg['message']['from_user']['id'],
                                       'link': 'http://www.xylocast.com'
                                      })
        message_email.send(user)
        from_users[msg['message']['from_user']['id']] = True

      if msg['type'] == 'new_comment' and user.email_reply != False:
        split = msg['comment']['user']['name'].split(' ')
        first_name = split[0] if len(split) else msg['comment']['user']['name']
        comment_email = emailer.Email(emailer.Message.COMMENT(first_name),
                                  {'first_name' : first_name,
                                   'name': msg['comment']['user']['name'],
                                   'link': msg['comment']['media']['link'],
                                   'text': Comment.flattenMentions(msg['comment']['text']),
                                   'title': msg['comment']['media']['name'],
                                   'image': 'http://i.ytimg.com/vi/%s/0.jpg' % msg['comment']['media']['host_id']
                                  })
        comment_email.send(user)
      if msg['type'] == 'notification' and user.email_mention != False:
        if msg['notification']['type'] == 'mention':
          split = msg['notification']['comment']['user']['name'].split(' ')
          first_name = split[0] if len(split) else msg['notification']['comment']['user']['name']
          mention_email = emailer.Email(emailer.Message.MENTION(first_name),
                                    {'first_name' : first_name,
                                     'name': msg['notification']['comment']['user']['name'],
                                     'link': msg['notification']['comment']['media']['link'],
                                     'text': Comment.flattenMentions(msg['notification']['comment']['text']),
                                     'title': msg['notification']['comment']['media']['name'],
                                     'image': 'http://i.ytimg.com/vi/%s/0.jpg' % msg['notification']['comment']['media']['host_id']
                                    })
          mention_email.send(user)
    del user_obj['outbox']
    memcache.set(user_id, user_obj)
          

    ''' FACEBOOK NOTIFICATIONS (REQUIRES SSL AND CANVAS APP)
    fetch = urlfetch.fetch(url='https://graph.facebook.com/%s/notifications' % to_user.id,
                        payload='access_token=%s&template=%s&href=%s' %
                        (constants.facebook_app(host_url)['APP_ACCESS_TOKEN'],
                         '@[' + to_user.id + ']' + ' replied to your comment',
                         comment.media.link),
                        method=urlfetch.POST)
    '''
