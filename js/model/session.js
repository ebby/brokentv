goog.provide('brkn.model.Session');

goog.require('brkn.model.User');


/**
 * @param {string} id Id
 * @param {brkn.model.User} user User
 * @param {brkn.model.Channel} channel Channel
 * @param {goog.date.DateTime} tuneIn Tune in time
 * @param {?goog.date.DateTime=} opt_tuneOut Tune out time
 * @constructor
 */
brkn.model.Session = function(id, user, channel, tuneIn, opt_tuneOut) {
  
  /**
   * @type {string}
   * @private
   */
  this.id = id;

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
	 * @type {?goog.date.DateTime}
	 * @private
	 */
	this.tuneOut = opt_tuneOut || null;
};