goog.provide('brkn.model.Comment');

goog.require('brkn.model.Users');



/**
 * @param {Object} comment Comment object
 * @constructor
 */
brkn.model.Comment = function(comment) {
  /**
   * @type {string}
   * @private
   */
  this.id = comment['id'];

  /**
   * @type {brkn.model.User}
   * @private
   */
  this.user = brkn.model.Users.getInstance().get_or_add(comment['user']);

  /**
   * @type {string}
   * @private
   */
  this.text = comment['text'];

  /**
   * @type {goog.date.DateTime}
   */
  this.time = goog.date.fromIsoString(comment.time + 'Z');

  /**
   * @type {string}
   */
  this.relativeTime = goog.date.relative.format(this.time.getTime());

  /**
   * @type {string}
   */
  this.parentId = comment['parent_id'];

  /**
   * @type {Array.<brkn.model.Comment>}
   * @private
   */
  this.replies = [];

  goog.array.forEach(comment['replies'], function(reply) {
    var r = new brkn.model.Comment(reply);
    this.replies.push(r);
  }, this);
};