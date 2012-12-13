goog.provide('brkn.model.Clock');

goog.require('goog.Timer');
goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Clock = function() {
	goog.base(this);
	
	/**
	 * @type {goog.Timer}
	 */
	this.clock = new goog.Timer(1000);
};
goog.inherits(brkn.model.Clock, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Clock);


/**
 * Initialize the clock
 */
brkn.model.Clock.prototype.init = function() {
	this.clock.start();
};