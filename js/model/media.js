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
	this.id = media.id;

	/**
	 * @type {number}
	 * @private
	 */
	this.duration = media.duration;

	/**
	 * @type {string}
	 * @private
	 */
	this.thumbnail = goog.ui.media.YoutubeModel.getThumbnailUrl(this.id);
};
goog.inherits(brkn.model.Media, goog.pubsub.PubSub);

