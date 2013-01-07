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
   */
  this.id = media.id;

	/**
	 * @type {string}
	 */
	this.name = media.name;
	
	/**
	 * @type {string}
	 */
	this.host = 'youtube';
	
	/**
	 * @type {string}
	 */
	this.hostId = media['host_id'];

	/**
	 * @type {number}
	 */
	this.duration = media.duration;
	
	/**
   * @type {string}
   */
  this.description = media.description;
  
  /**
   * @type {Object}
   */
  this.publisher = media['publisher'];
  
  /**
   * @type {goog.date.DateTime}
   */
  this.published = goog.date.fromIsoString(media['published'] + 'Z');

	/**
	 * @type {string}
	 */
	this.thumbnail = 'http://i.ytimg.com/vi/' + this.hostId + '/0.jpg';

	/**
	 * @type {goog.math.Size}
	 */
	this.thumbSize = new goog.math.Size(480, 360);

	/**
   * @type {Array.<brkn.model.Comment>}
   */
  this.comments = [];
  
  this.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment, this);
};
goog.inherits(brkn.model.Media, goog.pubsub.PubSub);


/**
 * @param {?boolean=} opt_time Show the time 
 * @return {string} Publication date as a readable string
 */
brkn.model.Media.prototype.getPublishDate = function (opt_time) {
  var date = this.published.getMonth() + '/' + this.published.getDate() + '/' +
      this.published.getYear();
  return opt_time ? date + ' ' + this.published.toUsTimeString() : date
};


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
