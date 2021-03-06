goog.provide('brkn.model.Comment');

goog.require('brkn.model.Users');



/**
 * @param {Object} comment Comment object
 * @constructor
 */
brkn.model.Comment = function(comment) {
  /**
   * @type {string}
   */
  this.id = comment['id'];

  /**
   * @type {?brkn.model.User}
   */
  this.user = comment['user'] ? brkn.model.Users.getInstance().get_or_add(comment['user']) : null;

  /**
   * @type {string}
   */
  this.text = comment['text'];

  /**
   * @type {?brkn.model.Media}
   */
  this.media = comment['media'] ? brkn.model.Medias.getInstance().getOrAdd(comment['media']) : null;

  /**
   * @type {goog.date.DateTime}
   */
  this.time = comment['time'] ? goog.date.fromIsoString(comment['time'] + 'Z') : new goog.date.DateTime();

  /**
   * @type {string}
   */
  this.relativeTime = goog.date.relative.format(this.time.getTime());

  /**
   * @type {?string}
   */
  this.parentId = comment['parent_id'];

  /**
   * @type {Array.<brkn.model.Comment>}
   */
  this.replies = [];

  /**
   * Only used for marking notifications as read
   * @type {boolean}
   */
  this.read = false;

  if (comment['replies']) {
    goog.array.forEach(comment['replies'], function(reply) {
      var r = new brkn.model.Comment(reply);
      this.replies.push(r);
    }, this);
  }
};


/**
 * @param {brkn.model.User} user
 * @param {string} mediaId
 * @param {string} text
 * @param {boolean} facebook
 * @param {boolean} twitter
 * @param {?string=} opt_parentId
 * @param {?string=} opt_toUserId
 * @param {?Function=} opt_callback
 */
brkn.model.Comment.add = function(user, mediaId, text, facebook, twitter, opt_parentId,
    opt_toUserId, opt_callback) {
  var comment = new brkn.model.Comment({
    'text': text,
    'parentId': opt_parentId
  });
  comment.user = user;
  comment.parentId = opt_parentId || null;
  var media = brkn.model.Medias.getInstance().get(mediaId);
  media.addComment(comment);
  goog.net.XhrIo.send(
      '/_comment',
      goog.bind(function(e) {
        var response = e.target.getResponseJson();
        comment.id = response['comment']['id'];
        opt_callback && opt_callback(comment);
      }, this),
      'POST',
      'media_id=' + mediaId + '&text=' + text +
      '&tweet=' + twitter + '&facebook=' + facebook +
      (opt_parentId ? '&parent_id=' + opt_parentId : '') +
      (opt_toUserId ? '&to_user_id=' + opt_toUserId : ''));
  return comment;
};