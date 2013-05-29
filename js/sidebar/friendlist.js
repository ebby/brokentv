goog.provide('brkn.sidebar.FriendList');

goog.require('soy');
goog.require('brkn.model.User');
goog.require('brkn.sidebar.friendlist');

goog.require('goog.Timer');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @param {?Array.<brkn.model.User>=} opt_users
 * @param {?boolean=} opt_showOffline
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.FriendList = function(opt_users, opt_showOffline) {
  goog.base(this);

  /**
   * @type {?Array.<brkn.model.User>}
   * @private
   */
  this.users_ = opt_users || null;
  
  /**
   * @type {Object.<string, Element>}
   * @private
   */
  this.userMap_ = {};

  /**
   * @type {Array.<brkn.model.User>}
   * @private
   */
  this.onlineUsers_ = [];

  /**
   * @type {Array.<brkn.model.User>}
   * @private
   */
  this.offlineUsers_ = [];
  
  /**
   * @type {Array.<brkn.model.User>}
   * @private
   */
  this.recentUsers_ = [];

  /**
   * @type {boolean}
   * @private
   */
  this.showOffline_ = !!opt_showOffline;
  
  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;
};
goog.inherits(brkn.sidebar.FriendList, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.onlineEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.offlineEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.recentEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.onlineLabel_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.recentLabel_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.FriendList.prototype.offlineLabel_;


/** @inheritDoc */
brkn.sidebar.FriendList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;
  
  goog.dom.classes.add(el, 'friendlist');
  goog.dom.classes.add(el, 'ios-scroll');
  
  if (!this.showOffline_) {
    var allFriends = goog.dom.createDom('div', 'label show-all',
        goog.dom.createDom('a', {'href': '#friendlist:1'}, 'ALL FRIENDS >'));
    goog.dom.appendChild(this.getElement(), allFriends);
  }
  
  this.onlineLabel_ = goog.dom.createDom('div', 'label online-friends-label',
      this.showOffline_ ? 'ONLINE FRIENDS' :
          goog.dom.createDom('a', {'href': '#friendlist:1'}, 'ONLINE FRIENDS'));
  goog.style.showElement(this.onlineLabel_, false);
  goog.dom.appendChild(this.getElement(), this.onlineLabel_);
  this.onlineEl_ = goog.dom.createDom('div', 'online-friends');
  goog.dom.appendChild(this.getElement(), this.onlineEl_);

  this.recentLabel_ = goog.dom.createDom('div', 'label',
      this.showOffline_ ? 'RECENTLY ONLINE' :
          goog.dom.createDom('a', {'href': '#friendlist:1'}, 'RECENTLY ONLINE'));
  goog.style.showElement(this.recentLabel_, false);
  goog.dom.appendChild(this.getElement(), this.recentLabel_);
  this.recentEl_ = goog.dom.createDom('div', 'recent-friends');
  goog.dom.appendChild(this.getElement(), this.recentEl_); 

  if (this.showOffline_) {
    this.offlineLabel_ = goog.dom.createDom('div', 'label', 'OFFLINE FRIENDS');
    goog.style.showElement(this.offlineLabel_, false);
    goog.dom.appendChild(this.getElement(), this.offlineLabel_);
    this.offlineEl_ = goog.dom.createDom('div', 'offline-friends');
    goog.dom.appendChild(this.getElement(), this.offlineEl_); 
    
    goog.net.XhrIo.send(
        '/_friends?offline=1',
        goog.bind(function(e) {
          var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
          this.offlineUsers_ = goog.array.map(response, function(u) {
            var user = brkn.model.Users.getInstance().get_or_add(u);
            this.addUser_(user, true);
            return user;
          }, this);
        }, this));
    
    this.showOffline_ && this.resize();
    this.getHandler().listen(window, 'resize', goog.bind(function() {
      this.showOffline_ && goog.Timer.callOnce(goog.bind(function() {
        this.resize();
      }, this));
    }, this));
  }

  if (this.users_) {
    goog.array.sort(this.users_, function(u1, u2) {
      if (u1.lastLogin && !u2.lastLogin) {
        return 1;
      } else if (!u1.lastLogin && u2.lastLogin) {
        return -1;
      } else if (!u1.lastLogin && !u2.lastLogin) {
        return 0;
      } else {
        return u1.lastLogin.getTime() < u2.lastLogin.getTime() ? 1 : -1;
      }
    });
    goog.array.forEach(this.users_, function(u) {
      this.addUser_(u)
    }, this);
  } else {
    brkn.model.Users.getInstance().getFriends(goog.bind(function(friends) {
      this.users_ = friends;
      goog.array.sort(this.users_, function(u1, u2) {
        if (u1.lastLogin && !u2.lastLogin) {
          return 1;
        } else if (!u1.lastLogin && u2.lastLogin) {
          return -1;
        } else if (!u1.lastLogin && !u2.lastLogin) {
          return 0;
        } else {
          return u1.lastLogin.getTime() < u2.lastLogin.getTime() ? 1 : -1;
        }
      });
      goog.array.forEach(this.users_, function(u) {
        this.addUser_(u)
      }, this);
    }, this));
  }

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.ONLINE, this.updateStatus_, this);
};


