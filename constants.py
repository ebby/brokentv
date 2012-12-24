import os

CONFIG = {}
CONFIG['webapp2_extras.sessions'] = dict(secret_key='JHG234K5HG34JH5B3K4J53N4KJ5')

DEVELOPMENT = os.environ['SERVER_SOFTWARE'].startswith('Development')

if DEVELOPMENT:
  FACEBOOK_APP_ID = "164212930331128"
  FACEBOOK_APP_SECRET = "fd15a6f75af1cc786177f2c9e74f7424"
  JS_SOURCE = '//localhost:9810/compile?id=brokentv&mode=simple&pretty-print=true'
else :
  FACEBOOK_APP_ID = "131936020298013"
  FACEBOOK_APP_SECRET = "d69567a45ca1a5313c06c5b615555227"
  JS_SOURCE = '/static/js/brkn-min.js'
  CSS_SOURCE =  '/static/css/main.css'

class AccessLevel:
  WAITLIST = 0
  USER = 1
  ADMIN = 2