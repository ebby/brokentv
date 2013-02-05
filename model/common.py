import broadcast
import constants
import datetime
import gdata.youtube
import gdata.youtube.service
import gdata.alt.appengine
import iso8601
import logging
import simplejson
import urllib
import urlparse
import types
import re
import uuid

from apiclient.discovery import build
from constants import *
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext import db
from google.appengine.ext import deferred


def get_youtube_service():
  yt_service = gdata.youtube.service.YouTubeService()
  gdata.alt.appengine.run_on_appengine(yt_service)
  yt_service.client_id = constants.GDATA_CLIENT
  yt_service.developer_key = constants.GDATA_KEY
  return yt_service

def get_youtube3_service():
  return build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,
               developerKey=GDATA_KEY)