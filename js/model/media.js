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
   * @type {goog.date.DateTime}
   * @private
   */
  this.published = goog.date.fromIsoString(media['published'] + 'Z');

	/**
	 * @type {string}
	 * @private
	 */
	this.thumbnail = 'http://i.ytimg.com/vi/' + this.hostId + '/0.jpg';
	
	/**
   * @type {Array.<brkn.model.Comment>}
   * @private
   */
  this.comments = [];
  
  this.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment, this);
};
goog.inherits(brkn.model.Media, goog.pubsub.PubSub);


/**
 * @enum {string}
 */
brkn.model.Media.Actions = {
  ADD_COMMENT: 'add-comment'
};


/**
 * @param {brkn.model.Comment} comment
 */
brkn.model.Media.prototype.addComment = function(comment) {
  this.comments.push(comment);  
};
