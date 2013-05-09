goog.provide('brkn.model.Sidebar');
goog.provide('brkn.model.Sidebar.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Sidebar = function() {
  goog.base(this);
};
goog.inherits(brkn.model.Sidebar, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Sidebar);


/**
 * @type {boolean}
 */
brkn.model.Sidebar.prototype.currentProfile; 


/**
 * @return {boolean}
 */
brkn.model.Sidebar.prototype.toggled = function() {
  return goog.dom.classes.has(goog.dom.getElement('sidebar'), 'toggled');
};


/**
 * @enum {string}
 */
brkn.model.Sidebar.Actions = {
  FRIEND_LIST: 'friend-list',
  NAVIGATE: 'navigate',
  NEW_ACTIVITIES: 'new-activites',
  MEDIA_INFO: 'media-info',
  MEDIA_LIST: 'media-list',
  REPLY_COMMENT: 'reply-comment',
  REPLY_TWEET: 'reply-tweet',
  PROFILE: 'profile',
  APPROVED: 'approved',
  CONVERSATION: 'conversation'
};