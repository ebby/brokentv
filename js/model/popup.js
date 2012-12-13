goog.provide('brkn.model.Popup');
goog.provide('brkn.model.Popup.Action');

goog.require('goog.pubsub.PubSub');



/**
 * Shows popups and broadcasts events.
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Popup = function() {
  goog.base(this);
};
goog.inherits(brkn.model.Popup, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Popup);


/**
 * @enum {string}
 */
brkn.model.Popup.Action = {
	ON_HIDE: 'on-hide',
	SELECT_PROGRAM: 'select-program',
  SHARE: 'share'
};
