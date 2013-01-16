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
	
	/**
	 * @type {Array.<Object>}
	 */
	this.timestamps = [];
};
goog.inherits(brkn.model.Clock, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Clock);


/**
 * Initialize the clock
 */
brkn.model.Clock.prototype.init = function() {
	this.clock.start();
	
	goog.events.listen(this.clock, goog.Timer.TICK, goog.bind(function() {
	  goog.array.forEach(this.timestamps, function(timestamp) {
	    goog.dom.setTextContent(timestamp.element,
	        goog.date.relative.format(timestamp.time.getTime()));
	  }, this);
	}, this));
};


/**
 * @param {goog.date.DateTime} time
 * @param {Element} element
 */
brkn.model.Clock.prototype.addTimestamp = function(time, element) {
  if ((goog.now() - time.getTime())/1000 < 86400) {
    // Less than a day ago
    this.timestamps.push({
      'time': time,
      'element': element
    }); 
  }
};
