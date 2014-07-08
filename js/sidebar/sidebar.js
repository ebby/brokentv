goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Channels');
DESKTOP && goog.require('brkn.model.Controller');
goog.require('brkn.model.Sidebar');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.Admin');
goog.require('brkn.sidebar.Conversation');
goog.require('brkn.sidebar.Info');
goog.require('brkn.sidebar.MediaList');
goog.require('brkn.sidebar.Profile');
goog.require('brkn.sidebar.Stream');

goog.require('goog.events.KeyHandler.EventType');
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
   * @type {brkn.sidebar.FriendList}
   * @private
   */
  this.friendList_;

  /**
   * @type {Object.<string, Element>}
   */
  this.tabs_ = {};

  /**
   * @type {Array}
   */
  this.tabNames_ = [];

  /**
   * @type {Array.<Array>}
   * @private
   */
  this.screens_ = [];

  /**
   * @type {number}
   * @private
   */
  this.activitiesCount_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.inboxCount_ = 0;
};
goog.inherits(brkn.Sidebar, goog.ui.Component);


/**
 * @type {brkn.model.Media}
 * @private
 */
brkn.Sidebar.prototype.currentMedia_;


/**
 * @type {brkn.sidebar.Profile}
 * @private
 */
brkn.Sidebar.prototype.profile_;


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
brkn.Sidebar.prototype.arrowEl_;


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


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.conversationEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.friendListEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.activitiesCountEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.inboxCountEl_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.arrowEl_ = goog.dom.getElementByClass('arrow', this.toolbar_);
  this.contentEl_ = goog.dom.getElement('sidebar-content');
  this.mediaListEl_ = goog.dom.getElement('media-list');
  this.profileEl_ = goog.dom.getElement('profile');
  this.friendListEl_ = goog.dom.getElement('friendlist');
  this.conversationEl_ = goog.dom.getElement('conversation');
  this.toolbar_ = goog.dom.getElement('toolbar');
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());
  this.activitiesCountEl_ = goog.dom.getElementByClass('activities-count', this.getElement());
  this.inboxCountEl_ = goog.dom.getElementByClass('inbox-count', this.getElement());
  var keyHandler = new goog.events.KeyHandler(document);

  goog.array.forEach(goog.dom.getChildren(this.tabsEl_), function(tab) {
    var tabName = goog.dom.classes.get(tab)[0];
    this.tabs_[tabName] = tab;
    this.tabNames_.push(tabName);
  }, this);

  if (!brkn.model.Users.getInstance().currentUser.loggedIn) {
    this.tabs_['stream'] && goog.style.showElement(this.tabs_['stream'], false);
    this.tabs_['profile'] && goog.style.showElement(this.tabs_['profile'], false);
    this.tabs_['login'] && goog.style.showElement(this.tabs_['login'], true);
  } else {
    this.fetchAndRenderStream_();
    this.starred_ = new brkn.sidebar.Profile(brkn.model.Users.getInstance().currentUser);
    this.starred_.decorate(goog.dom.getElement('my-profile'));
  }

  this.onNextProgram_();

  if (this.info_ && (DESKTOP || !brkn.model.Users.getInstance().currentUser.loggedIn ||
      (brkn.model.Channels.getInstance().currentChannel.myChannel &&
          brkn.model.Channels.getInstance().currentChannel.getCurrentProgram()))) {
    this.currentScreen_ = goog.dom.getElement('info');
    this.currentTab_ = 'info';
    this.tabNav_('info', 'info');
  } else {
    this.currentScreen_ = goog.dom.getElement('stream');
    this.currentTab_ = 'stream';
    this.tabNav_('info', 'stream');
  }
  var direction = 'left';
  goog.array.forEach(this.tabNames_, function(name) {
    var tab = goog.dom.getElementByClass(name, this.contentEl_);
    if (name == this.currentTab_) {
      direction = 'right';
      return;
    }
    goog.dom.classes.add(tab, direction);
  }, this);

  this.screens_ = [this.currentScreen_, '']
  goog.dom.classes.add(this.currentScreen_, 'current');


  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.LOGGED_IN, function() {
    this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();
    if (this.isAdmin_) {
        this.admin_.decorate(goog.dom.getElement('admin'));
        var adminTab = soy.renderAsElement(brkn.sidebar.tab,
            {name: 'ADMIN', className: 'admin'});
        goog.dom.appendChild(this.tabsEl_, adminTab);
        this.tabs_['admin'] = adminTab;
        this.tabNames_.push('admin');
    }
  }, this);

  this.updateArrow_();

  this.getHandler()
      .listen(goog.dom.getElementByClass('back-button', this.toolbar_),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            var backScreenArr = this.screens_.shift();
            this.navigate(backScreenArr[0], true, backScreenArr[1]);
            this.updateArrow_();
            e.stopPropagation();
          }, this))
      .listen(this.tabsEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            var lastTab = this.currentTab_;
            var tab = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
            var tabName = goog.dom.classes.get(tab)[0];

            if (tabName == 'login') {
              if (this.info_) {
                this.info_.login();
              }
              return;
            }

            this.tabNav_(this.currentTab_, tabName);
            goog.dom.classes.add(tab, 'selected');
            this.updateArrow_();
            if (lastTab != this.currentTab_) {
              e.stopPropagation();
            }
            if (tabName == 'stream') {
              this.newActivities_(0, true);
            }
          }, this))
      .listen(this.toolbar_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            var tab = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
            if ((tab && goog.dom.classes.get(tab)[0] == this.currentTab_) || !tab) {
              var scrollAnim = new goog.fx.dom.Scroll(this.currentScreen_,
                  [this.currentScreen_.scrollLeft, this.currentScreen_.scrollTop],
                  [this.currentScreen_.scrollLeft, 0], 300);
              scrollAnim.play();
            }
          }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            if (e.ctrlKey && e.keyCode == '68') {
              goog.dom.classes.toggle(this.getElement(), 'dark');
            }
          }, this));

  if (DESKTOP) {
    brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
        function(show) {
          goog.dom.classes.enable(this.getElement(), 'toggled', show);
          goog.Timer.callOnce(goog.bind(function() {
            goog.dom.classes.enable(this.getElement(), 'collapsed', !show);
          }, this), !show ? 500 : 0);
        }, this);
  }

  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.NAVIGATE,
      this.navigate, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.NEW_ACTIVITIES,
      this.newActivities_, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.NEW_MESSAGES,
      this.newMessages_, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.CONVERSATION,
      this.showConversation, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.MEDIA_LIST,
      this.showMediaList, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.MEDIA_INFO,
      this.showMediaInfo, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.FRIEND_LIST,
      this.showFriendList, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.PROFILE,
      this.showProfile, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      this.onNextProgram_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.onNextProgram_, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.onChangeChannel_, this);
  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.LOGGED_IN, function() {
    if (!EMBED) {
      goog.style.showElement(this.tabs_['stream'], true);
      goog.style.showElement(this.tabs_['profile'], true);
      goog.style.showElement(this.tabs_['login'], false);
      this.fetchAndRenderStream_();
    }
    this.starred_ = new brkn.sidebar.Profile(brkn.model.Users.getInstance().currentUser);
    this.starred_.decorate(goog.dom.getElement('my-profile'));
    this.updateArrow_();
  }, this);

  if (DESKTOP) {
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
  }
};


