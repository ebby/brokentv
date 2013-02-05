import broadcast
import datetime
import facebook
import feedparser
import logging
import math
import oauth
import os.path
import re
import programming
import simplejson
import jinja2
import urlparse
import webapp2
import uuid

from constants import *

from google.appengine.api import channel as browserchannel
from google.appengine.api import images
from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.api import urlfetch

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util

from basehandler import BaseHandler
from model import *

def memcache_cas(key, op, *args):
  set = False
  client = memcache.Client()
  for i in range(3): # Retry loop
    data = client.gets(key) or {}
    data = op(data, *args)
    set = client.cas(key, data)
    if set:
       break
  if not set:
    memcache.set(key, data)
  return data