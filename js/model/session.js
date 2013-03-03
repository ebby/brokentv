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
   */
  this.id = id;

	/**
	 * @type {brkn.model.User}
	 */
	this.user = user;
	
	/**
	 * @type {brkn.model.Channel}
	 */
	this.channel = channel;
	
	/**
	 * @type {goog.date.DateTime}
	 */
	this.tuneIn = tuneIn;
	
	/**
	 * @type {?goog.date.DateTime}
	 */
	this.tuneOut = opt_tuneOut || null;
	
	/**
	 * @type {Array.<brkn.model.Media>}
	 */
	this.medias = [];
};


/**
 * @param {brkn.model.Media} media
 */
brkn.model.Session.prototype.seen = function(media) {
  this.medias.push(media);
  if (this.channel.myChannel && this.channel.currentProgram) {
    this.channel.currentProgram.seek = null;
    this.channel.currentProgram = null;
  }
  
  goog.net.XhrIo.send(
      '/_seen',
      goog.functions.NULL(),
      'POST',
      'media_id=' + media.id +
      '&session_id=' + this.id +
      '&async=' + this.channel.myChannel);
};


/**
 * @param {goog.date.DateTime} time
 */
brkn.model.Session.prototype.end = function(time) {
  this.tuneOut = time;
  var seconds = (this.tuneOut.getTime() - this.tuneIn.getTime()) / 1000;
  brkn.model.Analytics.getInstance().endSession(this.channel, seconds, this.medias.length);
};
