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
	 * @type {Object.<number, brkn.model.User>}
	 */
	this.userMap = {};
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
	return u;
};
