goog.provide('brkn.model.Programs');

goog.require('brkn.model.Program');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Programs = function() {
	goog.base(this);
	
	/**
	 * @type {Array.<brkn.model.Program>}
	 */
	this.programs = [];
};
goog.inherits(brkn.model.Programs, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Programs);


/**
 * @type {brkn.model.Channel}
 */
brkn.model.Programs.prototype.currentChannel;


/**
 * @param {Object} programming Programs json object.
 */
brkn.model.Programs.prototype.loadFromJson = function(programming) {
	goog.object.forEach((/** @type {Object.<string, Object>} */ programming),
			goog.bind(function(programs, channelId) {
			  goog.array.forEach((/** @type {Array.<Object>} */ programs), goog.bind(function(program) {
			    var p = new brkn.model.Program(program);
	        brkn.model.Channels.getInstance().channelMap[channelId].addProgram(p); 
			  }, this));
			}, this));
};

