goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Channels');
goog.require('brkn.model.Controller');
goog.require('brkn.model.Sidebar');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.Admin');
goog.require('brkn.sidebar.Info');
goog.require('brkn.sidebar.Profile');
goog.require('brkn.sidebar.Stream');

goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Sidebar = function() {
  goog.base(this);
  
  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();
  
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
   * @type {brkn.sidebar.MediaList}
   * @private
   */
  this.starred_;
  
  /**
   * @type {brkn.sidebar.Stream}
   * @private
   */
  this.stream_;
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


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.mediaListEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.profileEl_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var contentEl = goog.dom.getElement('sidebar-content');
  this.mediaListEl_ = goog.dom.getElement('media-list');
  this.profileEl_ = goog.dom.getElement('profile');
  this.onNextProgram_();
  
  goog.dom.classes.add(this.info_.getElement(), 'current');
  this.currentScreen_ = this.info_.getElement();
  
  this.toolbar_ = goog.dom.getElement('toolbar');
  this.tabs_ = goog.dom.getElementByClass('tabs', this.getElement());
  this.currentTab_ = goog.dom.getElementByClass('tab', this.tabs_);
  
  if (this.isAdmin_) {
    this.admin_.decorate(goog.dom.getElement('admin'));
    goog.dom.appendChild(this.tabs_, soy.renderAsElement(brkn.sidebar.tab,
        {name: 'Admin', className: 'admin'}));
  } 

  goog.style.setPosition(goog.dom.getElementByClass('arrow', this.toolbar_),
      goog.style.getSize(this.currentTab_).width/2 + goog.style.getPosition(this.currentTab_).x);
  
  this.fetchAndRenderStream_();
  this.fetchAndRenderStarred_();

  this.getHandler()
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
            if (goog.dom.classes.has(tab, 'info')) {
              this.shiftScreen(this.info_.getElement(), true);
            } else if (goog.dom.classes.has(tab, 'stream')) {
              var left = this.currentScreen_ == this.starred_.getElement();
              this.shiftScreen(this.stream_.getElement(), left);
            } else if (goog.dom.classes.has(tab, 'starred')) {
              var left = this.admin_ && this.currentScreen_ == this.admin_.getElement();
              this.shiftScreen(this.starred_.getElement(), left);
            } else if (this.admin_) {
              this.shiftScreen(this.admin_.getElement());
            }
            goog.style.setPosition(goog.dom.getElementByClass('arrow', this.toolbar_),
                goog.style.getSize(tab).width/2 + goog.style.getPosition(tab).x);
          }, this));
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.NAVIGATE,
      this.navigate, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.MEDIA_LIST,
      this.showMediaList, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.MEDIA_INFO,
      this.showMediaInfo, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.PROFILE,
      this.showProfile, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      this.onNextProgram_, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.onChangeChannel_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'admin', show);
      }, this);
};


/**
 * @private
 */
brkn.Sidebar.prototype.fetchAndRenderStream_ = function() {
  goog.net.XhrIo.send(
      '/_activity',
      goog.bind(function(e) {
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson();
        this.stream_ = new brkn.sidebar.Stream(activities);
        this.stream_.decorate(goog.dom.getElement('stream'));
      }, this));
};


/**
 * @private
 */
brkn.Sidebar.prototype.fetchAndRenderStarred_ = function() {
  goog.net.XhrIo.send(
      '/_star',
      goog.bind(function(e) {
        var medias = /** @type {Array.<Object>} */ e.target.getResponseJson();
        medias = goog.array.map(medias, function(m) {
          return new brkn.model.Media(m);
        });
        this.starred_ = new brkn.sidebar.MediaList(medias);
        this.starred_.decorate(goog.dom.getElement('starred'));
      }, this));
};


/**
 * @param {?brkn.model.Program=} opt_program
 */
brkn.Sidebar.prototype.onNextProgram_ = function(opt_program) {
  var program = opt_program || brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (program) {
    this.currentMedia_ = program.media;
    goog.dispose(this.info_);
    this.info_ = new brkn.sidebar.Info(this.currentMedia_);
    this.info_.decorate(goog.dom.getElement('info'));
  }
};


/**
 * @param {?brkn.model.Channel=} opt_channel
 */
