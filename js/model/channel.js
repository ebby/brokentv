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
   * @type {boolean}
   */
  this.myChannel = channel['my_channel'];

	/**
	* @type {boolean}
	*/
	this.youtube = channel['youtube'];

  /**
   * @type {boolean}
   */
  this.offline = true;

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
	* @type {string}
	*/
	this.nextPageToken = channel['next_page_token'];

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

	if (!this.currentProgram) {
    this.currentProgramIndex = 0;
    this.currentProgram = this.programming[0];
  }
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
	if (program.async) {
	  this.currentProgramIndex = this.programming.length - 1;
	  this.currentProgram = program;
	}
	if (!this.youtubeChannel && program.time.getTime() + program.media.duration*1000 > this.lastTime_) {
	  this.lastTime_ = program.time.getTime() + program.media.duration*1000 - 120000;
	  brkn.model.Clock.getInstance().addEvent(this.lastTime_,
	      goog.bind(this.maybeFetchProgramming, this, this.lastTime_));
	  // Backup attempt
	  brkn.model.Clock.getInstance().addEvent(this.lastTime_ + 60000,
        goog.bind(this.maybeFetchProgramming, this, this.lastTime_ + 60000));
	}
};


/**
 * @return {Array}
 */
brkn.model.Channel.prototype.asPlaylist = function() {
  return goog.array.map(this.programming, function(p) {
    return p.media.hostId;
  })
}


/**
 * @param {?Function=} opt_callback
 */
brkn.model.Channel.prototype.fetchQueue = function(opt_callback) {
  goog.net.XhrIo.send('/_queue', goog.bind(function(e) {
    var response = e.target.getResponseJson();
    this.queue = goog.array.map((/** @type {Array.<Object>} */ response), function(m) {
      return brkn.model.Medias.getInstance().getOrAdd(m);
    }, this);
    opt_callback && opt_callback(this.queue);
  }, this));
};


/**
 * @param {goog.date.DateTime} time The last programmed time on this channel
 */
