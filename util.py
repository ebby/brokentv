from google.appengine.api import memcache

def cas(key, value):
  client = memcache.Client()
  while True: # Retry loop
    entity = client.gets(key)
    if client.cas(key, value):
       break