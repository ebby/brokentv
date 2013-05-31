goog.provide('brkn.model.Notification');



/**
 * @param {Object} notification Message object
 * @constructor
 */
brkn.model.Notification = function(notification) {
  /**
   * @type {string}
   * @private
   */
  this.id = notification['id'];

  /**
   * @type {brkn.model.User}
   * @private
   */
  this.user = brkn.model.Users.getInstance().get_or_add(notification['user']);

  /**
   * @type {string}
   * @private
   */
  this.type = notification['type'];
  
  /**
   * @type {?brkn.model.Comment}
   * @private
   */
  this.comment = notification['comment'] ? new brkn.model.Comment(notification['comment']) : null;
  
  /**
   * @type {boolean}
   * @private
   */
  this.read = notification['read'];

  /**
   * @type {?goog.date.DateTime}
   */
  this.time = notification['time'] ? goog.date.fromIsoString(notification['time'] + 'Z') : null;

  /**
   * @type {?string}
   */
  this.relativeTime = this.time ? goog.date.relative.format(this.time.getTime()) : null;
};


/**
 * Mark notification as read
 */
brkn.model.Notification.prototype.setRead = function() {
  goog.net.XhrIo.send('/_notification', goog.functions.NULL(), 'POST', 'id=' + this.id + '&read=1');
  this.read = true;
};


/**
 * @enum {string}
 */
brkn.model.Notification.Type = {
  REPLY: 'reply',
  MENTION: 'mention'
};

