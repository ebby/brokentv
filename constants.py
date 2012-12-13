import os

CONFIG = {}
CONFIG['webapp2_extras.sessions'] = dict(secret_key='JHG234K5HG34JH5B3K4J53N4KJ5')

if os.environ['SERVER_SOFTWARE'].startswith('Development'):
  FACEBOOK_APP_ID = "164212930331128"
  FACEBOOK_APP_SECRET = "fd15a6f75af1cc786177f2c9e74f7424"
  JS_SOURCE = '//localhost:9810/compile?id=brokentv&mode=simple&pretty-print=true'
else :
  FACEBOOK_APP_ID = "256173547771720"
  FACEBOOK_APP_SECRET = "c6bb0c3c4e9fce5e938d70b48d274dad"
  JS_SOURCE = '/static/js/brkn-min.js'
