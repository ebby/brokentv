goog.provide('brkn.Notifications');

goog.require('soy');
goog.require('brkn.model.Notification');
goog.require('brkn.model.User');
goog.require('brkn.sidebar.notifications');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Notifications = function() {
  goog.base(this);

  /**
   * @type {Array.<brkn.model.Notification>}
   * @private
   */
  this.notifications_ = [];

  /**
   * @type {Object.<string, Element>}
   * @private
   */
  this.notificationMap_ = {};

  /**
   * @type {Object.<string, Array.<brkn.model.Notification>>}
   * @private
   */
  this.mediaMap_ = {};

  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;

  /**
   * @type {goog.ui.CustomButton}
   */
  this.toggle_ = new goog.ui.CustomButton('Notifications');
  this.toggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);

  this.count_ = 0;
};
goog.inherits(brkn.Notifications, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Notifications.prototype.notificationsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Notifications.prototype.noNotificationsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Notifications.prototype.moreNotificationsEl_;


/** @inheritDoc */
brkn.Notifications.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  this.toggle_.decorate(goog.dom.getElementByClass('toggle', this.getElement()));
  this.container_ = goog.dom.getElementByClass('container', this.getElement());

  this.notificationsEl_ = goog.dom.getElementByClass('notes', this.getElement());
  //goog.dom.appendChild(this.container_, this.notificationsEl_);

  this.spinner_ = goog.dom.createDom('div', 'spinner');
  goog.dom.appendChild(this.notificationsEl_, this.spinner_);
  goog.style.showElement(this.spinner_, true);
  this.noNotificationsEl_ = goog.dom.createDom('div', 'no-comments', 'No Notifications');
  goog.dom.appendChild(this.notificationsEl_, this.noNotificationsEl_);
  goog.style.showElement(this.noNotificationsEl_, false);

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_NOTIFICATION, function(n) {
    this.addNotification_(n, true);
    goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
        ++this.count_ > 0 ? this.count_.toString() : '');
  }, this);

  this.getHandler()
      .listen(this.toggle_.getElement(),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            goog.dom.classes.enable(this.getElement(), 'show', this.toggle_.isChecked());
          }, this))
      .listen(this.notificationsEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            e.preventDefault();
            e.stopPropagation();
          }, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (this.toggle_.isChecked()) {
              if (!goog.dom.getAncestorByClass(e.target, 'notifications')) {
                goog.Timer.callOnce(goog.bind(function() {
                  goog.dom.classes.remove(this.getElement(), 'show');
                  this.toggle_.setChecked(false);
                }, this));
              }
            }
          }, this));

  goog.net.XhrIo.send(
      '/_notification',
      goog.bind(function(e) {
        goog.style.showElement(this.spinner_, false);
        var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
        response = goog.array.filter(response, function(n) {return !!n;});
        this.count_ = 0;
        this.notifications_ = goog.array.map(response, function(n) {
          var notification = new brkn.model.Notification(n);
          this.count_ += (!notification.read ? 1 : 0);
          this.addNotification_(notification);
          return notification;
        }, this);
        goog.style.showElement(this.noNotificationsEl_, !this.notifications_.length);
        goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
            this.count_ > 0 ? this.count_.toString() : '');
      }, this));
};


/**
 * @param {brkn.model.Notification} notification
 * @param {?boolean=} opt_first
 * @private
 */
brkn.Notifications.prototype.addNotification_ = function(notification, opt_first) {
  if (!notification.comment) {
    return;
  }

  goog.style.showElement(this.noNotificationsEl_, false);
  var timeEl;


  var text = notification.comment.text.replace(/@\[(\d+):([a-zA-z\s]+)\]/g, function(str, id, name) {
    return name;
  });

  var notificationEl = soy.renderAsElement(brkn.sidebar.notifications.notification, {
    notification: notification,
    text: text,
    fromUser: notification.comment.user
  });
  if (opt_first) {
    goog.dom.insertChildAt(this.notificationsEl_, notificationEl, 2);
  } else {
    goog.dom.appendChild(this.notificationsEl_, notificationEl);
  }

  this.notificationMap_[notification.id] = notificationEl;
  var mediaNotifications = this.mediaMap_[notification.comment.media.id] || [];
  mediaNotifications.push(notification);
  this.mediaMap_[notification.comment.media.id] = mediaNotifications;

  timeEl = goog.dom.getElementByClass('timestamp', notificationEl);
  goog.dom.classes.enable(notificationEl, 'unread', !notification.read)
  this.getHandler().listen(notificationEl, goog.events.EventType.CLICK, goog.bind(function() {
    if (!notification.read) {
      this.setMediaRead(notification.comment.media.id);
    }
   brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO,
       notification.comment.media);
  }, this));

  brkn.model.Clock.getInstance().addTimestamp(notification.time, timeEl);
  if (opt_first) {
    var alert = goog.dom.getElement('mp3-4');
    alert.load();
    alert.play();
  }
};


/**
 * @param {string} mediaId
 * @private
 */
brkn.Notifications.prototype.setMediaRead = function(mediaId) {
  var ns = this.mediaMap_[mediaId] || [];
  goog.array.forEach(ns, function(n) {
    n.setRead();
    goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
        --this.count_ > 0 ? this.count_.toString() : '');
    var nEl = this.notificationMap_[n.id];
    nEl && goog.dom.classes.remove(nEl, 'unread');
  }, this);
};
