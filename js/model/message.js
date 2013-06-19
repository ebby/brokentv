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
   * @type {?brkn.model.Media}
   */
  this.media = message['media'] ?
      (goog.typeOf(message['media']) == 'brkn.model.Media' ? message['media'] :
          brkn.model.Medias.getInstance().getOrAdd(message['media'])) : null;
  
  /**
   * @type {boolean}
   * @private
   */
  this.read = message['read'];

  /**
   * @type {?goog.date.DateTime}
   */
  this.time = message['time'] ? goog.date.fromIsoString(message['time'] + 'Z') : null;

  /**
   * @type {?string}
   */
  this.relativeTime = this.time ? goog.date.relative.format(this.time.getTime()) : null;
};


/**
 * Mark message as read
 */
brkn.model.Message.prototype.setRead = function() {
  goog.net.XhrIo.send('/_message', goog.functions.NULL(), 'POST', 'id=' + this.id + '&read=1');
  this.read = true;
  brkn.model.Users.getInstance().currentUser.publish(brkn.model.User.Actions.READ_MESSAGE,
      this.fromUser.id);
};

