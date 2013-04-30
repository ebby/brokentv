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
 *  @param {Object} user The user object
 */
brkn.model.Users.prototype.setCurrentUser = function(user) {
	this.currentUser = this.get_or_add(user);
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
	if (!u) {
		u = new brkn.model.User(user);
		this.add(u)
	}
	u.online = user['online']; // Update online presence
	u.currentMedia = u.currentMedia || user['last_seen']; // Update media
	return u;
};


/**
 * @enum {string}
 */
brkn.model.Users.Action = {
  NEW_ACTIVITY: 'new-activity',
  NEW_MESSAGE: 'new-message',
  ONLINE: 'online'
};
