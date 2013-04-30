goog.provide('brkn.model.Message');


/**
 * @param {Object} message Message object
 * @constructor
 */
brkn.model.Message = function(message) {
  /**
   * @type {string}
   * @private
   */
  this.id = message['id'];

  /**
   * @type {brkn.model.User}
   * @private
   */
  this.fromUser = brkn.model.Users.getInstance().get_or_add(message['from_user']);
  
  /**
   * @type {brkn.model.User}
   * @private
   */
  this.toUser = brkn.model.Users.getInstance().get_or_add(message['to_user']);

  /**
   * @type {string}
   * @private
   */
  this.text = message['text'];

  /**
   * @type {?goog.date.DateTime}
   */
  this.time = message['time'] ? goog.date.fromIsoString(message['time'] + 'Z') : null;

  /**
   * @type {?string}
   */
  this.relativeTime = this.time ? goog.date.relative.format(this.time.getTime()) : null;
};