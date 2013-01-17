import webapp2
import logging

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

class StartHandler(webapp2.RequestHandler):
  def get(self):
    logging.info('YOUTUBE BACKEND STARTED')
    
  
app = webapp.WSGIApplication([('/_ah/start', StartHandler)], debug=True)