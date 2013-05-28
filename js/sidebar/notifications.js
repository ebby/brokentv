goog.provide('brkn.sidebar.Notifications');

goog.require('soy');
goog.require('brkn.model.Notification');
goog.require('brkn.model.User');
goog.require('brkn.sidebar.CommentInput');
goog.require('brkn.sidebar.notifications');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @param {Array.<brkn.model.Notification>} notifications
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Notifications = function(notifications) {
  goog.base(this);

  /**
   * @type {Array.<brkn.model.Notification>}
   * @private
   */
  this.notifications_ = notifications;

  /**
   * @type {?Object.<string, Element>}
   * @private
   */
  this.notificationMap_ = {};

  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;
};
goog.inherits(brkn.sidebar.Notifications, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Notifications.prototype.notificationsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Notifications.prototype.noNotificationsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Notifications.prototype.moreNotificationsEl_;


/** @inheritDoc */
brkn.sidebar.Notifications.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;
  
  this.notificationsEl_ = goog.dom.createDom('div', 'notifications');
  goog.dom.appendChild(this.getElement(), this.notificationsEl_);
  
  this.spinner_ = goog.dom.createDom('div', 'spinner');
  goog.dom.appendChild(this.notificationsEl_, this.spinner_);
  goog.style.showElement(this.spinner_, false);
  this.noNotificationsEl_ = goog.dom.createDom('div', 'no-comments', 'No Notifications');
  goog.dom.appendChild(this.notificationsEl_, this.noNotificationsEl_);
  goog.style.showElement(this.noNotificationsEl_, !this.notifications_.length);
  
  goog.array.forEach(this.notifications_, function(m) {
    this.addNotification_(m);
  }, this);
  this.dispatchEvent('resize');

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_NOTIFICATION, function(n) {
    this.addNotification_(n, true);
    brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_MESSAGES, 1);
    this.dispatchEvent('resize');
  }, this);
};


/**
 * @param {brkn.model.Notification} notification
 * @param {?boolean=} opt_first
 * @private
 */
brkn.sidebar.Notifications.prototype.addNotification_ = function(notification, opt_first) {
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
  timeEl = goog.dom.getElementByClass('timestamp', notificationEl);
  goog.dom.classes.enable(notificationEl, 'unread', !notification.read)
  this.getHandler().listen(notificationEl, goog.events.EventType.CLICK, goog.bind(function() {
    if (!notification.read) {
      notification.setRead();
      goog.dom.classes.remove(notificationEl, 'unread');
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_MESSAGES, -1);
    }
   brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO,
       notification.comment.media);
  }, this));

  brkn.model.Clock.getInstance().addTimestamp(notification.time, timeEl);
  if (!opt_first) {
    this.getElement().scrollTop = this.getElement().scrollHeight; 
  }
};

