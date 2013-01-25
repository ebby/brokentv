from common import *


#--------------------------------------
# ADMIN HANDLERS
#--------------------------------------

class FetchHandler(webapp2.RequestHandler):
  def get(self):
    logging.info(self.request.headers.keys())
    assert constants.DEVELOPMENT or self.request.headers['X-Appengine-Cron'], \
        'UNAUTHENTICATED CRON REQUEST'

    new_medias = []
    cols = Collection.all().fetch(None)
    for col in cols:
      col.fetch(True)
    logging.info('CRON FETCH STARTED')
  