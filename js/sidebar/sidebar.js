goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Channels');
goog.require('brkn.model.Controller');
goog.require('brkn.model.Sidebar');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.Admin');
goog.require('brkn.sidebar.Info');
goog.require('brkn.sidebar.MediaList');
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
   * @type {brkn.sidebar.Profile}
   * @private
   */
  this.starred_;
  
  /**
   * @type {brkn.sidebar.Stream}
   * @private
   */
  this.stream_;

  /**
   * @type {Object.<string, Element>}
   */
  this.tabs_ = {};
  
  /**
   * @type {Array}
   */
  this.tabNames_ = [];
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
 * @type {string}
 * @private
 */
brkn.Sidebar.prototype.currentTab_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.contentEl_;


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

  this.contentEl_ = goog.dom.getElement('sidebar-content');
  this.mediaListEl_ = goog.dom.getElement('media-list');
  this.profileEl_ = goog.dom.getElement('profile');
  this.toolbar_ = goog.dom.getElement('toolbar');
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());
  
  goog.array.forEach(goog.dom.getChildren(this.tabsEl_), function(tab) {
    var tabName = goog.dom.classes.get(tab)[0];
    this.tabs_[tabName] = tab;
    this.tabNames_.push(tabName);
  }, this);

  this.onNextProgram_();
  this.fetchAndRenderStream_();
  
  this.starred_ = new brkn.sidebar.Profile(brkn.model.Users.getInstance().currentUser);
  this.starred_.decorate(goog.dom.getElement('my-profile'));

  if (this.info_) {
    this.currentScreen_ = this.info_.getElement();
    this.currentTab_ = 'info';
  } else {
    this.currentScreen_ = goog.dom.getElement('stream');
    this.currentTab_ = 'stream';
  }
  goog.dom.classes.add(this.currentScreen_, 'current');
  
  if (this.isAdmin_) {
    this.admin_.decorate(goog.dom.getElement('admin'));
    var adminTab = soy.renderAsElement(brkn.sidebar.tab,
        {name: 'ADMIN', className: 'admin'});
    goog.dom.appendChild(this.tabsEl_, adminTab);
    this.tabs_['admin'] = adminTab;
    this.tabNames_.push('admin');
  }
  
  this.updateArrow_();

  this.getHandler()
      .listen(goog.dom.getElementByClass('back-button', this.toolbar_),
          goog.events.EventType.CLICK,
          goog.bind(function() {
            goog.dom.classes.remove(this.toolbar_, 'back');
            this.navigate(this.lastScreen_);
          }, this))
      .listen(this.tabsEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            var tab = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
            var tabName = goog.dom.classes.get(tab)[0];   
            this.tabNav_(this.currentTab_, tabName); 
            goog.dom.classes.add(tab, 'selected');
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
        if (show) {
          brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
              true);
          this.tabNav_(this.currentTab_, 'admin');
        } else if (this.currentTab_ == 'admin') {
          this.tabNav_('admin', 'info');
        }
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
 * @param {string} from The from element
 * @param {string} to The to element
 * @suppress {uselessCode}
 */
brkn.Sidebar.prototype.tabNav_ = function(from, to) {
  var toScreen = goog.dom.getElementByClass(to, this.contentEl_);
  var fromIndex = goog.array.indexOf(this.tabNames_, from);
  var toIndex = goog.array.indexOf(this.tabNames_, to);
  var right = goog.array.indexOf(this.tabNames_, from) < toIndex;
  var i = right ? 0 : this.tabNames_.length - 1;
  var condition = right ? i < this.tabNames_.length : i >= 0;
  for (i; condition; i += right ? 1 : -1) {
    var name = this.tabNames_[i];
    var tab = goog.dom.getElementByClass(name, this.contentEl_);
    if ((right && i > toIndex) || (!right && i < toIndex)) {
      goog.style.setStyle(tab, {
        'left': '',
        'right': ''
      });
    } else if ((right && i < toIndex) || (!right && i > toIndex)) {
      goog.style.setStyle(tab, {
        'left': right ? '-300px' : '',
        'right': ''
      });
    } else if (i == toIndex) {
      goog.style.setStyle(tab, {
        'right': right ? 0 : '',
        'left': ''
      });
      break;
    }
  }

  this.currentTab_ = to;  
  this.lastScreen_ = this.currentScreen_;
  this.currentScreen_ = toScreen;
  goog.dom.classes.remove(this.lastScreen_, 'current');
  goog.dom.classes.add(this.currentScreen_, 'current');
  this.updateArrow_(); 
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
  if (this.info_ && media.id == this.info_.getModel().id) {
    goog.dom.classes.remove(this.toolbar_, 'back');
    this.navigate(this.info_.getElement());
    this.tabNav_(this.currentTab_, 'info');
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


/**
 * @private
 */
brkn.Sidebar.prototype.updateArrow_ = function() {
  goog.style.setPosition(goog.dom.getElementByClass('arrow', this.toolbar_),
      goog.style.getSize(this.tabs_[this.currentTab_]).width/2 +
          goog.style.getPosition(this.tabs_[this.currentTab_]).x);
};
