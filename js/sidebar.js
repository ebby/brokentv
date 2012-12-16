goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Controller');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');



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
  this.addComment_ = new goog.ui.CustomButton('add');
  this.addComment_.setEnabled(false);
};
goog.inherits(brkn.Sidebar, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.timeContext_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.infoEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.viewersEl_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.contentEl_ = goog.dom.getElementByClass('content', this.getElement());
  this.timeContext_ = goog.dom.getElementByClass('time-context', this.getElement());
  this.commentInput_.decorate(goog.dom.getElement('comment-textarea'));
   
  var commentControls = goog.dom.getElement('comment-controls');
  
  this.addChild(this.tweetToggle_);
  this.tweetToggle_.decorate(goog.dom.getElement('tweet-toggle'));
  
  this.addChild(this.fbToggle_);
  this.fbToggle_.decorate(goog.dom.getElement('fb-toggle'));
  
  this.addChild(this.addComment_);
  this.addComment_.decorate(goog.dom.getElement('add-comment'));
  
  window.console.log(this.commentInput_.getKeyHandler());
  var keyHandler = new goog.events.KeyHandler(this.commentInput_.getKeyEventTarget());
  
  this.getHandler()
      .listen(this.commentInput_.getElement(),
          goog.events.EventType.FOCUS,
          function(e) {
            goog.style.setPosition(commentControls, 0, -27);
          })
      .listen(this.getElement(),
          goog.events.EventType.CLICK,
          function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              goog.style.setPosition(commentControls, 0, 0);
            }
          })
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            this.addComment_.setEnabled(this.commentInput_.getValue().length > 2);
            if (e.keyCode == '13') {
              e.preventDefault();
              e.stopPropagation();
            }
          }, this));
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
  var media = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram().media;
  this.showMedia(media);
};

/**
 * @param {brkn.model.Media} media 
 */
brkn.Sidebar.prototype.showMedia = function(media) {
  soy.renderElement(this.contentEl_, brkn.sidebar.info, {
    media: media
  });
  goog.dom.setTextContent(this.timeContext_, 'Now Playing');
  
  var viewersEl = goog.dom.getElementByClass('viewers', this.getElement());
  
  goog.net.XhrIo.send(
      '/_seen',
      goog.bind(function() {
        
        goog.net.XhrIo.send('/_seen/' + media.id, function(e) {
          var seen = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          goog.style.showElement(viewersEl, seen.length);
          goog.array.forEach(seen, function(viewer) {
            var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
              user: brkn.model.Users.getInstance().get_or_add(viewer)
            })
            goog.dom.appendChild(viewersEl, viewerEl);
          }, this);
        });
        
        
        
      }, this),
      'POST',
      'id=' + media.id);
};
