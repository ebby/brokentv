from common import *


#--------------------------------------
# CRON HANDLERS
#--------------------------------------

class FetchHandler(webapp2.RequestHandler):
  def get(self):
    logging.info(self.request.headers.keys())
    assert constants.DEVELOPMENT or self.request.headers['X-Appengine-Cron'], \
        'UNAUTHENTICATED CRON REQUEST'

    cols = Collection.all().fetch(None)
    for col in cols:
      col.fetch(constants.APPROVE_ALL)
    logging.info('CRON FETCH STARTED')

class SetProgrammingHandler(webapp2.RequestHandler):
  def get(self):
    channels = Channel.get_public()
    for c in channels:
      programming.Programming.set_programming(c.key().name(), queue='programming',
                                              schedule_next=False)
    