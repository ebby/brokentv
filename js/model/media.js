goog.provide('brkn.model.Media');

goog.require('brkn.model.Notify');
goog.require('brkn.model.Publisher');

goog.require('goog.pubsub.PubSub');



/**
 * NEVER CALL THIS CONSTRUCTOR, USE brkn.model.Medias.getInstance().getOrAdd(mediaObj)
 * 
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
   * @type {string}
   */
  this.hostLink = 'http://www.youtube.com/watch?v=' + media['host_id'];

  /**
   * @type {string}
   */
  this.redditId = media['reddit_id'];

	/**
	 * @type {number}
	 */
	this.duration = media['duration'];

	/**
   * @type {boolean}
   */
  this.live = !!media['live'];

  /**
   * @type {Array.<brkn.model.Channel>}
   */
  this.onChannels = [];

  /**
   * @type {?brkn.model.Channel}
   */
  this.playingOnChannel = null;

  /**
   * @type {boolean}
   */
  this.fetched = false;
	
	/**
   * @type {string}
   */
  this.description = media['description'];

  /**
   * @type {string}
   */
  this.link = media['link'] || 'xylocast.com/?m=' + this.id;
  
  /**
   * @type {brkn.model.Publisher}
   */
  this.publisher = media['publisher'] && new brkn.model.Publisher(media['publisher']);
  
  /**
   * @type {goog.date.DateTime}
   */
  this.published = media['published'] && goog.date.fromIsoString(media['published'] + 'Z');

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
  this.thumbPos = 37;

	/**
   * @type {Array.<brkn.model.Comment>}
   */
  this.comments = [];

  /**
   * @type {Array.<brkn.model.Tweet>}
   */
  this.tweets = [];
  
  /**
   * @type {Object}
   */
  this.poll;

  /**
   * @type {number}
   */
  this.commentCount = media['comment_count'] || 0;

  /**
   * @type {number}
   */
  this.starCount = media['star_count'] || 0;
  
  /**
   * @type {number}
   */
  this.likeCount = media['like_count'] || 0;
  
  /**
   * @type {number}
   */
  this.dislikeCount = media['dislike_count'] || 0;

  /**
   * @type {Array.<brkn.model.User>}
   */
  this.seen = [];
  
  /**
   * @type {Object.<string, brkn.model.User>}
   */
  this.onlineViewers = {};

  /**
   * @type {string}
   */
  this.collectionId = media['collection_id'];
  
  this.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment, this);
  this.subscribe(brkn.model.Media.Actions.REMOVE_COMMENT, this.removeComment, this);
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
  REMOVE_COMMENT: 'remove-comment',
  WATCHING: 'watching'
};


/**
 * @param {brkn.model.Channel} channel
 */
brkn.model.Media.prototype.addChannel = function(channel) {
  if (!goog.array.find(this.onChannels, function(c) {return channel.id == c.id})) {
    this.onChannels.push(channel);
  }
};


/**
 * Updates the media's status based on channels it could be playing on.
 */
brkn.model.Media.prototype.updateChannels = function() {
  goog.array.forEach(this.onChannels, function(channel) {
    var currentProgram = channel.getCurrentProgram();
    if (currentProgram && currentProgram.media.id == this.id) {
      this.playingOnChannel = channel;

      goog.array.forEach(channel.viewerSessions, function(s) {
        if (!s.tuneOut) {
         this.onlineViewers[s.user.id] = s.user;
        }
      });
    } else {
      this.onlineViewers = {};   
    }
  }, this);
};


/**
 * @param {brkn.model.Comment} comment
 */
brkn.model.Media.prototype.addComment = function(comment) {
  if (!comment.parentId) {
    this.comments.push(comment);
  } else {
    var parentComment = goog.array.find(this.comments, function(c) {
      return c.id == comment.parentId; 
    });
    parentComment && parentComment.replies.push(comment);
  }
  this.commentCount += 1;
};


/**
 * @param {brkn.model.Comment} comment
 */
brkn.model.Media.prototype.removeComment = function(comment) {
  goog.net.XhrIo.send('/_comment', goog.functions.NULL(), 'POST', 'delete=true&id=' + comment.id);
  if (!comment.parentId) {
    goog.array.removeIf(this.comments, function(c) {return c.id == comment.id});
  } else {
    var parentComment = goog.array.find(this.comments, function(c) {
      return c.id == comment.parentId; 
    });
    parentComment && goog.array.removeIf(parentComment.replies, function(c) {return c.id == comment.id});
  }
  this.commentCount -= 1;
};


/**
 * @param {brkn.model.User} user
 * @param {?brkn.model.Channel=} opt_channel
 * @param {?boolean=} opt_offline
 */
brkn.model.Media.prototype.addViewer = function(user, opt_channel, opt_offline) {
  if (opt_offline) {
    goog.object.remove(this.onlineViewers, user.id);
    return;
  }
  this.onlineViewers[user.id] = user;
  user.currentMedia = this;
  if (user.id != brkn.model.Users.getInstance().currentUser.id &&
      (!opt_channel || (opt_channel && brkn.model.Channels.getInstance().currentChannel &&
          opt_channel.id != brkn.model.Channels.getInstance().currentChannel.id))) {
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'is watching ' + (opt_channel ? opt_channel.name : ''), this.name, user,
        this.thumbnail1, '#info:' + this.id);
  }
};


/**
 * @param {Object} entry
 */
brkn.model.Media.fromEntry = function(entry) {
  var media = new brkn.model.Media({
    'id': 'youtube' + entry['media$group']['yt$videoid']['$t'],
    'name': entry['title']['$t'],
    'host_id': entry['media$group']['yt$videoid']['$t'],
    'description': entry['media$group']['media$description']['$t'],
    'duration': entry['media$group']['yt$duration']['seconds'],
    'publisher': {
                    'name': entry['author'][0]['name']['$t'],
                    'id': 'youtube' + entry['author'][0]['name']['$t'],
                    'picture': 'https://i4.ytimg.com/i/' + entry['author'][0]['yt$userId']['$t'] + '/1.jpg'
                  }
  });
  media.published = goog.date.fromIsoString(entry['published']['$t']);
  return media;
};
