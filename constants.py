import os

CONFIG = {}
CONFIG['webapp2_extras.sessions'] = dict(secret_key='JHG234K5HG34JH5B3K4J53N4KJ5')

DEVELOPMENT = os.environ['SERVER_SOFTWARE'].startswith('Development')

SUPER_ADMINS = ['1240963']

SENDGRID = False

# Make prod app
TWITTER_CONSUMER_KEY = 'hiEtXnWvrHwBscT698zP3w'
TWITTER_CONSUMER_SECRET = 'bGY381qzadl7rlcYeKWW3pFLTcYAoIgQYT4awjxXOc'
TWITTER_ACCESS_TOKEN = '423216326-IuRUPJRwLtdPRW9a9etVSVZy5EuWHsjXo3a4BOBT'
TWITTER_TOKEN_SECRET = 'y02WSt6kTqhaB6kALBBp5B2fqu1KQLUpAYiUl7qs'
TWITTER_CALLBACK = 'http://local.broken.tv:8011/_twitter/callback'

TWITTER_USER_BLACKLIST = [
  'vodionews',
  'unlimitnews',
  'thevideotweets',
  'irishchronicle',
  'whonewz'                    
]

TWITTER_PHRASE_BLACKLIST = [
  'i liked a'                   
]

GDATA_KEY = 'AIzaSyCpfny9wZHLA9t6nIPEYonWc4Qkix5IEhw'
YOUTUBE_API_SERVICE_NAME = 'youtube'
YOUTUBE_API_VERSION = 'v3'
FREEBASE_API_SERVICE_NAME = 'freebase'
FREEBASE_API_VERSION = 'v1'

CSS_SOURCE =  '/static/css/main.css'
STATS_CSS_SOURCE =  '/static/css/stats.css'
ADMIN_CSS_SOURCE =  '/static/css/admin.css'

PROD_JS = '/static/js/brkn-min.js'
PROD_SIMPLE_JS = '/static/js/brkn-simple-min.js'
ADV_JS = '//localhost:9810/compile?id=brokentv&mode=advanced&pretty-print=true'
SIMPLE_JS = '//localhost:9810/compile?id=brokentv&mode=simple&pretty-print=true'

if DEVELOPMENT:
  FACEBOOK_APP_ID = "164212930331128"
  FACEBOOK_APP_SECRET = "fd15a6f75af1cc786177f2c9e74f7424"
  JS_SOURCE = SIMPLE_JS
  GDATA_CLIENT = '882797508644-e6cmb7g9pta07sbn0sajcrb7600hgd6n.apps.googleusercontent.com'
  CLIENT_SECRETS_FILE = "client_secrets_dev.json"
  STATS_JS_SOURCE = SIMPLE_JS
  ADMIN_JS_SOURCE = '//localhost:9810/compile?id=admin&mode=simple&pretty-print=true'
else :
  FACEBOOK_APP_ID = "131936020298013"
  FACEBOOK_APP_SECRET = "d69567a45ca1a5313c06c5b615555227"
  JS_SOURCE = PROD_JS
  SIMPLE_JS = PROD_SIMPLE_JS
  GDATA_CLIENT = '882797508644-8pm4lrn1h8dq0sfaabac3m6b6uismfav.apps.googleusercontent.com'
  CLIENT_SECRETS_FILE = "client_secrets_prod.json"
  STATS_JS_SOURCE = '/static/js/stats-min.js'
  ADMIN_JS_SOURCE = '/static/js/admin-min.js'

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
  
class Approval:
  APPROVED = 0
  REJECTED = 1
  PENDING = 2