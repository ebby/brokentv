goog.provide('brkn.model.Channel');
goog.provide('brkn.model.Channel.Action');

goog.require('brkn.model.Program');
goog.require('brkn.model.Session');

goog.require('goog.pubsub.PubSub');



/**
 * @param {Object} channel Channel object
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Channel = function(channel) {
	goog.base(this);
	
	/**
	 * @type {String}
	 * @private
	 */
	this.id = channel.id;
	
	/**
	 * @type {String}
	 * @private
	 */
	this.name = channel.name;

	/**
	 * @type {Array.<brkn.model.Program>}
	 * @private
	 */
	this.programming = [];
	
	/**
   * @type {Object.<string, brkn.model.Program>}
   * @private
   */
  this.programMap_ = {};

	/**
	 * @type {brkn.model.Program}
	 * @private
	 */
	this.currentProgram = channel['current_program'] && new brkn.model.Program(channel['current_program']);
	
	/**
	 * @type {Array.<brkn.model.Session>}
	 * @private
	 */
	this.viewerSessions = [];
	
	this.subscribe(brkn.model.Channel.Action.ADD_PROGRAM, this.addProgram, this);
	this.subscribe(brkn.model.Channel.Action.ADD_VIEWER, this.addViewer, this);
	this.subscribe(brkn.model.Channel.Action.UPDATE_PROGRAM, this.updateProgram, this);
};
goog.inherits(brkn.model.Channel, goog.pubsub.PubSub);


/**
 * @type {number}
 * @private
 */
brkn.model.Channel.prototype.currentProgramIndex;

/**
 * @param {brkn.model.Program} program The Program
 */
brkn.model.Channel.prototype.addProgram = function(program) {
	this.programming.push(program);
	this.programMap_[program.id] = program;
};


/**
 * @param {string} id
 */
brkn.model.Channel.prototype.getProgram = function(id) {
  return this.programMap_[id];
};


/**
 * @param {brkn.model.Session} session The session
 */
brkn.model.Channel.prototype.addViewer = function(session) {
	this.viewerSessions.push(session);
};


/**
 * @param {Object} program The program object
 */
brkn.model.Channel.prototype.updateProgram = function(program) {
  var p = goog.object.get(this.programMap_, program.id);
  p && p.updateTime(program.time);
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getCurrentProgram = function() {
	if (!this.currentProgram && !this.programming.length) {
		return null;
	}

	var program = this.currentProgram;
	if (!this.currentProgram) {
		program = this.programming[0];
		this.currentProgramIndex = 0;
	}
  var now = new goog.date.DateTime();
  var seek = (goog.now() - program.time.getTime())/1000;
  while (program.media.duration - seek < 0) {
  	var nextProgram = this.getNextProgram();
  	if (!nextProgram) {
  		break;
  	}
  	program = nextProgram;
  	seek = (goog.now() - program.time.getTime())/1000;
  }
  this.currentProgram = program;
  return program;
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getNextProgram = function() {
	if (!this.currentProgram) {
		this.currentProgram = this.programming[0];
		this.currentProgramIndex = 0;
	}

	if (!this.currentProgramIndex) {
		this.currentProgramIndex = goog.array.findIndex(this.programming, goog.bind(function(program) {
			return this.currentProgram.id == program.id;
		}, this));
	}
	if (this.programming.length >= this.currentProgramIndex + 1) {
		this.currentProgramIndex++;
		this.currentProgram = this.programming[this.currentProgramIndex];
		return this.currentProgram;
	};
	return null;
}


/**
 * @enum {string}
 */
brkn.model.Channel.Action = {
	ADD_PROGRAM: 'add-program',
	ADD_VIEWER: 'add-viewer',
	REMOVE_VIEWER: 'remove-viewer',
	UPDATE_PROGRAM: 'update-program'
};