brkn.Sidebar.prototype.onChangeChannel_ = function(opt_channel) {
  var channel = opt_channel || brkn.model.Channels.getInstance().currentChannel;
  this.currentMedia_ = channel.getCurrentProgram().media;
  if (this.currentMedia_) {
    // In case the channel is empty
    goog.dispose(this.info_);
    this.info_ = new brkn.sidebar.Info(this.currentMedia_);
    this.info_.decorate(goog.dom.getElement('info')); 
  }
};


/**
 * @param {Element} to The to element
 * @param {?boolean=} opt_left Animate left
 */
brkn.Sidebar.prototype.shiftScreen = function(to, opt_left) {
  if (to == this.currentScreen_) {
    return;
  }

  if (opt_left) {
    goog.style.setStyle(this.currentScreen_, {
      'left': '',
      'right': ''
    });
    goog.style.setStyle(to, {
      'right': '',
      'left': ''
    });
    goog.dom.classes.remove(this.currentScreen_, 'current');
    goog.dom.classes.add(to, 'current');
    this.currentScreen_ = to;
    this.lastScreen_ = this.currentScreen_;
  } else {
    goog.style.setStyle(this.currentScreen_, {
      'left': '-300px',
      'right': ''
    });
    goog.style.setStyle(to, {
      'right': 0,
      'left': ''
    }); 
    this.lastScreen_ = this.currentScreen_;
    this.currentScreen_ = to;
    goog.dom.classes.remove(this.lastScreen_, 'current');
    goog.dom.classes.add(this.currentScreen_, 'current');
  }
};
  

/**
 * @param {Element} to The to element
 * @param {?boolean=} opt_back Back
 * @param {?string=} opt_title Title of the navigated section
 */
brkn.Sidebar.prototype.navigate = function(to, opt_back, opt_title) {
  if (opt_title) {
    goog.dom.setTextContent(goog.dom.getElementByClass('back-title', this.toolbar_), opt_title);
  }
  if (to == this.currentScreen_) {
    return;
  }
  
  var isScreen = goog.dom.classes.has(this.currentScreen_, 'screen');
  if (this.lastScreen_ != to) {
    goog.style.setStyle(this.currentScreen_, {
      'left': isScreen ? 0 : '',
      'right': '',
      'width': isScreen ? 0 : ''
    });
    goog.style.setStyle(to, {
      'right': 0,
      'left': ''
    });
    this.lastScreen_ = this.currentScreen_;
    this.currentScreen_ = to;
    goog.dom.classes.remove(this.lastScreen_, 'current');
    goog.dom.classes.add(this.currentScreen_, 'current');
  } else {
    goog.style.setStyle(this.currentScreen_, {
      'left': '',
      'right': 0
    });
    goog.style.setStyle(to, {
      'right': '',
      'left': 0,
      'width': ''
    });
    goog.dom.classes.remove(this.currentScreen_, 'current');
    goog.dom.classes.add(to, 'current');
    this.currentScreen_ = to;
    this.lastScreen_ = null;
  }
  goog.dom.classes.enable(this.toolbar_, 'back', !!opt_back);
};


/**
 * @param {Array.<brkn.model.Media>} medias
 * @param {string} name
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 */
brkn.Sidebar.prototype.showMediaList = function(medias, name, opt_thumb, opt_desc) {
  var mediaList = new brkn.sidebar.MediaList(medias, opt_thumb, opt_desc);
  mediaList.decorate(this.mediaListEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.mediaListEl_, true, name, opt_thumb, opt_desc);
};


/**
 * @param {brkn.model.Media} media
 */
brkn.Sidebar.prototype.showMediaInfo = function(media) {
  if (media.id == this.info_.getModel().id) {
    goog.dom.classes.remove(this.toolbar_, 'back');
    this.navigate(this.info_.getElement());
  } else {
    var mediaInfoEl = goog.dom.getElement('media-info');
    var mediaInfo = new brkn.sidebar.Info(media);
    mediaInfo.decorate(mediaInfoEl);
    brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
        mediaInfoEl, true, media.name);
  }
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, true);
};


/**
 * @param {brkn.model.User} user
 */
brkn.Sidebar.prototype.showProfile = function(user) {
  var profile = new brkn.sidebar.Profile(user);
  profile.decorate(this.profileEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.profileEl_, true, user.name);
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, true);
};