/**
 * @private
 */
brkn.Sidebar.prototype.fetchAndRenderStream_ = function() {
  goog.net.XhrIo.send(
      '/_activity',
      goog.bind(function(e) {
        var response = e.target.getResponseJson();
        var activities = /** @type {Array.<Object>} */ response['activities'];
        this.stream_ = new brkn.sidebar.Stream(activities);
        this.stream_.decorate(goog.dom.getElement('stream'));
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_ACTIVITIES,
            parseInt(response['new_count'], 10));
      }, this));
};


/**
 * @param {number} count
 * @param {?number=} opt_reset
 * @private
 */
brkn.Sidebar.prototype.newActivities_ = function(count, opt_reset) {
  if (opt_reset) {
    this.activitiesCount_ = 0;
    goog.style.showElement(this.activitiesCountEl_, false);
  }
  this.activitiesCount_ += count;
  goog.dom.setTextContent(this.activitiesCountEl_, this.activitiesCount_.toString());
  goog.style.showElement(this.activitiesCountEl_, !!this.activitiesCount_);
};


/**
 * @param {number} count
 * @param {?number=} opt_reset
 * @private
 */
brkn.Sidebar.prototype.newMessages_ = function(count, opt_reset) {
  if (opt_reset) {
    this.inboxCount_ = 0;
    goog.style.showElement(this.inboxCountEl_, false);
  }
  this.inboxCount_ += count;
  this.inboxCount_ = Math.max(this.inboxCount_, 0);
  goog.dom.setTextContent(this.inboxCountEl_, this.inboxCount_.toString());
  if (this.inboxCount_ > 0) {
    document.title = '(' + this.inboxCount_.toString() + ')' + ' XYLO';
  } else {
    document.title = 'XYLO';
  }
  goog.style.showElement(this.inboxCountEl_, !!this.inboxCount_);
};


