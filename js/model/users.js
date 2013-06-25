goog.provide('brkn.model.Users');

goog.require('brkn.model.User');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Users = function() {
	goog.base(this);
	
	/**
	 * @type {Object.<string, brkn.model.User>}
	 */
	this.userMap = {};

	/**
   * @type {boolean}
   */
  this.friendsFetched_ = false;
  
  /**
   * @type {Array.<brkn.model.User>}
   */
  this.friends = [];
  
  /**
   * @type {Object.<string, string>}
   */
  this.facebookFriends = {};
	
	/**
   * @type {Array.<brkn.model.User>}
   */
  this.onlineFriends = [];
  
  this.subscribe(brkn.model.Users.Action.ONLINE, function(user, online) {
    user.online = online;
  }, this);
};
goog.inherits(brkn.model.Users, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Users);


/**
 * @type {brkn.model.User}
 */
brkn.model.Users.prototype.currentUser;


/**
 *  @param {?Object=} opt_user The user object
 */
brkn.model.Users.prototype.setCurrentUser = function(opt_user) {
	this.currentUser = opt_user ? this.get_or_add(opt_user) : new brkn.model.User(undefined, true);
	if (this.currentUser.loggedIn) {
  	FB.api('/me/permissions', goog.bind(function(response) {
      this.currentUser.hasFacebook = response['data'][0]['publish_stream'];
    }, this));
  	FB.api('/me/friends', goog.bind(function(response) {
  	  if (response && response['data']) {
        goog.array.forEach(response['data'], function(f) {
          if (!this.userMap[f['id']]) {
            this.userMap[f['id']] = new brkn.model.User({
              'id' : f['id'],
              'name' : f['name'],
              'temp' : true
            });
          }
        }, this);
  	  }
    }, this));
	}
};


/**
 * @param {brkn.model.User} user The user
 */
brkn.model.Users.prototype.add = function(user) {
	this.userMap[user.id] = user;
};


/**
 * @param {brkn.model.User} user The user
 */
brkn.model.Users.prototype.addOnline = function(user) {
  if (!goog.array.find(this.onlineFriends, function(u) {return u.id == user.id})) {
    this.onlineFriends.push(user);
  }
};


/**
 * @param {?Function=} opt_callback
 * @return {Array.<brkn.model.User>} The user
 */
brkn.model.Users.prototype.getFriends = function(opt_callback) {
  if (!this.friendsFetched_) {
    goog.net.XhrIo.send('/_friends', goog.bind(function(e) {
      var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
      this.friends = goog.array.map(response, function(u) {
        return this.get_or_add(u);
      }, this);
      this.friendsFetched_ = true;
      if (opt_callback) {
        opt_callback(this.friends);
      }
    }, this));
  } else if (opt_callback) {
    opt_callback(this.friends);
  }
  return this.friends;
};


/**
 * @return {brkn.model.User} The user
 */
brkn.model.Users.prototype.get = function(id) {
	return this.userMap[id];
};


/**
 * @param {Object} user The user object
 * @return {brkn.model.User} The user
 */
brkn.model.Users.prototype.get_or_add = function(user) {
	var u = this.get(user.id);
	if (!u || u.temp) {
		u = new brkn.model.User(user);
		this.add(u)
	}
	if (user['online'] == false && u.online == true) {
	  u.lastLogin = new goog.date.DateTime();
	}
	u.online = user['online'] || !!goog.array.find(this.onlineFriends, function(user) {
	  return user.id == u.id;
	}, this); // Update online presence
	u.currentMedia = user['last_seen'] ? brkn.model.Medias.getInstance().getOrAdd(user['last_seen']) :
	    u.currentMedia; // Update media
	return u;
};


/**
 * @param {string} query
 */
brkn.model.Users.prototype.search = function(query) {
  var users = goog.object.getValues(this.userMap);
  var results = goog.array.filter(users, function(u) {
    return u.name && goog.string.caseInsensitiveStartsWith(u.name, query);
  }, this);
  var fbFriends = goog.array.filter(goog.object.getValues(this.facebookFriends), function(f) {
    return goog.string.caseInsensitiveStartsWith(f, query);
  }, this);
  return results;
};


/**
 * @enum {string}
 */
brkn.model.Users.Action = {
  LOGGED_IN: 'logged-in',
  NEW_ACTIVITY: 'new-activity',
  NEW_MESSAGE: 'new-message',
  NEW_NOTIFICATION: 'new-notification',
  ONLINE: 'online'
};
