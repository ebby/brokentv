goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Controller');
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
brkn.Sidebar = function() {
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
goog.inherits(brkn.Sidebar, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.Sidebar.COMMENT_CONTROLS_HEIGHT = 27;


/**
 * @type {number}
 * @constant
 */
brkn.Sidebar.INPUT_HEIGHT = 22;


/**
 * @type {brkn.model.Media}
 * @private
 */
brkn.Sidebar.prototype.currentMedia_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.timeContext_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.commentsEl_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.contentEl_ = goog.dom.getElementByClass('content', this.getElement());
  this.commentInput_.decorate(goog.dom.getElement('comment-textarea'));
  this.commentInput_.setMaxHeight(70);
  var keyHandler = new goog.events.KeyHandler(this.commentInput_.getKeyEventTarget());
   
  var commentControls = goog.dom.getElement('comment-controls');
  
  this.addChild(this.tweetToggle_);
  this.tweetToggle_.decorate(goog.dom.getElement('tweet-toggle'));
  
  this.addChild(this.fbToggle_);
  this.fbToggle_.decorate(goog.dom.getElement('fb-toggle'));
  
  this.addChild(this.addCommentButton_);
  this.addCommentButton_.decorate(goog.dom.getElement('add-comment'));
  this.addCommentButton_.setEnabled(false);
  
  this.getHandler()
      .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(this.commentInput_.getElement(),
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            goog.style.setPosition(commentControls, 0, -brkn.Sidebar.COMMENT_CONTROLS_HEIGHT);
            this.resize(brkn.Sidebar.COMMENT_CONTROLS_HEIGHT);
          }, this))
      .listen(this.getElement(),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              goog.style.setPosition(commentControls, 0, 0);
              this.resize();
            }
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
            this.resize(brkn.Sidebar.COMMENT_CONTROLS_HEIGHT +
                (e.target.height_ - brkn.Sidebar.INPUT_HEIGHT))
          }, this))
      .listen(this.addCommentButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.onAddComment_, this));
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
  this.currentMedia_ = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram().media;
  this.showMedia(this.currentMedia_);
};

/**
 * @param {Event} e
 */
brkn.Sidebar.prototype.onAddComment_ = function(e) {
  if (this.commentInput_.getValue()) {
    this.commentInput_.setActive(false);
    this.commentInput_.setEnabled(false);
    goog.net.XhrIo.send(
        '/_comment',
        goog.bind(function() {
          this.commentInput_.setValue('');
          this.commentInput_.setEnabled(true);
          this.commentInput_.setFocused(true);
        }, this),
        'POST',
        'media_id=' + this.currentMedia_.id + '&text=' + this.commentInput_.getValue());
  }
};

/**
 * @param {brkn.model.Media} media 
 */
brkn.Sidebar.prototype.showMedia = function(media) {
  soy.renderElement(this.contentEl_, brkn.sidebar.info, {
    media: media
  });
  
  this.currentMedia_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment_, this);
  
  var viewersEl = goog.dom.getElementByClass('viewers', this.getElement());
  this.commentsEl_ = goog.dom.getElementByClass('comments', this.getElement());

  goog.net.XhrIo.send(
      '/_seen',
      goog.bind(function() {
        
        goog.net.XhrIo.send('/_seen/' + media.id, goog.bind(function(e) {
          var seen = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          goog.style.showElement(viewersEl, seen.length);
          goog.array.forEach(seen, function(viewer) {
            var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
              user: brkn.model.Users.getInstance().get_or_add(viewer)
            })
            goog.dom.appendChild(viewersEl, viewerEl);
          }, this);
          this.resize();
        }, this));
        
        
        
      }, this),
      'POST',
      'id=' + media.id);

  goog.net.XhrIo.send('/_comment/' + media.id, goog.bind(function(e) {
      var comments = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
      goog.style.showElement(this.commentsEl_, comments.length);
      goog.array.forEach(comments, function(comment) {
        var c = new brkn.model.Comment(comment);
        this.addComment_(c);
      }, this);
      this.resize();
    }, this));
};


/**
 * @param {brkn.model.Comment} comment
 * @private
 */
brkn.Sidebar.prototype.addComment_ = function(comment) {
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    comment: comment
  });
  goog.dom.appendChild(this.commentsEl_, commentEl);
  this.resize(this.commentInput_.isFocused() ? brkn.Sidebar.COMMENT_CONTROLS_HEIGHT : 0);
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 */
brkn.Sidebar.prototype.resize = function(opt_extra) {
  var extra = opt_extra || 0;
  window.console.log(extra);
  goog.style.setHeight(this.commentsEl_, goog.dom.getViewportSize().height -
      goog.style.getPosition(this.commentsEl_.parentElement).y - 120 - extra);

  // Give the comment div a second/2 to resize, then scroll to bottom.
  goog.Timer.callOnce(goog.bind(function() {
    var scrollAnim = new goog.fx.dom.Scroll(this.commentsEl_,
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollTop],
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollHeight], 300);
    scrollAnim.play();
  }, this), opt_extra ? 0 : 100);
};
