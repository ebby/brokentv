import webapp2
import constants
import facebook
import logging

from webapp2_extras import sessions

from model import *
from sessionrequest import SessionRequest

class BaseHandler(SessionRequest):
    """Provides access to the active Facebook user in self.current_user

    The property is lazy-loaded on first access, using the cookie saved
    by the Facebook JavaScript SDK to determine the user ID of the active
    user. See http://developers.facebook.com/docs/authentication/ for
    more information.
    """
    @property
    def current_user(self):
        if self.session.get("user") and User.get_by_key_name(self.session.get("user")['id']):
            # User is logged in
            return User.get_by_key_name(self.session.get("user")['id'])
        else:
            # Either used just logged in or just saw the first page
            # We'll see here 
            cookie = facebook.get_user_from_cookie(self.request.cookies,
                                                   constants.FACEBOOK_APP_ID,
                                                   constants.FACEBOOK_APP_SECRET)
            if cookie:
                # Okay so user logged in 
                # Now, check to see if existing user
                graph = facebook.GraphAPI(cookie["access_token"])
                user = User.get_by_key_name(cookie["uid"])
                if not user:
                    # Not an existing user so get user info
                    profile = graph.get_object("me")
                    user = User(key_name=str(profile["id"]),
                        id=str(profile["id"]),
                        access_level=(AccessLevel.ADMIN if constants.DEVELOPMENT else AccessLevel.WAITLIST),
                        name=profile["name"],
                        gender=profile.get("gender"),
                        email=profile.get("email"),
                        profile_url=profile["link"],
                        access_token=cookie["access_token"],
                        location=profile['location']['name'] \
                            if 'location' in profile else None)
                    user_number = Stat.add_user(user.gender)
                    waitlist_email = emailer.Email(emailer.Message.WAITLIST,
                                                   {'name' : user.first_name, 'waitlist' : user_number})
                    waitlist_email.send(user)
                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]
                
                # Update friends graph
                friends = graph.get_connections("me", "friends")['data']
                user.friends = [f['id'] for f in friends]
                user.put()
                
                # User is now logged in
                self.session["user"] = user.to_session()
                return user
        return None
    
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

    @staticmethod
    def logged_in(method):
        def check(handler, *args, **kwargs):
          if handler.current_user:
            return method(handler, *args, **kwargs)
          handler.error(401)
        return check

    @staticmethod
    def super_admin(method):
        def check(handler, *args, **kwargs):
          if handler.current_user and handler.current_user.id in constants.SUPER_ADMINS:
            return method(handler, *args, **kwargs)
          handler.error(401)
        return check
  
    @staticmethod 
    def admin(method):
        def check(handler, *args, **kwargs): 
          if handler.current_user and handler.current_user.id in constants.SUPER_ADMINS:
            return method(handler, *args, **kwargs)
          if handler.current_user.access_level == constants.AccessLevel.ADMIN:
            return method(handler, *args, **kwargs)
          handler.error(401)
        return check
