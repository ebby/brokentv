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
	 * @private
	 */
	this.id = user.id;
	
	/**
	 * @type {string}
	 * @private
	 */
	this.name = user.name;
	
	/**
	 * @type {string}
	 * @private
	 */
	this.picture = goog.string.subs('https://graph.facebook.com/%s/picture', this.id);
};
goog.inherits(brkn.model.User, goog.pubsub.PubSub);