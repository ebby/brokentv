goog.provide('brkn.sidebar.CommentList');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Tweet');
goog.require('brkn.sidebar');

goog.require('goog.string.linkify');
goog.require('goog.ui.Component');



/**
 * @param {brkn.model.Media} media
 * @param {?Array.<brkn.model.Comment>=} opt_comments
 * @param {?boolean=} opt_twitter
 * @param {?Array.<brkn.model.Tweet>=} opt_tweets
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.CommentList = function(media, opt_comments, opt_twitter, opt_tweets) {
  goog.base(this);

  /**
   * @type {brkn.model.Media}
   * @private
   */
  this.media_ = media;

  /**
   * @type {Array.<brkn.model.Comment>}
   * @private
   */
  this.comments_ = opt_comments || [];

  /**
   * @type {Object.<string, brkn.model.Comment>}
   * @private
   */
  this.commentsMap_ = {};

  /**
   * @type {boolean}
   * @private
   */
  this.twitter_ = !!opt_twitter;
  
  /**
   * @type {Array.<brkn.model.Tweet>}
   * @private
   */
  this.tweets_ = opt_tweets || [];

  /**
   * @type {Object.<string, brkn.model.Tweet>}
   * @private
   */
  this.tweetsMap_ = {};

  /**
   * @type {number}
   * @private
   */
  this.commentsHeight_ = 0;
  
  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;
  
  /**
   * The parent comment element for a comment thread
   * @type {Object.<string, Element>}
   * @private
   */
  this.lastCommentEl_ = {};
};
goog.inherits(brkn.sidebar.CommentList, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentList.prototype.commentsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentList.prototype.scrollable_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentList.prototype.spinner_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentList.prototype.noCommentsEl_;


/** @inheritDoc */
brkn.sidebar.CommentList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;
  goog.dom.classes.add(this.getElement(), 'ios-scroll');

  this.spinner_ = goog.dom.createDom('div', 'loading',
      goog.dom.createDom('div', 'loading-spinner'));
  goog.dom.appendChild(this.getElement(), this.spinner_);
  goog.style.showElement(this.spinner_, false);

  this.noCommentsEl_ = goog.dom.createDom('div', 'no-comments', 'Start the conversation.');
  goog.dom.appendChild(this.getElement(), this.noCommentsEl_);

  this.commentsEl_ = goog.dom.createDom('div', 'comments tweets');
  goog.dom.appendChild(this.getElement(), this.commentsEl_);

  this.getHandler()
      .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(this.commentsEl_, goog.events.EventType.CLICK, goog.bind(this.commentClick_, this));

  if (this.comments_.length) {
    goog.array.forEach(this.comments_, function(comment) {
      this.addComment(comment);
    }, this);
    this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
  } else if (this.twitter_ && this.tweets_.length) {
    goog.array.forEach(this.tweets_, function(tweet) {
      this.addTweet_(tweet);
    }, this);
    this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
  } else {
    goog.style.showElement(this.spinner_, true);
  }
  
  if (this.twitter_) {
    goog.net.XhrIo.send('/_tweet/' + this.media_.id + '?offset=' + this.tweets_.length,
        goog.bind(function(e) {
          goog.style.showElement(this.spinner_, false);
          var tweets = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          tweets = goog.array.map(tweets, function(t) {
            var tweet = new brkn.model.Tweet(t);
            this.addTweet_(tweet);
            return tweet;
          }, this);
          this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
          this.resize();
        }, this)); 
    this.media_.subscribe(brkn.model.Media.Actions.ADD_TWEET, function(tweet) {
      this.addTweet_(tweet, true);
    }, this);
  } else {
    goog.net.XhrIo.send('/_comment/' + this.media_.id + '?offset=' + this.comments_.length,
        goog.bind(function(e) {
          goog.style.showElement(this.spinner_, false);
          var comments = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          comments = goog.array.map(comments, function(c) {
            var comment = new brkn.model.Comment(c);
            this.addComment(comment);
            return comment;
          }, this);
          this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
          this.resize();
        }, this));
    this.media_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment, this);
    this.media_.subscribe(brkn.model.Media.Actions.REMOVE_COMMENT, this.removeComment_, this);
  }
  this.resize(brkn.sidebar.CommentInput.INPUT_HEIGHT);
};


/**
 * @param {brkn.model.Tweet} tweet
 * @param {?boolean=} opt_first
 * @private
 */
brkn.sidebar.CommentList.prototype.addTweet_ = function(tweet, opt_first) {
  this.tweetsMap_[tweet.id] = tweet;
  goog.style.showElement(this.noCommentsEl_, false);
  var linkedText = goog.string.linkify.linkifyPlainText(tweet.text);
  linkedText = linkedText.replace(/#(\S+)/g, function(hashtag, query) {
    return '<a target="_blank" href="http://twitter.com/search?q=%23' + query + '">' + hashtag + '</a>';
  });
  linkedText = linkedText.replace(/@(\S+)/g, function(handle, name) {
    return '<a target="_blank" href="http://twitter.com/' + name + '">' + handle + '</a>';
  });
  var tweetEl = soy.renderAsElement(brkn.sidebar.tweet, {
    tweet: tweet,
    text: linkedText,
    timestamp: goog.date.relative.format(tweet.time.getTime())
  });
  brkn.model.Clock.getInstance().addTimestamp(tweet.time,
      goog.dom.getElementByClass('timestamp', tweetEl));
  if (opt_first) {
    goog.dom.insertChildAt(this.commentsEl_, tweetEl, 0);
  } else {
    goog.dom.appendChild(this.commentsEl_, tweetEl);
  }
  this.resize();
  goog.style.showElement(goog.dom.getParentElement(this.commentsEl_), true);
};