brkn.model.Channel.prototype.maybeFetchProgramming = function(time) {
  if (this.lastTime_ <= time && !this.myChannel && !goog.DEBUG && !EMBED) {
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

    if (brkn.model.Users.getInstance().currentUser.loggedIn) {
      goog.net.XhrIo.send('/_queue', goog.functions.NULL(), 'POST',
          'media_id=' + media.id);
    }
  } else {
    goog.array.removeIf(this.queue, function(m) {
      return m.id == media.id;
    }, this);

    if (brkn.model.Users.getInstance().currentUser.loggedIn) {
      goog.net.XhrIo.send('/_queue', goog.functions.NULL(), 'POST',
          'media_id=' + media.id + '&delete=1');
    }
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
 * @param {brkn.model.Program} program
 */
brkn.model.Channel.prototype.setCurrentProgram = function(program) {
  this.currentProgram = program;
  var index = goog.array.findIndex(this.programming, function(p){return p.id == program.id});
  this.currentProgramIndex = (index != -1 ? index : 0);
};

/**
 * @param {?number=} opt_offset
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getCurrentProgram = function(opt_offset) {
  if (this.currentProgram && this.currentProgram.async && this.currentProgram.seek != null
      && !this.currentProgram.ended) {
    return this.currentProgram;
  }
	if (!this.programming.length) {
		return null;
	}

  if (opt_offset) {
    return this.programming[this.currentProgramIndex + opt_offset];
  }

  if (this.offline && this.currentProgram) {
		// For async channels
    if (this.currentProgram.ended) {
			// If the last program ended, get the next one
      this.currentProgram = this.getNextProgram();
      if (!this.currentProgram) {
        goog.array.forEach(this.programming, function(program) {
          program.ended = false;
        });
        this.currentProgramIndex = 0;
        this.currentProgram = this.programming[0];
      }
    }
  } else if (!this.myChannel) {
    this.currentProgramIndex = 0;
    this.currentProgram = this.programming[0];//this.getScheduledProgram();
  }

  if (this.currentProgram && (!this.programming[this.currentProgramIndex] ||
      this.programming[this.currentProgramIndex].id != this.currentProgram.id)) {
    // If index is incorrect
    var index = goog.array.findIndex(this.programming, goog.bind(function(p) {
      return p.id == this.currentProgram.id;
    }, this));
    this.currentProgramIndex = Math.max(index, 0);
  }

  if (!this.currentProgram) {
    this.currentProgramIndex = 0;
    this.currentProgram = this.programming[0];
  }

  return this.currentProgram;
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getScheduledProgram = function() {
  var program = this.currentProgram;
  var index = this.currentProgramIndex;

  if (program && goog.now() >= program.time.getTime() &&
      goog.now() < program.time.getTime() + program.media.duration * 1000) {
    // If this is the correct program
    this.currentProgram = program;
    return this.currentProgram;
  }

  if (!program || program.time.getTime() >= goog.now()) {
    index = 0;
    program = this.programming[0];
  }

  for (var i = index; i < this.programming.length; i++) {
    var p = this.programming[i];
    if (goog.now() >= p.time.getTime() &&
        goog.now() < p.time.getTime() + p.media.duration * 1000) {
      return p;
    }
  }
  return program;
};


/**
 * Fetch programming updates from server
 */
brkn.model.Channel.prototype.fetchCurrentProgramming = function() {
	if (this.youtube) {
		goog.net.XhrIo.send('/_ytchannel?channel_id=' + this.id + '&pagetoken=' + this.nextPageToken, goog.bind(function(e) {
			goog.DEBUG && window.console.log(e.target.getResponse());
			var response = /** Array.<Object> */ e.target.getResponseJson();
			this.nextPageToken = response['channel']['next_page_token'];
			var programs = response['programs'];
			goog.array.forEach(programs, function(p) {
				var hasProgram = this.getProgram(p['id']);
				if (!hasProgram) {
					var newProgram = this.getOrAddProgram(p);
					this.publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram);
				}
			}, this);
		}, this));
	} else {
		goog.net.XhrIo.send('/_programming/' + this.id, goog.bind(function(e) {
			goog.DEBUG && window.console.log(e.target.getResponse());
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
	}
};


/**
 * @param {?number=} opt_offset
 * @param {?number=} opt_index
 * @return {boolean}
 */
brkn.model.Channel.prototype.hasNextProgram = function(opt_offset, opt_index) {
  var index = opt_index || this.currentProgramIndex || 0;
  var offset = opt_offset || 0;
  if (this.myChannel) {
    return index + offset + 1 < this.programming.length || !!this.queue.length;
  }
	if (index + offset + 1 < this.programming.length) {
		this.fetchCurrentProgramming();
	}
  return index + offset + 1 < this.programming.length;
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
 * @param {?number=} opt_index
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getNextProgram = function(opt_index) {
  var index = opt_index || this.currentProgramIndex;
  if (this.programming[index + 1]) {
    return this.programming[index + 1];
  } else if (this.myChannel) {
    return this.getNextQueue();
  } else {
		this.fetchCurrentProgramming();
	}
	return null;
};


/**
 * @return {?brkn.model.Program}
 */
brkn.model.Channel.prototype.getNextQueue = function() {
  if (this.queue.length) {
    var media = this.queue[0];
    this.publish(brkn.model.Channel.Action.ADD_QUEUE, media, false);
    var program = brkn.model.Program.async(media);
    brkn.model.Channels.getInstance().getMyChannel().publish(
        brkn.model.Channel.Action.ADD_PROGRAM, program);

    if (brkn.model.Users.getInstance().currentUser.loggedIn) {
      goog.net.XhrIo.send('/_addprogram', goog.functions.NULL(), 'POST',
          'channel_id=' + brkn.model.Channels.getInstance().myChannel.id +
          '&media_id=' + media.id +
          '&now=' + true);
    }
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
