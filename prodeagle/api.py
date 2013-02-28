from google.appengine.api import urlfetch

try:
  import json
except:
  import django.utils.simplejson as json 

from prodeagle import counter_names
from prodeagle import config

import urllib

class ProdEagleApiIncrement():
  def __init__(self):
    self.counters = {}
  
  def incr(self, name, delta, utc_datetime):
    if delta:
      slot = counter_names.getEpochRounded(utc_datetime)
      if name not in self.counters:
        self.counters[name] = {}
      if slot not in self.counters[name]:
        self.counters[name][slot] = 0
      self.counters[name][slot] += delta
  
  def commit(self, site, secret, api=config.SECURE_HOST + "/api/"):
    args = { "site" : site,
             "secret": secret,
             "counters": json.dumps(self.counters) }
    urlfetch.fetch(api + "write", payload=urllib.urlencode(args),
                   method=urlfetch.POST, deadline=60)
    self.counters = {}