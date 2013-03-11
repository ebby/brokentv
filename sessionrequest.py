import webapp2
import constants

from webapp2_extras import sessions

from model import *

class SessionRequest(webapp2.RequestHandler):
    def dispatch(self):
        """ This snippet of code is taken from the webapp2 framework documentation.
        See more at http://webapp-improved.appspot.com/api/webapp2_extras/sessions.html
        """
        self.session_store = sessions.get_store(request=self.request)
        try:
            webapp2.RequestHandler.dispatch(self)
        finally:
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        """ This snippet of code is taken from the webapp2 framework documentation.
        See more at http://webapp-improved.appspot.com/api/webapp2_extras/sessions.html
        """
        return self.session_store.get_session()