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
	this.id = channel['id'];
	
	/**
	 * @type {String}
	 * @private
	 */
	this.name = channel['name'];

	/**
   * @type {String}
   * @private
   */
  this.myChannel = channel['my_channel'];
  
//  /**
//   * @type {?brkn.model.Program}
//   * @private
//   */
//  this.currentProgram = channel['current_program'] ?
//      this.getOrAddProgram(channel['current_program']) : null;

  /**
   * @type {?brkn.model.Media}
   * @private
   */
  this.currentMedia = channel['current_media'] ?
      brkn.model.Medias.getInstance().getOrAdd(channel['current_media']) : null;

  /**
   * @type {?number}
   * @private
   */
  this.currentSeek = channel['current_seek'];

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
	
	/**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.queue = [];
	
	this.subscribe(brkn.model.Channel.Action.ADD_PROGRAM, this.addProgram, this);
	this.subscribe(brkn.model.Channel.Action.ADD_QUEUE, this.addQueue, this);
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
 * @param {brkn.model.Media} media
 * @param {boolean} add
 */
brkn.model.Channel.prototype.addQueue = function(media, add) {
  if (add) {
    this.queue.push(media);
    brkn.model.Analytics.getInstance().playAsync(media);
  } else {
    goog.array.removeIf(this.queue, function(m) {
      return m.id == media.id;
    }, this);
  }
};


/**
 * @param {string} id
 */
brkn.model.Channel.prototype.getProgram = function(id) {
  return this.programMap_[id];
};


/**
 * @param {Object} program
 */
brkn.model.Channel.prototype.getOrAddProgram = function(program) {
  var p = this.getProgram(program['id']);
  if (!p) {
    p = new brkn.model.Program(program);
    this.addProgram(p);
  }
  return p;
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
 * @param {?number=} opt_offset
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getCurrentProgram = function(opt_offset) {
  if (this.currentProgram && this.currentProgram.async && this.currentProgram.seek) {
    return this.currentProgram;
  }
	if (!this.programming.length) {
		return null;
	}
	var program = this.currentProgram;
	if (!program) {
		program = this.programming[0];
		this.currentProgramIndex = 0;
	}

  if (opt_offset) {
    return this.programming[this.currentProgramIndex + opt_offset];
  }

	if (!this.myChannel && goog.now() >= program.time.getTime() &&
	    goog.now() < program.time.getTime() + program.media.duration * 1000) {
	  this.currentProgram = program;
	  return this.currentProgram;
	}

//	if (!this.myChannel && this.currentProgram && this.currentProgram.id == program.id) {
//	  this.currentProgram = program;
//	  return this.currentProgram;
//	}

  while (goog.now() > program.time.getTime() &&
      goog.now() >= program.time.getTime() + program.media.duration * 1000) {
    var nextProgram = this.getNextProgram();

    if (this.myChannel) {
      if (nextProgram && nextProgram.async && nextProgram.seek) {
        // If this is the program associated with the current media.
        // Maybe just hold currentProgram in the backend channel object?
        this.currentProgram = nextProgram;
        return this.currentProgram;
      }
      if (!nextProgram) {
        // If no scheduled program next, and this is user's channel, check queue
        nextProgram = this.getNextQueue(); 
      }
    }

  	if (!nextProgram) {
      break;
  	}
  	
  	program = nextProgram;
  }
  if (goog.now() >= program.time.getTime() &&
      goog.now() < program.time.getTime() + program.media.duration * 1000) {
    this.currentProgram = program;
    return this.currentProgram;
  } else {
    return null;
  }
};


/**
 * @param {?number=} opt_offset
 * @return {boolean}
 */
brkn.model.Channel.prototype.hasNextProgram = function(opt_offset) {
  if (this.myChannel) {
    return !!this.queue.length;
  }
  var offset = opt_offset || 0;
  return this.currentProgramIndex + offset + 1 < this.programming.length;
};


/**
 * @param {?number=} opt_offset
 * @return {boolean}
 */
brkn.model.Channel.prototype.hasPrevProgram = function(opt_offset) {
  var offset = opt_offset || 0;
  return this.currentProgramIndex + offset - 1 >= 0;
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getNextProgram = function() {
	if (!this.currentProgram) {
		this.currentProgram = this.programming[0];
		this.currentProgramIndex = 0;
	}

	if (this.programming.length >= this.currentProgramIndex + 1) {
		this.currentProgramIndex++;
		var program = this.programming[this.currentProgramIndex];
	  if (this.myChannel) {
	    this.currentProgram = program && program.seek ? program : null;
	  } else {
	    this.currentProgram = this.programming[this.currentProgramIndex]; 
	  }
		return this.currentProgram;
	};
	return null;
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getNextQueue = function() {
  if (this.queue.length) {
    var media = this.queue.shift();
    var program = brkn.model.Program.async(media);
    brkn.model.Channels.getInstance().getMyChannel().publish(
        brkn.model.Channel.Action.ADD_PROGRAM, program);

    goog.net.XhrIo.send('/_addprogram', goog.functions.NULL(), 'POST',
        'channel_id=' + brkn.model.Channels.getInstance().myChannel.id +
        '&media_id=' + media.id +
        '&now=' + true);
    return program;
  }
  return null;
};


/**
 * @enum {string}
 */
brkn.model.Channel.Action = {
	ADD_PROGRAM: 'add-program',
	ADD_QUEUE: 'add-queue',
	ADD_VIEWER: 'add-viewer',
	REMOVE_VIEWER: 'remove-viewer',
	UPDATE_PROGRAM: 'update-program'
};

