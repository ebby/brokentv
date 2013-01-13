goog.provide('brkn.model.User');

goog.require('goog.pubsub.PubSub');




/**
 * @param {Object} user User object
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.User = function(user) {
	goog.base(this);

	/**
	 * @type {number}
	 */
	this.id = user.id;
	
	/**
	 * @type {string}
	 */
	this.name = user.name;
	
	/**
   * @type {brkn.model.Session}
   */
  this.currentSession;
	
	/**
	 * @type {string}
	 */
	this.picture = goog.string.subs('https://graph.facebook.com/%s/picture', this.id);
	
	/**
	 * Path color
	 * @type {string}
	 */
	this.color = Raphael.getColor();
	
	/**
   * @type {number}
   */
  this.accessLevel = user['access_level'];	
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.activities = []
};
goog.inherits(brkn.model.User, goog.pubsub.PubSub);


/**
 * @return {boolean}
 */
brkn.model.User.prototype.isAdmin = function() {
  return this.accessLevel == brkn.model.User.AccessLevel.ADMIN;
};

/**
 * @return {Array.<Object>}
 */
brkn.model.User.prototype.getActivities = function() {
  goog.array.sort(this.activities, function(a, b) {
    var aTime = goog.date.fromIsoString(a['time'] + 'Z'); 
    var bTime = goog.date.fromIsoString(b['time'] + 'Z');
    return aTime.getTime() <= bTime.getTime() ? 1 : -1;
  });
  return this.activities;
};


/**
 * @enum {number}
 */
brkn.model.User.AccessLevel = {
  WAITLIST: 0,
  USER: 1,
  ADMIN: 2
};