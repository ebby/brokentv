goog.provide('brkn.model.Channel');
goog.provide('brkn.model.Channel.Action');

goog.require('brkn.model.Notify');
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
	 * @type {string}
	 */
	this.id = channel['id'];
	
	/**
	 * @type {string}
	 */
	this.name = channel['name'];

	/**
   * @type {string}
   */
  this.myChannel = channel['my_channel'];

  /**
   * @type {?brkn.model.Media}
   */
  this.currentMedia = channel['current_media'] ?
      brkn.model.Medias.getInstance().getOrAdd(channel['current_media']) : null;

  /**
   * @type {?number}
   */
  this.currentSeek = channel['current_seek'];

	/**
	 * @type {Array.<brkn.model.Program>}
	 */
	this.programming = [];
	
	/**
   * @type {Object.<string, brkn.model.Program>}
   */
  this.programMap_ = {};

	/**
	 * @type {brkn.model.Program}
	 */
	this.currentProgram = channel['current_program'] && new brkn.model.Program(channel['current_program']);

	/**
	 * @type {Array.<brkn.model.Session>}
	 */
	this.viewerSessions = [];

	/**
   * @type {Array.<brkn.model.Media>}
   */
  this.queue = [];
  
  /**
   * @type {number}
   * @private
   */
  this.lastTime_ = 0;

  /**
   * @type {?boolean}
   */
  this.online = channel['online'] != undefined ? channel['online'] : null;

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
	if (program.time.getTime() + program.media.duration*1000 > this.lastTime_) {
	  this.lastTime_ = program.time.getTime() + program.media.duration*1000 - 120000;
	  brkn.model.Clock.getInstance().addEvent(this.lastTime_,
	      goog.bind(this.maybeFetchProgramming, this, this.lastTime_));
	  // Backup attempt
	  brkn.model.Clock.getInstance().addEvent(this.lastTime_ + 60000,
        goog.bind(this.maybeFetchProgramming, this, this.lastTime_ + 60000));
	}
};


/**
 * @param {goog.date.DateTime} time The last programmed time on this channel
 */
brkn.model.Channel.prototype.maybeFetchProgramming = function(time) {
  if (this.lastTime_ <= time && !this.myChannel) {
    this.fetchCurrentProgramming();
  }
};


/**
 * @param {brkn.model.Media} media
 * @param {boolean} add
 */
brkn.model.Channel.prototype.addQueue = function(media, add) {
  if (add) {
    this.queue.push(media);
    
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'Added to queue', media.name, undefined, media.thumbnail1,
        '#info:' + media.id);
    
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
 * Fetch programming updates from server
 */
brkn.model.Channel.prototype.fetchCurrentProgramming = function() {
  goog.net.XhrIo.send('/_programming/' + this.id, goog.bind(function(e) {
    var programs = /** Array.<Object> */ e.target.getResponseJson();
    if (!programs.length) {
      // Try again in 1 second
      brkn.model.Clock.getInstance().addEvent(goog.now() + 1000,
          goog.bind(this.maybeFetchProgramming, this, goog.now() + 1000));
    }
    goog.array.forEach(programs, function(p) {
      var hasProgram = this.getProgram(p['id']);
      if (!hasProgram) {
        var newProgram = this.getOrAddProgram(p);
        this.publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram);
      }
    }, this);
  }, this));
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
	UPDATE_PROGRAM: 'update-program',
	ONLINE: 'online'
};

