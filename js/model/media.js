goog.provide('brkn.model.Media');

goog.require('brkn.model.Publisher');
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
  this.id = media['id'];

	/**
	 * @type {string}
	 */
	this.name = media['name'];
	
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
	this.duration = media['duration'];
	
	/**
   * @type {string}
   */
  this.description = media['description'];

  /**
   * @type {string}
   */
  this.link = media['link'] || 'xylocast.com/?m=' + this.id;
  
  /**
   * @type {Object}
   */
  this.publisher = new brkn.model.Publisher(media['publisher']);
  
  /**
   * @type {goog.date.DateTime}
   */
  this.published = goog.date.fromIsoString(media['published'] + 'Z');

	/**
	 * @type {string}
	 */
	this.thumbnail = 'http://i.ytimg.com/vi/' + this.hostId + '/0.jpg';
	
	/**
   * @type {string}
   */
  this.thumbnail1 = 'http://i.ytimg.com/vi/' + this.hostId + '/1.jpg';
  
  /**
   * @type {string}
   */
  this.thumbnail2 = 'http://i.ytimg.com/vi/' + this.hostId + '/2.jpg';
  
  /**
   * @type {string}
   */
  this.thumbnail3 = 'http://i.ytimg.com/vi/' + this.hostId + '/3.jpg';

	/**
	 * @type {goog.math.Size}
	 */
	this.thumbSize = new goog.math.Size(480, 360);
	
	/**
   * @type {number}
   */
  this.thumbPos = (/** @type {number} */ media['thumb_pos']) || 37;

	/**
   * @type {Array.<brkn.model.Comment>}
   */
  this.comments = [];

  /**
   * @type {number}
   */
  this.commentCount = media['comment_count'] || 0;

  /**
   * @type {number}
   */
  this.starCount = media['star_count'] || 0;

  /**
   * @type {Array.<brkn.model.User>}
   */
  this.onlineViewers = [];

  /**
   * @type {string}
   */
  this.collectionId = media['collection_id'];
  
  this.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment, this);
  this.subscribe(brkn.model.Media.Actions.WATCHING, this.addViewer, this);
};
goog.inherits(brkn.model.Media, goog.pubsub.PubSub);


/**
 * @param {?boolean=} opt_time Show the time 
 * @return {string} Publication date as a readable string
 */
brkn.model.Media.prototype.getPublishDate = function (opt_time) {
  var date = (this.published.getMonth() + 1) + '/' + this.published.getDate() + '/' +
      this.published.getYear();
  return opt_time ? date + ' ' + this.published.toUsTimeString() : date
};


/**
 * @enum {string}
 */
brkn.model.Media.Actions = {
  ADD_COMMENT: 'add-comment',
  ADD_TWEET: 'add-tweet',
  WATCHING: 'watching'
};


/**
 * @param {brkn.model.Comment} comment
 */
brkn.model.Media.prototype.addComment = function(comment) {
  this.comments.push(comment);
  this.commentCount += 1;
  if (comment.user.id != brkn.model.Users.getInstance().currentUser.id) {
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.SHOW,
        'commented on ' + this.name, comment.text, comment.user, comment.user.picture,
        '#media:' + this.id);
  }
};


/**
 * @param {brkn.model.User} user
 * @param {brkn.model.Channel} channel
 * @param {?boolean=} opt_offline
 */
brkn.model.Media.prototype.addViewer = function(user, channel, opt_offline) {
  if (opt_offline) {
    goog.array.removeIf(this.onlineViewers, function(u) {return u.id == user.id});
    return;
  }
  this.onlineViewers.push(user);
  if (user.id != brkn.model.Users.getInstance().currentUser.id) {
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'is watching ' + channel.name, this.name, user, this.thumbnail1, '#info:' + this.id);
  }
};