/**
 * @param {?brkn.model.Program=} opt_program
 */
brkn.Sidebar.prototype.onNextProgram_ = function(opt_program) {
  var program = opt_program || brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (program) {
    this.currentMedia_ = program.media;

    if (!this.info_ || this.currentMedia_.id != this.info_.getModel().id) {
      var input = this.info_ && this.info_.getInput() ? this.info_.getInput() : null;
      var lastMedia = this.info_ ? this.info_.getMedia() : null;
      goog.dispose(this.info_);
      this.info_ = new brkn.sidebar.Info(this.currentMedia_, false, lastMedia, input, undefined, program);
      this.info_.decorate(goog.dom.getElement('info'));
    }
  }
};


/**
 * @param {?brkn.model.Channel=} opt_channel
 */
brkn.Sidebar.prototype.onChangeChannel_ = function(opt_channel) {
  var channel = opt_channel || brkn.model.Channels.getInstance().currentChannel;
  this.currentMedia_ = channel.getCurrentProgram() && channel.getCurrentProgram().media;
  if (this.currentMedia_) {
    // In case the channel is empty
    if (!this.info_ || this.currentMedia_.id != this.info_.getModel().id) {
      goog.dispose(this.info_);
      this.info_ = new brkn.sidebar.Info(this.currentMedia_);
      this.info_.decorate(goog.dom.getElement('info'));
      this.showMediaInfo(this.currentMedia_);
    }
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
  var right = fromIndex < toIndex;
  var i = right ? 0 : this.tabNames_.length - 1;
  var condition = right ? i < this.tabNames_.length : i >= 0;
  for (i; condition; i += right ? 1 : -1) {
    var name = this.tabNames_[i];
    var tab = goog.dom.getElementByClass(name, this.contentEl_);
    if ((right && i > toIndex) || (!right && i < toIndex)) {
      goog.dom.classes.add(tab, 'right');
      goog.dom.classes.remove(tab, 'left');
    } else if ((right && i < toIndex) || (!right && i > toIndex)) {
      goog.dom.classes.enable(tab, 'left', right);
      goog.dom.classes.add(tab, 'right');
    } else if (i == toIndex) {
      goog.dom.classes.remove(tab, 'right');
      goog.dom.classes.remove(tab, 'left');
      break;
    }
  }

  this.currentTab_ = to;
  goog.array.insertAt(this.screens_, [this.currentScreen_, ''], 0);
  goog.dom.classes.remove(this.currentScreen_, 'current');
  this.currentScreen_ = toScreen;
  goog.dom.classes.add(this.currentScreen_, 'current');
  this.updateArrow_();
};


/**
 * @param {Element} to The to element
 * @param {?boolean=} opt_back Back
 * @param {?string=} opt_title Title of the navigated section
 */
brkn.Sidebar.prototype.navigate = function(to, opt_back, opt_title) {
  if (to == this.currentScreen_) {
    if (opt_title) {
      goog.dom.setTextContent(goog.dom.getElementByClass('back-title', this.toolbar_), opt_title);
    }
    return;
  }

  var isScreen = goog.dom.classes.has(this.currentScreen_, 'screen');
  if (opt_back) {
    goog.dom.classes.remove(this.currentScreen_, 'on');
    goog.dom.classes.remove(this.currentScreen_, 'current');
    goog.dom.classes.add(to, 'current');
    this.currentScreen_ = to;
  } else {
    goog.dom.classes.enable(this.currentScreen_, 'on', !isScreen);
    goog.array.insertAt(this.screens_, [this.currentScreen_,
        goog.dom.getTextContent(goog.dom.getElementByClass('back-title', this.toolbar_))], 0);
    goog.dom.classes.remove(this.currentScreen_, 'current');
    this.currentScreen_ = to;
    goog.dom.classes.add(this.currentScreen_, 'current');
  }
  goog.dom.classes.enable(this.toolbar_, 'back', goog.dom.classes.has(this.currentScreen_, 'slide'));
  if (opt_title) {
    goog.dom.setTextContent(goog.dom.getElementByClass('back-title', this.toolbar_), opt_title);
  }
  if (this.currentScreen_ != this.profileEl_) {
    brkn.model.Sidebar.getInstance().currentProfileId = null;
  }
};


/**
 * @param {brkn.model.Media} media
 * @param {?Array.<brkn.model.Comment>=} opt_comments
 * @param {?Array.<brkn.model.Tweet>=} opt_tweets
 * @param {?boolean=} opt_twitter
 */
brkn.Sidebar.prototype.showConversation = function(media, opt_comments, opt_tweets, opt_twitter) {
  var conversation = new brkn.sidebar.Conversation(media, opt_comments, opt_tweets, opt_twitter);
  conversation.decorate(this.conversationEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.conversationEl_, false, media.name);
};


/**
 * @param {string} name
 * @param {?Array.<brkn.model.Media>=} opt_medias
 * @param {?string=} opt_url
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 * @param {?string=} opt_link
 * @param {?string=} opt_descUrl
 */
brkn.Sidebar.prototype.showMediaList = function(name, opt_medias, opt_url, opt_thumb, opt_desc,
    opt_link, opt_descUrl) {
  var mediaList = new brkn.sidebar.MediaList(opt_medias, opt_url, opt_thumb, opt_desc,
      opt_link, opt_descUrl);
  mediaList.decorate(this.mediaListEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.mediaListEl_, false, name, opt_thumb, opt_desc);
};


/**
 */
brkn.Sidebar.prototype.showFriendList = function() {
  this.friendList_ = new brkn.sidebar.FriendList(undefined, true);
  this.friendList_.decorate(this.friendListEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.friendListEl_, false, 'Friends');
};


/**
 * @param {brkn.model.Media} media
 * @param {?boolean=} opt_noFetch
 * @param {?brkn.model.Media=} opt_lastMedia
 * @param {?string=} opt_lastInput
 * @param {?brkn.model.Program=} opt_program
 */
brkn.Sidebar.prototype.showMediaInfo = function(media, opt_noFetch, opt_lastMedia, opt_lastInput, opt_program) {
  if (this.info_ && media.id == this.info_.getModel().id) {
    goog.dom.classes.remove(this.toolbar_, 'back');
    var lastScreen = this.screens_[0][0];
    while (lastScreen && goog.dom.classes.has(lastScreen, 'slide')) {
      lastScreen = this.screens_.shift();
    }
    this.tabNav_(this.currentTab_, 'info');
  } else {
    var mediaInfoEl = goog.dom.getElement('media-info');
    var mediaInfo = new brkn.sidebar.Info(media, opt_noFetch, opt_lastMedia, opt_lastInput, undefined, opt_program);
    mediaInfo.decorate(mediaInfoEl);
    brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
        mediaInfoEl, false, media.name);
  }
  DESKTOP && brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, true);
};


