import constants
import logging
import webapp2

from tweepy import OAuthHandler
from tweepy import Stream
from tweepy.streaming import StreamListener

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

class StreamHandler(StreamListener):
  """ A listener handles tweets are the received from the stream. 
  This is a basic listener that just prints received tweets to stdout.

  """
  def on_status(self, status):
    print 'ON STATUS: ' + str(status)
    return True

  def on_error(self, status):
    logging.error('ON ERROR:: ' + str(status))
    print status
    
  def on_timeout(self):
    """Called when stream connection times out"""
    logging.error('TIMED OUT')
    return
  
class StartHandler(webapp2.RequestHandler):
  def get(self):
#    auth = OAuthHandler(constants.TWITTER_CONSUMER_KEY, constants.TWITTER_CONSUMER_SECRET)
#    auth.set_access_token(constants.TWITTER_ACCESS_TOKEN, constants.TWITTER_TOKEN_SECRET)
#    stream = Stream(auth, StreamHandler())  
#    stream.filter(track=['youtube'], async=True)
    logging.info('TWITTER BACKEND STARTED')
    
  
app = webapp.WSGIApplication([('/_ah/start', StartHandler)], debug=True)

    
