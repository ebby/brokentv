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
 * @enum {string}
 */
brkn.model.Sidebar.Actions = {
  NAVIGATE: 'navigate',
  MEDIA_INFO: 'media-info',
  MEDIA_LIST: 'media-list',
  PROFILE: 'profile'
};