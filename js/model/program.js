goog.provide('brkn.model.Program');

goog.require('brkn.model.Media');
goog.require('brkn.model.Medias');

goog.require('goog.date.DateTime');
goog.require('goog.pubsub.PubSub');



/**
 * @param {?Object=} opt_program program object
 * @param {?brkn.model.Media=} opt_media async media
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Program = function(opt_program, opt_media) {
	goog.base(this);
	
	goog.asserts.assert(opt_program || opt_media);
	var media = opt_media || null;
	var program = opt_program || null;
	
	/**
	 * @type {string}
	 * @private
	 */
	this.id = program ? program.id : media.id;
	
	/**
	 * @type {?brkn.model.Media}
	 * @private
	 */
	this.media = program ? new brkn.model.Media(program.media) : media;
	brkn.model.Medias.getInstance().add(this.media);

	/**
	 * @type {?goog.date.DateTime}
	 * @private
	 */
	this.time = program ? goog.date.fromIsoString(program.time + 'Z') :
	    new goog.date.DateTime();
};
goog.inherits(brkn.model.Program, goog.pubsub.PubSub);


/**
 * @param {brkn.model.Media} media
 */
brkn.model.Program.async = function(media) {
  return new brkn.model.Program(undefined, media);
};


/**
 * @param {string} isoTime
 */
brkn.model.Program.prototype.updateTime = function(isoTime) {
  this.time = goog.date.fromIsoString(isoTime + 'Z');
};

