goog.provide('brkn.sidebar.Info');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param  {brkn.model.Media} media
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Info = function(media) {
  goog.base(this);
  
  /**
   * @type {brkn.model.Media}
   * @private
   */
  this.media_ = media;
};
goog.inherits(brkn.sidebar.Info, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.commentsEl_;


/** @inheritDoc */
brkn.sidebar.Info.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.info, {
    media: this.media_
  });
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  var contentEl = soy.renderAsElement(brkn.sidebar.info, {
    media: this.media_
  });
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.media_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment_, this);
  
  var viewersEl = goog.dom.getElementByClass('viewers', this.getElement());
  this.commentsEl_ = goog.dom.getElementByClass('comments', this.getElement());

  goog.net.XhrIo.send(
      '/_seen',
      goog.bind(function() {
        
        goog.net.XhrIo.send('/_seen/' + this.media_.id, goog.bind(function(e) {
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
      'id=' + this.media_.id);

  goog.net.XhrIo.send('/_comment/' + this.media_.id, goog.bind(function(e) {
      var comments = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
      goog.style.showElement(this.commentsEl_, comments.length);
      goog.array.forEach(comments, function(comment) {
        var c = new brkn.model.Comment(comment);
        this.addComment_(c);
      }, this);
      this.resize();
    }, this));
  
  this.getHandler().listen(window, 'resize',
      goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
};


/**
 * @param {brkn.model.Comment} comment
 * @private
 */
brkn.sidebar.Info.prototype.addComment_ = function(comment) {
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    comment: comment
  });
  goog.dom.appendChild(this.commentsEl_, commentEl);
  this.resize(goog.dom.classes.has(goog.dom.getElement('comment-textarea'), 'focused')
      ? brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT : 0);
  goog.style.showElement(this.commentsEl_, true);
};

/**
 * @param {?number=} opt_extra Extra space to subtract
 */
brkn.sidebar.Info.prototype.resize = function(opt_extra) {
  var extra = opt_extra || 0;
  if (this.commentsEl_) {
    goog.style.setHeight(this.commentsEl_, goog.dom.getViewportSize().height -
        goog.style.getPosition(this.commentsEl_.parentElement).y - 120 - extra);
  }

  // Give the comment div a second/2 to resize, then scroll to bottom.
  goog.Timer.callOnce(goog.bind(function() {
    var scrollAnim = new goog.fx.dom.Scroll(this.commentsEl_,
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollTop],
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollHeight], 300);
    scrollAnim.play();
  }, this), opt_extra ? 0 : 100);
};
