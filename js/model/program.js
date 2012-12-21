goog.provide('brkn.model.Program');

goog.require('brkn.model.Media');
goog.require('brkn.model.Medias');

goog.require('goog.date.DateTime');
goog.require('goog.pubsub.PubSub');



/**
 * @param {Object} program program object
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Program = function(program) {
	goog.base(this);
	
	/**
	 * @type {string}
	 * @private
	 */
	this.id = program.id;
	
	/**
	 * @type {brkn.model.Media}
	 * @private
	 */
	this.media = new brkn.model.Media(program.media);
	brkn.model.Medias.getInstance().add(this.media);
	

	/**
	 * @type {goog.date.DateTime}
	 * @private
	 */
	this.time = goog.date.fromIsoString(program.time + 'Z');
};
goog.inherits(brkn.model.Program, goog.pubsub.PubSub);


/**
 * @param {string} isoTime
 */
brkn.model.Program.prototype.updateTime = function(isoTime) {
  this.time = goog.date.fromIsoString(isoTime + 'Z');
};

