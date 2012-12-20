goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Controller');
goog.require('brkn.model.Sidebar');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.Admin');
goog.require('brkn.sidebar.CommentInput');
goog.require('brkn.sidebar.Info');

goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Sidebar = function() {
  goog.base(this);
  
  
  this.isAdmin_ = true;
  
  /**
   * @type {brkn.sidebar.Admin}
   * @private
   */
  this.admin_ = new brkn.sidebar.Admin();
  
  /**
   * @type {brkn.sidebar.Info}
   * @private
   */
  this.info_;
  
  /**
   * @type {brkn.sidebar.CommentInput}
   * @private
   */
  this.commentInput_ = new brkn.sidebar.CommentInput();
};
goog.inherits(brkn.Sidebar, goog.ui.Component);


/**
 * @type {brkn.model.Media}
 * @private
 */
brkn.Sidebar.prototype.currentMedia_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.lastScreen_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.currentScreen_;

/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.currentTab_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.currentMedia_ = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram().media;

  var contentEl = goog.dom.getElement('sidebar-content');
  this.admin_.decorate(goog.dom.getElement('admin'));
  this.info_ = new brkn.sidebar.Info(this.currentMedia_);
  this.info_.decorate(goog.dom.getElement('info'));
  this.commentInput_.decorate(goog.dom.getElementByClass('comment-input', this.getElement()));
  
  goog.dom.classes.add(this.info_.getElement(), 'current');
  this.currentScreen_ = this.info_.getElement();
  
  this.toolbar_ = goog.dom.getElement('toolbar');
  this.tabs_ = goog.dom.getElementByClass('tabs', this.getElement());
  this.currentTab_ = goog.dom.getElementByClass('tab', this.tabs_);
  
  if (this.isAdmin_) {
    goog.dom.appendChild(this.tabs_, soy.renderAsElement(brkn.sidebar.tab,
        {name: 'Admin', className: 'admine'}));
    goog.style.setPosition(goog.dom.getElementByClass('arrow', this.toolbar_),
        goog.style.getSize(this.currentTab_).width/2 + goog.style.getPosition(this.currentTab_).x);
  }

  this.getHandler()
      .listen(window, 'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.info_.resize, this)))
      .listen(this.commentInput_,
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            this.info_.resize(brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT);
          }, this))
      .listen(this.commentInput_,
          'add',
          goog.bind(function(e) {
            goog.net.XhrIo.send(
                '/_comment',
                e.callback,
                'POST',
                'media_id=' + this.currentMedia_.id + '&text=' + e.text);
          }, this))
      .listen(this.commentInput_,
          'resize',
          goog.bind(function(e) {
            this.info_.resize(brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT +
                (e.target.height_ - brkn.sidebar.CommentInput.INPUT_HEIGHT))
          }, this))
      .listen(this.getElement(),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              goog.dom.classes.remove(goog.dom.getElement('comment-textarea'), 'focused');
              this.commentInput_.collapse();
              this.info_.resize();
            }
          }, this))
      .listen(goog.dom.getElementByClass('back-button', this.toolbar_),
          goog.events.EventType.CLICK,
          goog.bind(function() {
            goog.dom.classes.remove(this.toolbar_, 'back');
            this.navigate(this.lastScreen_);
          }, this))
      .listen(this.tabs_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            var tab = goog.dom.getAncestorByClass(e.target, 'tab');
            goog.dom.classes.remove(this.currentTab_, 'selected');
            this.currentTab_ = tab;
            goog.dom.classes.add(tab, 'selected');
            this.navigate(goog.dom.classes.has(tab, 'info')
                ? this.info_.getElement() : this.admin_.getElement(), undefined, undefined, true);
            goog.style.setPosition(goog.dom.getElementByClass('arrow', this.toolbar_),
                goog.style.getSize(tab).width/2 + goog.style.getPosition(tab).x);
          }, this));
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.NAVIGATE,
      this.navigate, this);
};


/**
 * @param {Element} to The to element
 * @param {?boolean=} opt_back Back
 * @param {?string=} opt_title Title of the navigated section
 * @param {?boolean=} opt_invert Invert animation direction
 */
brkn.Sidebar.prototype.navigate = function(to, opt_back, opt_title, opt_invert) {
  if (to == this.currentScreen_) {
    return;
  }
  
  if (this.lastScreen_ != to) {
    goog.dom.classes.enable(this.toolbar_, 'back', !!opt_back);
    goog.style.setStyle(this.currentScreen_, {
      'left': opt_invert ? '' : 0,
      'right': opt_invert ? 0 : ''
    });
    goog.style.setStyle(to, {
      'right': opt_invert ? '' : 0,
      'left': opt_invert ? 0 : ''
    }); 
  }

  this.lastScreen_ = this.currentScreen_;
  this.currentScreen_ = to;

  if (opt_title) {
    goog.dom.setTextContent(goog.dom.getElementByClass('back-title', this.toolbar_), opt_title);
  }

  goog.dom.classes.remove(this.lastScreen_, 'current');
  goog.dom.classes.add(this.currentScreen_, 'current');
};
