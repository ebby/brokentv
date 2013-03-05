goog.provide('brkn.model.Notify');
goog.provide('brkn.model.Notify.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Notify = function() {
  goog.base(this);
};
goog.inherits(brkn.model.Notify, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Notify);


/**
 * @enum {string}
 */
brkn.model.Notify.Actions = {
  FLASH: 'flash',
  SHOW: 'show'
};