goog.provide('brkn.model.Media');

goog.require('goog.pubsub.PubSub');



/**
 * @param {Object} media Media object
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Media = function(media) {
	goog.base(this);

	/**
   * @type {string}
   * @private
   */
  this.id = media.id;

	/**
	 * @type {string}
	 * @private
	 */
	this.name = media.name;
	
	/**
	 * @type {string}
	 * @private
	 */
	this.host = 'youtube';
	
	/**
	 * @type {string}
	 * @private
	 */
	this.hostId = media['host_id'];

	/**
	 * @type {number}
	 * @private
	 */
	this.duration = media.duration;
	
	/**
   * @type {string}
   * @private
   */
  this.description = media.description;

	/**
	 * @type {string}
	 * @private
	 */
	this.thumbnail = goog.ui.media.YoutubeModel.getThumbnailUrl(this.hostId);
};
goog.inherits(brkn.model.Media, goog.pubsub.PubSub);