/**
 * @param {Event} e
 * @private
 */
brkn.sidebar.CommentList.prototype.commentClick_ = function(e) {
  var targetEl = /** @type {Element} */ e.target;
  if (this.twitter_) {
    var tweetEl = goog.dom.getAncestorByClass(targetEl, 'tweet');
    if (tweetEl) {
      var tweetId = tweetEl.id.split('-')[1];
      var tweet = this.tweetsMap_[tweetId];
      if (goog.dom.classes.has(targetEl, 'reply')) {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.REPLY_TWEET, tweet);
      }
    }
  } else {
    var commentEl = goog.dom.getAncestorByClass(targetEl, 'comment');
    if (commentEl) {
      var commentId = commentEl.id.split('-')[1];
      var comment = this.commentsMap_[commentId];
      if (goog.dom.classes.has(targetEl, 'reply')) {
        var parentCommentEl = this.lastCommentEl_[(comment.parentId ? comment.parentId : comment.id)];
        goog.dom.getElementByClass('reply-textarea', parentCommentEl).focus();
      } else if (goog.dom.classes.has(targetEl, 'remove')) {
        this.media_.publish(brkn.model.Media.Actions.REMOVE_COMMENT, commentId);
      }
    } 
  }
};


/**
 * @param {string} commentId
 * @private
 */
brkn.sidebar.CommentList.prototype.removeComment_ = function(commentId) {
  var commentEl = goog.dom.getElement('listcomment-' + commentId);
  var nextSibling = commentEl.nextSibling;
  goog.dom.removeNode(commentEl);
  while (nextSibling && goog.dom.classes.has(nextSibling, 'reply')) {
    nextSibling = nextSibling.nextSibling;
    goog.dom.removeNode(nextSibling);
  }
};


/**
 * @param {brkn.model.Comment} comment
 * @return {Element}
 */
brkn.sidebar.CommentList.prototype.addComment = function(comment) {
  this.comments_.push(comment);

  goog.style.showElement(this.noCommentsEl_, false);
  
  var textHtml = goog.string.linkify.linkifyPlainText(comment.text);
  textHtml = textHtml.replace(/@\[(\d+):([a-zA-z\s]+)\]/g, function(str, id, name) {
    return '<a href="#user:' + id + '">' + name + '</a>';
  });

  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    prefix: 'listcomment',
    comment: comment,
    text: textHtml,
    owner: (comment.user.id == brkn.model.Users.getInstance().currentUser.id)
  });
  brkn.model.Clock.getInstance().addTimestamp(comment.time,
      goog.dom.getElementByClass('timestamp', commentEl));
  if (comment.parentId) {
    goog.dom.appendChild(goog.dom.getElementByClass('replies', this.lastCommentEl_[comment.parentId]), 
        commentEl);
  } else {
    goog.dom.appendChild(this.commentsEl_, commentEl);
  }
  goog.array.forEach(comment.replies, function(reply) {
    this.addComment(reply);
  }, this);
  if (!comment.parentId) {
    this.commentsEl_.scrollTop = this.commentsEl_.scrollHeight;
  }
  if (comment.id) {
    this.activateComment(comment, commentEl);
  }
  return commentEl;
};


/**
 * @param {brkn.model.Comment} comment
 * @param {Element} commentEl
 */
brkn.sidebar.CommentList.prototype.activateComment = function(comment, commentEl) {
  this.commentsMap_[comment.id] = comment;
  if (!comment.parentId) {
    this.lastCommentEl_[comment.id] = commentEl;
    // Handle reply input
    var replyInput = goog.dom.getElementByClass('reply-textarea', commentEl);
    var keyHandler = new goog.events.KeyHandler(replyInput);
    this.getHandler().listen(keyHandler,
        goog.events.KeyHandler.EventType.KEY,
        goog.bind(function(e) {
          e.stopPropagation();
          if (e.keyCode == '13' && replyInput.value) {
            e.preventDefault();
            var reply = brkn.model.Comment.add(brkn.model.Users.getInstance().currentUser, 
                this.media_.id, replyInput.value, false, false, comment.id, comment.user.id);
            this.addComment(reply);
            replyInput.value = '';
          }
        }, this));
  }
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 * @private
 */
brkn.sidebar.CommentList.prototype.resize = function(opt_extra) {
  this.resizeExtra_ = opt_extra || this.resizeExtra_;
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 42 -
      this.resizeExtra_ - (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
};

