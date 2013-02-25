goog.provide('brkn.sidebar.CommentList');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Tweet');
goog.require('brkn.sidebar');

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
   * @type {number}
   * @private
   */
  this.commentsHeight_ = 0;
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
      .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)));

  if (this.comments_.length) {
    goog.array.forEach(this.comments_, function(comment) {
      this.addComment_(comment);
    }, this);
    this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
    this.resize();
  } else if (this.twitter_ && this.tweets_.length) {
    goog.array.forEach(this.tweets_, function(tweet) {
      this.addTweet_(tweet);
    }, this);
    this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
    this.resize();
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
  } else {
    goog.net.XhrIo.send('/_comment/' + this.media_.id + '?offset=' + this.comments_.length,
        goog.bind(function(e) {
          goog.style.showElement(this.spinner_, false);
          var comments = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          comments = goog.array.map(comments, function(c) {
            var comment = new brkn.model.Comment(c);
            this.addComment_(comment);
            return comment;
          }, this);
          this.mediasHeight_ = goog.style.getSize(this.commentsEl_).height;
          this.resize();
        }, this)); 
  }
};


/**
 * @param {brkn.model.Tweet} tweet
 * @param {?boolean=} opt_first
 * @private
 */
brkn.sidebar.CommentList.prototype.addTweet_ = function(tweet, opt_first) {
  goog.style.showElement(this.noCommentsEl_, false);
  var tweetEl = soy.renderAsElement(brkn.sidebar.tweet, {
    tweet: tweet,
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
 * @param {brkn.model.Comment} comment
 * @private
 */
brkn.sidebar.CommentList.prototype.addComment_ = function(comment) {
  goog.style.showElement(this.noCommentsEl_, false);
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    comment: comment,
    timestamp: goog.date.relative.format(comment.time.getTime())
  });
  brkn.model.Clock.getInstance().addTimestamp(comment.time,
      goog.dom.getElementByClass('timestamp', commentEl));
  goog.dom.appendChild(this.commentsEl_, commentEl);
  this.resize();
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 * @param {?boolean=} opt_commentInput
 * @private
 */
brkn.sidebar.CommentList.prototype.resize = function(opt_extra, opt_commentInput) {
  var extra = opt_extra || 0;
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 55 - extra -
      (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
};

