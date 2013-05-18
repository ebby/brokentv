goog.provide('brkn.sidebar.CommentInput');

goog.require('soy');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {?boolean} opt_showControls
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.CommentInput = function(opt_showControls) {
  goog.base(this);
  
  /**
   * @type {boolean}
   * @private
   */
  this.showControls_ = !!opt_showControls;
  
  /**
   * @type {goog.ui.Textarea}
   * @private
   */
  this.commentInput_ = new goog.ui.Textarea('Add to the conversation.');
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.tweetToggle_ = new goog.ui.CustomButton('tweet');
  this.tweetToggle_.setSupportedState(goog.ui.Component.State.CHECKED, true);
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.fbToggle_ = new goog.ui.CustomButton('post');
  this.fbToggle_.setSupportedState(goog.ui.Component.State.CHECKED, true);

  var currentUser = brkn.model.Users.getInstance().currentUser;
  
  /**
   * @type {boolean}
   * @private
   */
  this.fbPublish_ = currentUser.postFacebook;
  
  /**
   * @type {boolean}
   * @private
   */
  this.twitterPublish_ = currentUser.postTwitter;
  
  /**
   * @type {boolean}
   * @private
   */
  this.twitterAuthUrl_;

  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.addCommentButton_ = new goog.ui.CustomButton('add');

  /**
   * @type {?brkn.model.User}
   * @private
   */
  this.replyUser = null;
  
  /**
   * @type {?Element}
   * @private
   */
  this.token_ = null;

  /**
   * @type {?string}
   */
  this.parentComment = null;
};
goog.inherits(brkn.sidebar.CommentInput, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT = 25;


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.INPUT_HEIGHT = 41;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.commentControls_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.inputHolder_;


/** @inheritDoc */
brkn.sidebar.CommentInput.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.commentInput);
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.CommentInput.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.commentInput_.decorate(goog.dom.getElementByClass('comment-textarea', this.getElement()));
  this.commentInput_.setMaxHeight(70);
  var keyHandler = new goog.events.KeyHandler(this.commentInput_.getKeyEventTarget());
   
  this.commentControls_ = goog.dom.getElementByClass('comment-controls', this.getElement());
  goog.style.showElement(this.commentControls_, this.showControls_);
  goog.dom.classes.enable(this.getElement(), 'show-controls', this.showControls_);
  
  this.inputHolder_ = goog.dom.getElementByClass('input-holder', this.getElement());
  
  this.addChild(this.tweetToggle_);
  this.tweetToggle_.decorate(goog.dom.getElementByClass('tweet-toggle', this.getElement()));
  goog.net.XhrIo.send('/_twitter', goog.bind(function(e) {
    var response = e.target.getResponseJson()
    this.twitterPublish_ = this.twitterPublish_ && response['auth'];
    this.twitterAuthUrl_ = response['auth_url'];
    this.tweetToggle_.setChecked(this.twitterPublish_);
  }, this));
  
  this.addChild(this.fbToggle_);
  this.fbToggle_.decorate(goog.dom.getElementByClass('fb-toggle', this.getElement()));
  FB.api('/me/permissions', goog.bind(function(response) {
    this.fbPublish_ = this.fbPublish_ && !!response.data[0]['publish_stream'];
    this.fbToggle_.setChecked(this.fbPublish_);
  }, this));
  
  
  this.addChild(this.addCommentButton_);
  this.addCommentButton_.decorate(goog.dom.getElementByClass('add-comment', this.getElement()));
  this.addCommentButton_.setEnabled(false);
  
  this.getHandler()
      .listen(this.commentInput_.getElement(),
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            //goog.style.setPosition(this.commentControls_, 0, 0);
            this.dispatchEvent(goog.events.EventType.FOCUS)
          }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            e.stopPropagation();
            this.addCommentButton_.setEnabled(!!this.commentInput_.getValue());
            if (e.keyCode == '13') {
              e.preventDefault();
              e.stopPropagation();
              this.addCommentButton_.setActive(this.commentInput_.getValue());
              this.onAddComment_(e);
            } else if (e.keyCode == '8' && !this.getValue() && this.token_) {
              this.removeReply_();
            }
          }, this))
       .listen(this.commentInput_,
           goog.ui.Textarea.EventType.RESIZE,
          goog.bind(function(e) {
            this.dispatchEvent(e);
          }, this))
      .listen(this.fbToggle_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.onFacebookToggle_, this))
      .listen(this.tweetToggle_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.onTwitterToggle_, this))
      .listen(this.addCommentButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.onAddComment_, this));
  
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.REPLY_COMMENT,
      this.reply, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.REPLY_TWEET,
      this.replyTweet, this);
  brkn.model.Users.getInstance().currentUser.subscribe(brkn.model.User.Actions.TWITTER_AUTH, function() {
    this.tweetToggle_.setChecked(true);
  }, this);
};


/**
 * @param {brkn.model.Comment|string} comment Parent comment or id
 * @param {brkn.model.User} user But in reply to this user
 * @private
 */
brkn.sidebar.CommentInput.prototype.reply = function(comment, user) {
  if (this.token_) {
    this.removeReply_();
  }
  this.replyUser = user;
  this.parentComment = comment.id ? comment.id : comment.toString();
  this.token_ = goog.dom.createDom('div', 'token', '@' + user.firstName());
  goog.dom.appendChild(this.inputHolder_, this.token_);
  this.setFocused(true);
  this.commentInput_.getElement().style.paddingLeft = goog.style.getSize(this.token_).width + 5 + 'px';
};