/**
 * @param {brkn.model.User} user
 * @param {?boolean=} opt_offlineOnly
 */
brkn.sidebar.FriendList.prototype.addUser_ = function(user, opt_offlineOnly) {
  var inserted = false;
  var lastLogin = user.lastLogin ? goog.date.relative.format(user.lastLogin.getTime()) : null;
  
  var userEl = soy.renderAsElement(brkn.sidebar.friendlist.user, {
    user: user,
    timestamp: lastLogin,
    media: user.currentMedia
  });

  if (user.lastLogin && (goog.now() - user.lastLogin.getTime() < 43200000)) {
    brkn.model.Clock.getInstance().addTimestamp(user.lastLogin,
        goog.dom.getElementByClass('timestamp', userEl));
  }
  
  if (user.online && !opt_offlineOnly) {
    goog.style.showElement(this.onlineLabel_, true);
    goog.dom.classes.add(userEl, 'online');
    goog.array.forEach(this.onlineUsers_, function(u, i) {
      if (u.firstName() > user.firstName()) {
        goog.dom.insertChildAt(this.onlineEl_, userEl, i);
        goog.array.insertAt(this.onlineUsers_, user, i);
        inserted = true;
      }
    }, this);  
    if (!inserted) {
      goog.dom.appendChild(this.onlineEl_, userEl);
      this.onlineUsers_.push(user);
    }
  } else if (lastLogin && (this.recentUsers_.length < 4 || opt_offlineOnly)) {
    goog.style.showElement(this.recentLabel_, true);
    goog.array.forEach(this.recentUsers_, function(u, i) {
      if (u.lastLogin && user.lastLogin && u.lastLogin.getTime() < user.lastLogin.getTime()) {
        goog.dom.insertChildAt(this.recentEl_, userEl, i);
        goog.array.insertAt(this.recentUsers_, user, i);
        inserted = true;
      }
    }, this);
    if (!inserted) {
      goog.dom.appendChild(this.recentEl_, userEl);
      this.recentUsers_.push(user);
    }
  } else if (this.showOffline_ &&
      !goog.array.find(this.recentUsers_, function(f) {return user.id == f.id}) &&
      !goog.array.find(this.offlineUsers_, function(f) {return user.id == f.id})) {
    goog.style.showElement(this.offlineLabel_, true);
    goog.array.forEach(this.offlineUsers_, function(u, i) {
      if (u.lastLogin && user.lastLogin && u.lastLogin.getTime() < user.lastLogin.getTime()) {
        goog.dom.insertChildAt(this.offlineEl_, userEl, i);
        goog.array.insertAt(this.offlineUsers_, user, i);
        inserted = true;
      }
    }, this);  
    if (!inserted) {
      goog.dom.appendChild(this.offlineEl_, userEl);
      this.offlineUsers_.push(user);
    }
  }
  
  if (!this.showOffline_) {
    goog.style.showElement(this.recentLabel_, !this.onlineUsers_.length);
    goog.style.showElement(this.recentEl_, !this.onlineUsers_.length)
  };

  this.userMap_[user.id] = userEl;
  var media = goog.dom.getElementByClass('media-link', userEl);
  this.getHandler().listen(userEl, goog.events.EventType.CLICK, goog.bind(function() {
    brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user);
  }, this));
  if (media) {
    this.getHandler().listen(media, goog.events.EventType.CLICK, goog.bind(function(e) {
      e.stopPropagation();
      e.preventDefault();
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO,
          user.currentMedia);
    }, this));
  }
};


/**
 * @param {brkn.model.User} user
 * @param {boolean} online
 */
brkn.sidebar.FriendList.prototype.updateStatus_ = function(user, online) {
  var inserted = false;
  
  var userEl = this.userMap_[user.id];
  if (userEl) {
    goog.dom.removeNode(userEl);
    if (goog.array.removeIf(this.offlineUsers_, function(u) { return u.id == user.id; })) {
      goog.style.showElement(this.offlineLabel_, !!this.offlineUsers_.length);
    }
    if (goog.array.removeIf(this.onlineUsers_, function(u) { return u.id == user.id; })) {
      goog.style.showElement(this.onlineLabel_, !!this.onlineUsers_.length);
    }
    if (goog.array.removeIf(this.recentUsers_, function(u) { return u.id == user.id; })) {
      goog.style.showElement(this.recentLabel_, !!this.recentUsers_.length);
    }
  }
  this.addUser_(user);
};

/**
 * @param {?number=} opt_extra Extra space to subtract
 * @private
 */
brkn.sidebar.FriendList.prototype.resize = function(opt_extra) {
  this.resizeExtra_ = opt_extra || this.resizeExtra_;
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 42 -
      this.resizeExtra_ - (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
};
