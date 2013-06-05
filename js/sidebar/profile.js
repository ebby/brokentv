goog.provide('brkn.sidebar.Profile');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.model.Medias');
goog.require('brkn.model.Message');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.MediaList');
goog.require('brkn.sidebar.Messages');
goog.require('brkn.sidebar.Notifications');
goog.require('brkn.sidebar.Stream');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param  {brkn.model.User} user
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Profile = function(user) {
  goog.base(this);
  
  this.setModel(user);
  
  /**
   * @type {brkn.model.User}
   * @private
   */
  this.user_ = user;
  
  /**
   * @type {boolean}
   * @private
   */
  this.myProfile_ = user.id == brkn.model.Users.getInstance().currentUser.id;
  
  /**
   * @type {Array.<string>}
   * @private
   */
  this.tabs_ = [(this.myProfile_ ? 'inbox' : 'messages'), 'activity', 'starred'];
};
goog.inherits(brkn.sidebar.Profile, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Profile.prototype.tabsEl_;


/**
 * @type {brkn.sidebar.Messages}
 * @private
 */
brkn.sidebar.Profile.prototype.messages_;


/**
 * @type {brkn.sidebar.MediaList}
 * @private
 */
brkn.sidebar.Profile.prototype.starred_;


/**
 * @type {brkn.sidebar.Stream}
 * @private
 */
brkn.sidebar.Profile.prototype.stream_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Profile.prototype.inboxEl_;


/** @inheritDoc */
brkn.sidebar.Profile.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  goog.dom.classes.add(el, 'profile');
  goog.dom.classes.add(el, 'ios-scroll');
  soy.renderElement(el, brkn.sidebar.profile, {
    myProfile: this.myProfile_
  });
};


/** @inheritDoc */
brkn.sidebar.Profile.prototype.enterDocument = function() {
  
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());
  
  
  if (this.myProfile_) {
    goog.net.XhrIo.send(
        '/_notification',
        goog.bind(function(e) {
          var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
          response = goog.array.filter(response, function(n) {return !!n;});
          var unreadCount = 0;
          var notifications = goog.array.map(response, function(n) {
            var notification = new brkn.model.Notification(n);
            unreadCount += (!notification.read ? 1 : 0);
            return notification;
          }, this);
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_MESSAGES,
              unreadCount);
          this.notifications_ = new brkn.sidebar.Notifications(notifications);
          this.getHandler().listen(this.notifications_, 'resize',
              goog.partial(goog.Timer.callOnce, goog.bind(this.resizeInbox_, this)));
          this.notifications_.decorate(goog.dom.getElementByClass('notifications-content',
              this.getElement()));
        }, this));
    this.inboxEl_ = goog.dom.getElementByClass('inbox-content', this.getElement());
    this.getHandler().listen(window, 'resize',
        goog.partial(goog.Timer.callOnce, goog.bind(this.resizeInbox_, this)));
    
  }
  
  goog.net.XhrIo.send(
      '/_message/' + this.user_.id,
      goog.bind(function(e) {
        var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
        var unreadCount = 0;
        var messages = goog.array.map(response, function(m) {
          var message = new brkn.model.Message(m);
          unreadCount += (!message.read ? 1 : 0);
          return message;
        }, this);
        if (this.myProfile_) {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_MESSAGES,
              unreadCount);
        }
        this.messages_ = new brkn.sidebar.Messages(this.user_, messages);
        this.getHandler().listen(this.messages_, 'resize',
            goog.partial(goog.Timer.callOnce, goog.bind(this.resizeInbox_, this)));
        this.messages_.decorate(goog.dom.getElementByClass('messages-content', this.getElement()));
      }, this));

  goog.net.XhrIo.send(
      '/_star/' + this.user_.id,
      goog.bind(function(e) {
        var medias = /** @type {Array.<Object>} */ e.target.getResponseJson();
        medias = goog.array.map(medias, function(m) {
          return new brkn.model.Media(m);
        });
        brkn.model.Users.getInstance().currentUser.setStarred(medias);
        this.starred_ = new brkn.sidebar.MediaList(medias);
        this.starred_.decorate(goog.dom.getElementByClass('starred-content', this.getElement()));
      }, this));

  goog.net.XhrIo.send(
      '/_activity/' + this.user_.id,
      goog.bind(function(e) {
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson()['activities'];
        this.stream_ = new brkn.sidebar.Stream(activities, this.user_.id);
        this.stream_.decorate(goog.dom.getElementByClass('activity-content', this.getElement()));
      }, this));
  
  this.getHandler().listen(this.tabsEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        var tabEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
        this.navigate_(tabEl);
      }, this));

  brkn.model.Medias.getInstance().subscribe(brkn.model.Medias.Action.STAR, function(media, star) {
    star ? this.starred_.addMedia(media) : this.starred_.removeMedia(media);
  }, this);
  
  this.getHandler().listen(window, 'resize',
      goog.partial(goog.Timer.callOnce, goog.bind(this.resize_, this)));
  
  this.resize_();
};


/**
 * @param {Element} tabEl
 * @private
 */
brkn.sidebar.Profile.prototype.navigate_ = function(tabEl) {
  goog.array.forEach(this.tabs_, function(tab) {
    goog.dom.classes.enable(this.tabsEl_.parentElement, tab, goog.dom.classes.has(tabEl, tab));
    this.currentTab_ = goog.dom.classes.has(tabEl, tab) ? tab : this.currentTab_;
  }, this);
};


/**
 * @private
 */
brkn.sidebar.Profile.prototype.resize_ = function() {
  var height = goog.dom.getViewportSize().height + (IPHONE && SAFARI ? 61 : 0) - 41 -
      (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0);
  goog.style.setHeight(this.getElement(), height);
  this.resizeInbox_();
};


/**
 * @private
 */
brkn.sidebar.Profile.prototype.resizeInbox_ = function() {
  var inboxSize = goog.style.getSize(this.getElement()).height - 80;
  this.notifications_ && goog.style.setHeight(this.notifications_.getElement(), Math.floor(inboxSize/2));
  this.messages_ && goog.style.setHeight(this.messages_.getElement(), Math.ceil(inboxSize/2));
};
  