goog.provide('brkn.model.Session');

goog.require('brkn.model.User');


/**
 * @param {brkn.model.User} user User
 * @param {brkn.model.Channel} channel Channel
 * @param {goog.date.DateTime} tuneIn Tune in time
 * @param {?goog.date.DateTime=} opt_tuneOut Tune out time
 * @constructor
 */
brkn.model.Session = function(user, channel, tuneIn, opt_tuneOut) {

	/**
	 * @type {brkn.model.User}
	 * @private
	 */
	this.user = user;
	
	/**
	 * @type {brkn.model.Channel}
	 * @private
	 */
	this.channel = channel;
	
	/**
	 * @type {goog.date.DateTime}
	 * @private
	 */
	this.tuneIn = tuneIn;
	
	/**
	 * @type {goog.date.DateTime}
	 * @private
	 */
	this.tuneOut = opt_tuneOut || null;
};