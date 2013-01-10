goog.provide('brkn.model.Player');
goog.provide('brkn.model.Player.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Player = function() {
  goog.base(this);
  
};
goog.inherits(brkn.model.Player, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Player);


/**
 * @enum {string}
 */
brkn.model.Player.Actions = {
  PLAY_ASYNC: 'play-async'
};
