goog.provide('brkn.sidebar.Conversation');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.model.Medias');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.CommentInput');
goog.require('brkn.sidebar.CommentList');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param  {brkn.model.Media} media
 * @param {?Array.<brkn.model.Comment>=} opt_comments
 * @param {?Array.<brkn.model.Tweet>=} opt_tweets
 * @param {?boolean=} opt_twitter Select twitter tab
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Conversation = function(media, opt_comments, opt_tweets, opt_twitter) {
  goog.base(this);

  this.setModel(media);

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
   * @type {Array.<brkn.model.Tweet>}
   * @private
   */
  this.tweets_ = opt_tweets || [];
  
  /**
   * @type {boolean}
   * @private
   */
  this.twitter_ = !!opt_twitter;

  /**
   * @type {brkn.sidebar.CommentList}
   * @private
   */
  this.commentList_ = new brkn.sidebar.CommentList(media, this.comments_);

  /**
   * @type {brkn.sidebar.CommentList}
   * @private
   */
  this.tweetList_ = new brkn.sidebar.CommentList(media, undefined, true, this.tweets_);
  
  /**
   * @type {brkn.sidebar.CommentInput}
   * @private
   */
  this.commentInput_ = new brkn.sidebar.CommentInput(true, true);

  /**
   * @type {Array.<string>}
   * @private
   */
  this.tabs_ = ['comments', 'tweets'];
  
  /**
   * Comment el's waiting for their IDs
   * @type {Object.<string, Element>}
   * @private
   */
  this.tempCommentEl_ = {};
};
goog.inherits(brkn.sidebar.Conversation, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Conversation.prototype.tabsEl_;


/** @inheritDoc */
brkn.sidebar.Conversation.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  goog.dom.classes.add(el, 'conversation');
  goog.dom.classes.add(el, 'ios-scroll');
  soy.renderElement(el, brkn.sidebar.conversation);
  goog.dom.classes.add(el.firstChild, this.twitter_ ? 'tweets' : 'comments');
};


/** @inheritDoc */
brkn.sidebar.Conversation.prototype.enterDocument = function() {
  
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());

  this.commentList_.decorate(goog.dom.getElementByClass('comments-content', this.getElement()));
  this.tweetList_.decorate(goog.dom.getElementByClass('tweets-content', this.getElement()));
  this.commentInput_.render(this.getElement());

  this.getHandler()
      .listen(this.tabsEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        var tabEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
        this.navigate_(tabEl);
      }, this))
      .listen(this.commentInput_, 'add', goog.bind(this.onAddComment_, this))
      .listen(this.commentInput_,
          'resize',
          goog.bind(function(e) {
            goog.dom.classes.has(this.getElement().firstChild, 'comments') ?
                this.commentList_.resize(brkn.sidebar.CommentInput.INPUT_HEIGHT) :
                this.tweetList_.resize(brkn.sidebar.CommentInput.INPUT_HEIGHT)
          }, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              this.commentInput_.setFocused(false);
            }
          }, this))
      .listen(goog.dom.getElementByClass('no-comments', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(this.onNoComments_, this))
      .listen(goog.dom.getElementsByClass('no-comments', this.getElement())[1],
          goog.events.EventType.CLICK,
          goog.bind(this.onNoComments_, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              this.commentInput_.setFocused(false);
            }
          }, this));

  this.commentList_.resize(brkn.sidebar.CommentInput.INPUT_HEIGHT);
  this.tweetList_.resize(brkn.sidebar.CommentInput.INPUT_HEIGHT);
};


/**
 * @param {Object} e
 * @private
 */
brkn.sidebar.Conversation.prototype.onNoComments_ = function(e) {
  e.preventDefault();
  e.stopPropagation();
  this.commentInput_.setFocused(true);
};

/**
 * @param {Object} e
 * @private
 */
brkn.sidebar.Conversation.prototype.onAddComment_ = function(e) {
  var comment = brkn.model.Comment.add(brkn.model.Users.getInstance().currentUser, 
      this.media_.id, e.text, e.facebook, e.twitter, e.parentId, e.toUserId,
      goog.bind(function(comment) {
        var el = this.tempCommentEl_[comment.time.getTime()];
        el.id = 'infocomment-' + comment.id;
        this.commentList_.activateComment(comment, el);
      }, this));
  var commentEl = this.commentList_.addComment(comment);
  this.tempCommentEl_[comment.time.getTime()] = commentEl;

  if (e.facebook && !e.parentId) {
    FB.api('/me/feed', 'POST', {
      'message': e.text,
      'name': this.media_.name,
      'link': this.media_.link,
      'picture': this.media_.thumbnail,
      'caption': 'on XYLO',
      'description': this.media_.description
    }, function(response) {});

    // Disable facebook posting after first post
    this.commentInput_.setFacebook(false);
  }
};


/**
 * @param {Element} tabEl
 * @private
 */
brkn.sidebar.Conversation.prototype.navigate_ = function(tabEl) {
  goog.array.forEach(this.tabs_, function(tab) {
    goog.dom.classes.enable(this.tabsEl_.parentElement, tab, goog.dom.classes.has(tabEl, tab));
    this.currentTab_ = goog.dom.classes.has(tabEl, tab) ? tab : this.currentTab_;
  }, this);
};
  