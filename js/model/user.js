goog.provide('brkn.model.User');

goog.require('goog.date');
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
	this.id = user['id'];
	
	/**
	 * @type {string}
	 */
	this.name = user['name'];
	
	/**
   * @type {string}
   */
  this.url = user['profile_url'];
  
  /**
   * @type {string}
   */
  this.location = user['location'] || '';

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
  this.activities = [];

  /**
   * @type {?goog.date.DateTime}
   */
  this.lastLogin = user['last_login'] ? goog.date.fromIsoString(user['last_login'] + 'Z') : null;

  /**
   * @type {number}
   */
  this.sessionCount = user['session_count'];
  
  /**
   * @type {number}
   */
  this.aveSession = user['ave_session'] ? user['ave_session'].toFixed(2) : null;
  
  /**
   * @type {boolean}
   */
  this.showGuide = user['show_guide'] != undefined ? user['show_guide'] : true;
  
  /**
   * @type {boolean}
   */
  this.showSidebar = user['show_sidebar'] != undefined ? user['show_sidebar'] : true;
  
  /**
   * @type {boolean}
   */
  this.postFacebook = user['post_facebook'] != undefined ? user['post_facebook'] : true;

  /**
   * @type {boolean}
   */
  this.postTwitter = user['post_twitter'] != undefined ? user['post_twitter'] : true;
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
 * @param {?boolean=} opt_time Show the time 
 * @return {string} Last login date as a readable string
 */
brkn.model.User.prototype.getLastLogin = function (opt_time) {
  if (!this.lastLogin) {
    return 'Never';
  }
  var date = (this.lastLogin.getMonth() + 1) + '/' + this.lastLogin.getDate() + '/' +
      this.lastLogin.getYear();
  return opt_time ? date + ' ' + this.lastLogin.toUsTimeString() : date
};


/**
 * @enum {number}
 */
brkn.model.User.AccessLevel = {
  WAITLIST: 0,
  USER: 1,
  ADMIN: 2
};