/**
 * @param {brkn.model.Tweet} tweet
 * @private
 */
brkn.sidebar.CommentInput.prototype.replyTweet = function(tweet) {
  if (this.token_) {
    this.removeReply_();
  }
  this.parentTweet = tweet.id;
  this.setValue((this.getValue() ? this.getValue() + ' ' : '') + '@' + tweet.handle + ' ');
  this.setFocused(true);
  this.tweetToggle_.setEnabled(true);
  this.setFocused(true);
  this.setCaretToPos(this.getValue().length);
};


/**
 * @private
 */
brkn.sidebar.CommentInput.prototype.removeReply_ = function() {
  this.replyUser = null;
  this.parentComment = null;
  goog.dom.removeNode(this.token_);
  this.token_ = null;
  this.commentInput_.getElement().style.paddingLeft = '';
};


/**
 * @param {number} selectionStart 
 * @param {number} selectionEnd
 */
brkn.sidebar.CommentInput.prototype.setSelectionRange = function(selectionStart, selectionEnd) {
  if (this.commentInput_.getElement().setSelectionRange) {
    this.commentInput_.getElement().focus();
    this.commentInput_.getElement().setSelectionRange(selectionStart, selectionEnd);
  }
  else if (this.commentInput_.getElement().createTextRange) {
    var range = this.commentInput_.getElement().createTextRange();
    range.collapse(true);
    range.moveEnd('character', selectionEnd);
    range.moveStart('character', selectionStart);
    range.select();
  }
};


/**
 * @param {number} pos
 */
brkn.sidebar.CommentInput.prototype.setCaretToPos = function(pos) {
  this.setSelectionRange(pos, pos);
};


/**
 * @return {string}
 */
brkn.sidebar.CommentInput.prototype.getValue = function() {
  return this.commentInput_.getValue();
};


/**
 * @param {string} text
 * @param {?boolean=} opt_facebook
 * @param {?boolean=} opt_tweet
 */
brkn.sidebar.CommentInput.prototype.setValue = function(text, opt_facebook, opt_tweet) {
  this.fbToggle_.setChecked(!!opt_facebook);
  this.tweetToggle_.setChecked(!!opt_tweet);
  this.commentInput_.setValue(text);
  this.addCommentButton_.setEnabled(!!text);
};


/**
 * @return {boolean} true if collapsing, false if already collapsed
 */
brkn.sidebar.CommentInput.prototype.collapse = function() {
//  if (goog.style.getPosition(this.commentControls_).y !=
//      brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT) {
//    goog.style.setPosition(this.commentControls_, 0,
//        brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT);
//    return true;
//  } else {
//    return false;
//  }
}


/**
 * @return {boolean}
 */
brkn.sidebar.CommentInput.prototype.hasReply = function() {
  return !!this.token_;
};


/**
 * @return {boolean}
 */
brkn.sidebar.CommentInput.prototype.isFocused = function() {
  return goog.dom.classes.has(this.getElement(), 'focused');
};


/**
 * @param {boolean} enabled
 */
brkn.sidebar.CommentInput.prototype.setFacebook = function(enabled) {
  this.fbToggle_.setChecked(enabled);
};


/**
 * @param {boolean} focus
 */
brkn.sidebar.CommentInput.prototype.setFocused = function(focus) {
  if (focus) {
    this.commentInput_.getElement().focus();
//    goog.Timer.callOnce(goog.bind(function() {
//      goog.style.setPosition(this.commentControls_, 0, 0);
//    }, this));
  }
  return goog.dom.classes.enable(this.getElement(), 'focused', focus);
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onAddComment_ = function(e) {
  if (this.commentInput_.getValue()) {
    this.dispatchEvent({
      type: 'add',
      callback: goog.bind(function(e) {
          var response = e.target.getResponseJson();
          if (response['comment']) {
            var comment = new brkn.model.Comment(response['comment']);
            var tweet = response['tweet'] ? new brkn.model.Tweet(response['tweet']) : null;
            var media = brkn.model.Medias.getInstance().getOrAdd(response['comment']['media']);
            if (media) {
              media.publish(brkn.model.Media.Actions.ADD_COMMENT, comment);
              tweet && media.publish(brkn.model.Media.Actions.ADD_TWEET, tweet);
            }
          }
        }, this),
      facebook: this.fbToggle_.isChecked(),
      twitter: this.tweetToggle_.isChecked(),
      text: this.commentInput_.getValue(),
      parentId: this.parentComment,
      toUserId: this.replyUser && this.replyUser.id
    });
    this.commentInput_.setValue('');
    this.removeReply_();
  }
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onFacebookToggle_ = function(e) {
  if (!this.fbPublish_ && this.fbToggle_.isChecked()) {
    goog.style.showElement(goog.dom.getElement('overlay'), true);
    FB.login(goog.bind(function(response) {
      goog.style.showElement(goog.dom.getElement('overlay'), false);
      this.facebookPublish_ = !!response['authResponse'];
      this.fbToggle_.setChecked(this.facebookPublish_);
    }, this), { scope: 'publish_stream' });
  }
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onTwitterToggle_ = function(e) {
  if (!this.twitterPublish_ && this.tweetToggle_.isChecked()) {
      this.tweetToggle_.setChecked(false);
      var newWindow = window.open(this.twitterAuthUrl_,'Twitter Login','height=300,width=550');
      newWindow.moveTo(screen.width/2-225, screen.height/2-150);
      newWindow.focus();
   }
};
