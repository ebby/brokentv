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
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.CommentInput = function() {
  goog.base(this);
  
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
  this.tweetToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.fbToggle_ = new goog.ui.CustomButton('post');
  this.fbToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.addCommentButton_ = new goog.ui.CustomButton('add');
  
};
goog.inherits(brkn.sidebar.CommentInput, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT = 27;


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.INPUT_HEIGHT = 22;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.commentControls_;


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
  
  this.addChild(this.tweetToggle_);
  this.tweetToggle_.decorate(goog.dom.getElementByClass('tweet-toggle', this.getElement()));
  
  this.addChild(this.fbToggle_);
  this.fbToggle_.decorate(goog.dom.getElementByClass('fb-toggle', this.getElement()));
  
  this.addChild(this.addCommentButton_);
  this.addCommentButton_.decorate(goog.dom.getElementByClass('add-comment', this.getElement()));
  this.addCommentButton_.setEnabled(false);
  
  this.getHandler()
      .listen(this.commentInput_.getElement(),
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            goog.style.setPosition(this.commentControls_, 0,
                -brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT);
            this.dispatchEvent(goog.events.EventType.FOCUS)
          }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            this.addCommentButton_.setEnabled(this.commentInput_.getValue());
            if (e.keyCode == '13') {
              e.preventDefault();
              e.stopPropagation();
              this.addCommentButton_.setActive(this.commentInput_.getValue());
              this.onAddComment_(e);
            }
          }, this))
       .listen(this.commentInput_,
           goog.ui.Textarea.EventType.RESIZE,
          goog.bind(function(e) {
            this.dispatchEvent(e);
          }, this))
      .listen(this.addCommentButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.onAddComment_, this));
};


/**
 * @return {string}
 */
brkn.sidebar.CommentInput.prototype.getValue = function() {
  return this.commentInput_.getValue();
}



/**
 * 
 */
brkn.sidebar.CommentInput.prototype.collapse = function() {
  goog.style.setPosition(this.commentControls_, 0, 0);
}


/**
 * @return {boolean}
 */
brkn.sidebar.CommentInput.prototype.isFocused = function() {
  return goog.dom.classes.has(this.getElement(), 'focused');
};


/**
 * @param {boolean} focus
 */
brkn.sidebar.CommentInput.prototype.setFocused = function(focus) {
  return goog.dom.classes.enable(this.getElement(), 'focused', focus);
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onAddComment_ = function(e) {
  if (this.commentInput_.getValue()) {
    this.commentInput_.setActive(false);
    this.commentInput_.setEnabled(false);
    this.setFocused(true);
    this.dispatchEvent({
      type: 'add',
      callback: goog.bind(function() {
          this.commentInput_.setValue('');
          this.commentInput_.setEnabled(true);
          this.commentInput_.setFocused(true);
        }, this),
      text: this.commentInput_.getValue()
    });
  }
};