/**
 * @param {brkn.model.User} user
 */
brkn.Sidebar.prototype.showProfile = function(user) {
  if (this.profile_ && this.profile_.getModel().id == user.id &&
      this.currentScreen_ == this.profileEl_) {
    return;
  }
  brkn.model.Sidebar.getInstance().currentProfileId = user.id;
  this.profile_ = new brkn.sidebar.Profile(user);
  this.profile_.decorate(this.profileEl_);
  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
      this.profileEl_, false, user.name);
  DESKTOP && brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, true);
};


/**
 * @private
 */
brkn.Sidebar.prototype.updateArrow_ = function() {
  var pos = Math.round(goog.style.getSize(this.tabs_[this.currentTab_]).width/2 +
      goog.style.getPosition(this.tabs_[this.currentTab_]).x);
  this.arrowEl_.style.transform = 'translate3d(' + pos + 'px, 0,0)';
  this.arrowEl_.style.msTransform = 'translate3d(' + pos + 'px, 0,0)';
  this.arrowEl_.style.WebkitTransform = 'translate3d(' + pos + 'px, 0,0)';
  this.arrowEl_.style.MozTransform = 'translate3d(' + pos + 'px, 0,0)';
  this.arrowEl_.style.OTransform = 'translate3d(' + pos + 'px, 0,0)';
};
