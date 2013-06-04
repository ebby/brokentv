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
                                                   constants.facebook_app(self.request.host_url)['FACEBOOK_APP_ID'],
                                                   constants.facebook_app(self.request.host_url)['FACEBOOK_APP_SECRET'])
            if cookie:
                # Okay so user logged in 
                # Now, check to see if existing user
                graph = facebook.GraphAPI(cookie["access_token"])
                user = User.get_by_key_name(cookie["uid"])
                new_user = False
                user_number = 0
                if not user or user.temp:
                    new_user = True
                    # Not an existing user so get user info
                    profile = graph.get_object("me")
                    user = User(key_name=str(profile["id"]),
                        id=str(profile["id"]),
                        access_level=AccessLevel.WAITLIST,
                        name=profile["name"],
                        gender=profile.get("gender"),
                        email=profile.get("email"),
                        profile_url=profile["link"],
                        access_token=cookie["access_token"],
                        location=profile['location']['name'] \
                            if 'location' in profile else None)
                    user_number = Stat.add_user(user.gender)
                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]

                # Update friends graph
                friends = graph.get_connections("me", "friends")['data']
                user.friends = [f['id'] for f in friends]
                
                if Invite.get_by_key_name(user.id) or Invite.get_by_key_name(user.email):
                  # If they're invited
                  user.demo = True
                  user.access_level = AccessLevel.USER
                else:   
                  # Determine access level
                  if new_user and user_number < constants.INVITE_LIMIT():
                    if constants.INVITE_POLICY() == constants.InvitePolicy.NIGHTCLUB:
                      if (user.gender == 'female' and user.has_friend()) or \
                          (user.gender == 'male' and user.has_female_friend()):
                        user.access_level = AccessLevel.USER
                    if constants.INVITE_POLICY() == constants.InvitePolicy.HAS_FRIEND:
                      if user.has_friend():
                        user.access_level = AccessLevel.USER
                    if constants.INVITE_POLICY() == constants.InvitePolicy.ANYBODY:
                      user.access_level = AccessLevel.USER

                user.put()

                if new_user:
                  deferred.defer(util.update_following, user.id,
                                   _name='update-following-' + user.id + '-' + str(uuid.uuid1()))
                  if user.access_level == AccessLevel.USER:
                    user.send_invite()
                  else:
                    user.send_waitlist_email(user_number + 500)

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
