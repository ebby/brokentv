import constants
import datetime
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import iso8601
import logging
import simplejson
import urllib
import types
import re

from google.appengine.api import urlfetch
from google.appengine.ext import db

class AccessLevel:
  WAITLIST = 0
  USER = 1
  ADMIN = 2

class Privacy:
  PRIVATE = 0
  PUBLIC = 1
  FRIENDS = 2

class ActivityType:
  COMMENT = 'comment'
  SESSION = 'session'
  STARRED = 'starred'
  WATCHED = 'watched' # Streamed media by selection

class MediaType:
  VIDEO = 0
  PICTURE = 1

class MediaHost:
  YOUTUBE = 'youtube'
  
class MediaHostUrl:
  YOUTUBE = 'http://www.youtube.com/watch?v=%s'
  
  