goog.provide('brkn.Channel');

goog.require('soy');
goog.require('brkn.channel');
goog.require('brkn.model.Channel');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Popup');
goog.require('brkn.model.Popup.Action');

goog.require('goog.fx.DragListDirection');
goog.require('goog.fx.DragListGroup');
goog.require('goog.fx.Dragger');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');


/**
 * @param {brkn.model.Channel} model The Channel model
 * @param {number} timeline The timeline
 * @param {goog.date.DateTime} startTime The start of current timeslot
 * @param {number} startTimeOffset The start time pixel offset
 * @param {goog.date.DateTime} minTime The start of the timeline
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Channel = function(model, timeline, startTime, startTimeOffset, minTime) {
	goog.base(this);
	
	this.setModel(model);
	
	/**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();
  
  /**
   * @type {boolean}
   * @private
   */
  this.adminMode_ = false;
	
  /**
   * @type {boolean}
   * @private
   */
  this.showGraph_ = false;
  
	/**
	 * @type {number}
	 * @private
	 */
	this.timeline_ = timeline;

	/**
	 * @type {goog.date.DateTime}
	 * @private
	 */
	this.startTime_ = startTime;
	
	/**
	 * @type {goog.date.DateTime}
	 * @private
	 */
	this.minTime_ = minTime;
	
	/**
	 * @type {number}
	 * @private
	 */
	this.startTimeOffset_ = startTimeOffset;
	
	/**
	 * @type {Object.<string, Element>}
	 * @private
	 */
	this.viewers_ = {};
	
	/**
   * @type {Object.<string, Element>}
   * @private
   */
  this.programs_ = {};
  
  /**
   * @type {goog.fx.DragListGroup}
   * @private
   */
  this.dragListGroup_ = this.isAdmin_ ? new goog.fx.DragListGroup() : null;
  
  /**
   * @type {number}
   * @private
   */
  this.pixelsPerSecond_;
  
  /**
   * @type {number}
   * @private
   */
  this.changeTime_ = 6;
  
  /**
   * @type {boolean}
   * @private
   */
  this.online = true;
};
goog.inherits(brkn.Channel, goog.ui.Component);


/**
 * @type {string}
 * @constant
 */
brkn.Channel.YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json'


/**
 * @type {number}
 * @constant
 */
brkn.Channel.PROGRAM_PADDING = 12;


/**
 * @type {goog.ui.LabelInput}
 */
brkn.Channel.prototype.suggestInput_;


/**
 * @type {Element}
 * @private
 */
brkn.Channel.prototype.programsEl_;


/**
 * @type {?string}
 * @private
 */
brkn.Channel.prototype.currentProgram_;


/**
 * @type {Element}
 * @private
 */
brkn.Channel.prototype.viewersEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Channel.prototype.suggestEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Channel.prototype.nameEl_;


/**
 * @private
 */
brkn.Channel.prototype.graph_;


/** @inheritDoc */
brkn.Channel.prototype.createDom = function() {
	var el = soy.renderAsElement(brkn.channel.main, {
		name: this.getModel().name,
		current_program: this.getModel().currentProgram,
		timeline: this.timeline_
	});
	this.setElementInternal(el);
};


/** @inheritDoc */
brkn.Channel.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.programsEl_ = goog.dom.getElementByClass('programs', this.getElement());
  this.viewersEl_ = goog.dom.getElementByClass('viewers', this.getElement());
  this.nameEl_ = goog.dom.getElementByClass('name', this.getElement());
  this.graphEl_ = goog.dom.getElementByClass('graph', this.getElement());
  this.suggestEl_ = goog.dom.getElementByClass('suggest', this.getElement());
  
  if (!this.getModel().myChannel) {
    this.suggestInput_ = new goog.ui.LabelInput('Paste YouTube link');
    this.suggestInput_.decorate(goog.dom.getElementByClass('program-input', this.getElement()));
    var keyHandler = new goog.events.KeyHandler(this.suggestInput_.getElement());
    var pasteHandler = new goog.events.PasteHandler(this.suggestInput_.getElement());
    var throttle = new goog.Throttle(goog.bind(this.onSuggestInput_, this), 1000);
    this.getHandler()
        .listen(pasteHandler,
            goog.events.PasteHandler.EventType.AFTER_PASTE,
            goog.bind(this.onSuggestInput_, this))
        .listen(keyHandler,
            goog.events.KeyHandler.EventType.KEY,
            goog.bind(function() {
              if (throttle) {
                throttle.fire();
              }
            }, this))
        .listen(this.suggestInput_,
            goog.events.EventType.FOCUS,
            goog.bind(this.onSuggestInput_, this));
  } else {
    goog.style.showElement(this.suggestEl_, false);
  }
  

  this.pixelsPerSecond_ = (goog.style.getSize(this.programsEl_).width - brkn.Guide.NAME_WIDTH) /
      this.timeline_;

  if (this.showGraph_) {
    var sampleTime = 0;
    var viewers = 40;
    this.max_ = 0;
    this.fakeViewerData_ = [new goog.math.Coordinate(sampleTime, viewers)];
    this.fakeCurrentTime_ = Math.floor((goog.now() - this.minTime_.getTime())/1000);

    for (var i = 0; i < this.timeline_/40; i++) {
      this.fakeViewerData_.push(new goog.math.Coordinate(
          (sampleTime += 40),
          (viewers += [-30, -5, 15, 10, 25][Math.floor(Math.random() * 5)])));
      this.max_ = Math.max(this.max_, viewers);
    }
    
    var raphael = Raphael(this.graphEl_, '100%', 60);
    //var c = graph.path("M0,0").attr({fill: "none", "stroke-width": 1, "stroke-linecap": "round"});
    this.graph_ = raphael.path("M0,0").attr({stroke: "none", opacity: .8, fill: '#5d5d5d'});
  }
  
  // Color the name
  goog.style.setStyle(this.nameEl_, 'background', Raphael.getColor());
  
  var programs = this.getModel().programming;
  for (var i = 0; i < programs.length; i++) {
  	if ((programs[i].time.getTime() < this.startTime_.getTime()) &&
  			(programs[i].time.getTime() + programs[i].media.duration * 1000 > (this.startTime_.getTime() - this.timeline_*1000))) {
  		// This program is in progress
  		this.addProgram(programs[i]);
  	} else if (programs[i].time.getTime() > this.startTime_.getTime()) {
  		this.addProgram(programs[i]);
  	}
  }
  if (this.isAdmin_) {
    this.setupDragging_();
  }
  
  goog.array.forEachRight(this.getModel().viewerSessions, this.addViewer, this);

	this.getHandler()
		.listen(this.suggestEl_,
				goog.events.EventType.CLICK,
				goog.bind(this.onSuggest_, this))
		.listen(goog.dom.getElementByClass('close', this.suggestEl_),
        goog.events.EventType.CLICK,
        goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          this.onCloseSuggest_();
        }, this))
		.listen(goog.dom.getElementByClass('name', this.getElement()),
				goog.events.EventType.CLICK,
				goog.bind(function() {
				  if (this.getModel().id != brkn.model.Channels.getInstance().currentChannel.id &&
				      this.getModel().getCurrentProgram()) {
				    brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
				        this.getModel());
				  }
				}, this))
		.listen(brkn.model.Clock.getInstance().clock,
				goog.Timer.TICK,
				goog.bind(this.update, this));
	
	this.getModel().subscribe(brkn.model.Channel.Action.ADD_PROGRAM, this.addProgram, this);
	this.getModel().subscribe(brkn.model.Channel.Action.ADD_VIEWER, this.addViewer, this);
	this.getModel().subscribe(brkn.model.Channel.Action.REMOVE_VIEWER, this.removeViewer, this);
	this.getModel().subscribe(brkn.model.Channel.Action.UPDATE_PROGRAM, this.updateProgram, this);

	brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
	    this.updateCurrentProgram_, this);
	brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      function() {
	      this.changeTime_ = 0;
	      this.updateCurrentProgram_();
	    }, this);
	brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        this.adminMode_ = show;
      }, this);

	this.update(); // Refresh UI
};


/**
 * @private
 */
brkn.Channel.prototype.updateCurrentProgram_ = function() {
  if (this.currentProgram_) {
    goog.dom.classes.remove(this.programs_[this.currentProgram_], 'playing');
  }
  this.currentProgram_ = null;
  
  var program = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (program) {
    var programEl = this.programs_[program.id];
    if (programEl) {
      this.currentProgram_ = program.id;
      goog.dom.classes.add(programEl, 'playing');
    }
  }
};


/**
 */
brkn.Channel.prototype.constructPath = function() {
	var path = "";
  var width = goog.style.getSize(this.programsEl_).width;
  var height = 60;
  var padding = 6;
  var x, y, prevY;
  var currentSeconds = (goog.now() - this.minTime_)/1000;
  var viewerCounts = goog.array.slice(this.fakeViewerData_, 0, Math.floor(currentSeconds/40))
  goog.array.forEach(viewerCounts, function(point, i) {
  	x = point.x/this.timeline_ * width;
		y = height - point.y/this.max_ * height;
		if (i == viewerCounts.length - 1) {
			// Persist last count with time.
			x = currentSeconds/this.timeline_ * width;
		}
		x += padding;
  	if (i) {
  		path += "L" + [x - 30, prevY];
  		path += "C" + [x - 20, prevY, x - 10, y, x, y];	
  	} else {
  		path += "M" + [x, y] + "R";
  	}
  	prevY = y;
  }, this);
  this.graph_.attr({path: path + 'L' + x +',60 10,60z'});
};


/**
 * @param {brkn.model.Program} program The program to add
 */
brkn.Channel.prototype.addProgram = function(program) {
	var programEl = goog.dom.createDom('div', {
	  'class': 'program',
	  'id': program.id
	});
	var width = program.media.duration * this.pixelsPerSecond_;
	var showAdmin = this.isAdmin_ &&
	    (program.time.getTime() + program.media.duration*1000) > goog.now();
	soy.renderElement(programEl, brkn.channel.program, {
		program: program,
		repeat: width > 600,
		admin: showAdmin
	});
	this.programs_[program.id] = programEl;
	var currentProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
	if (currentProgram && program.id == currentProgram.id) {
	  goog.dom.classes.add(programEl, 'playing');
	  this.currentProgram_ = program.id;
	}	

	var img = goog.dom.getElementByClass('thumb', programEl);
	goog.Timer.callOnce(function() {
    if (program.media.thumbSize.height < goog.style.getSize(programEl).height + 50) {
      goog.dom.classes.add(img, 'fix-height');
      goog.dom.classes.add(img, 'pan-left');
    } else {
      goog.dom.classes.add(img, 'pan-top');
    }

    if (clipped) {
      goog.style.setWidth(img, 200);
    }
    goog.dom.classes.enable(programEl, 'stretched', program.media.thumbSize.height > 360);
  });

	goog.style.setWidth(programEl, width - brkn.Channel.PROGRAM_PADDING);
	var offset = (program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
	goog.style.setPosition(programEl, offset);
	goog.style.setPosition(this.suggestEl_, offset + width);
	goog.dom.appendChild(this.programsEl_, programEl);
	var clipped = width < 120;
	goog.dom.classes.enable(programEl, 'clipped', clipped);

	this.getHandler().listen(programEl, goog.events.EventType.CLICK, function() {
	  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, program.media);
	});
	
	var programWidth = goog.dom.classes.has(programEl, 'clipped') ? 200 :
	    goog.style.getSize(programEl).width;

	var titleEl = goog.dom.getElementByClass('title', programEl);
	var titleWidth = goog.style.getSize(titleEl).width;
	// Marquee text and pan
	this.getHandler()
	    .listen(programEl, goog.events.EventType.MOUSEOVER, function() {
	      if (!brkn.model.Controller.getInstance().guideToggled) {
	        return;
	      }
    	  var titleOffset = titleWidth + goog.style.getPosition(titleEl).x;
    	  if (titleOffset > programWidth) {
    	    goog.style.setStyle(titleEl, 'margin-left', -(titleOffset - programWidth - 10) + 'px');
    	    goog.dom.classes.add(titleEl, 'marquee');
    	  }
    	  if (!this.adminMode_) {
    	    goog.style.setStyle(img, 'background-position-y', program.media.thumbPos +
    	        10 * Math.max(program.media.thumbSize.width/programWidth, 1) + '%');
    	  }
    	})
    	.listen(programEl, goog.events.EventType.MOUSEOUT, function() {
    	  if (!brkn.model.Controller.getInstance().guideToggled) {
          return;
        }
        goog.style.setStyle(titleEl, 'margin-left', '');
        goog.dom.classes.remove(titleEl, 'marquee');
        if (!this.adminMode_) {
          goog.style.setStyle(img, 'background-position-y', program.media.thumbPos + '%');
        }
      });
	
	// Admin features
	if (showAdmin) {
	  var dragger = new goog.fx.Dragger(goog.dom.getElementByClass('repos', programEl));
    dragger.defaultAction = function(x, y) {
      var delta = y - 24
      if (delta >= -50 && delta <= 50) {
        goog.style.setStyle(img, 'background-position-y', 50 - delta + '%');
      }
    };
    this.getHandler().listen(dragger, 'end',
        function(e) {
          var percent = goog.style.getStyle(img, 'background-position').split(' ')[1];
          percent = percent.substring(0, percent.length - 1);
          program.media.thumbPos = (/** @type {number} */ percent);
          goog.net.XhrIo.send(
              '/admin/_posthumb',
              goog.functions.NULL(),
              'POST',
              'media=' + program.media.id +
              '&pos=' + percent);
        })
        .listen(goog.dom.getElementByClass('remove', programEl),
    	      goog.events.EventType.CLICK,
    	      goog.bind(this.onRemoveProgram_, this, program, programEl));
	}
};


/**
 * @param {brkn.model.Program} program The program to add
 */
brkn.Channel.prototype.updateProgram = function(program) {
  var programEl = this.programs_[program.id];
  var offset = (goog.date.fromIsoString(program.time + 'Z').getTime() - this.minTime_.getTime()) /
      1000 * this.pixelsPerSecond_;
  goog.style.setPosition(programEl, offset);
};


/**
 * @param {brkn.model.Program} program
 * @param {Element} programEl 
 * @private
 */
brkn.Channel.prototype.onRemoveProgram_ = function(program, programEl) {
//  goog.dom.removeNode(programEl);
//  goog.net.XhrIo.send(
//    '/admin/_removeprogram',
//    undefined,
//    'POST',
//    'program=' + program.id);
  goog.net.XhrIo.send(
      'admin/_media/collection',
      goog.bind(function() {
        alert('Disallowed on all channels.');
      }, this),
      'POST',
      '&media=' + program.media.id + '&approve=' + false);
};


/**
 * @param {number} programId
 * @param {number} newTime 
 * @private
 */
brkn.Channel.prototype.onRescheduleProgram_ = function(programId, newTime) {
  goog.net.XhrIo.send(
    '/admin/_rescheduleprogram',
    undefined,
    'POST',
    'program=' + programId + '&time=' + newTime);
};


/**
 * @param {brkn.model.Session} session The session to display
 */
brkn.Channel.prototype.addViewer = function(session) {
  if (brkn.model.Users.getInstance().currentUser.id != session.user.id || goog.DEBUG) {
    var userEl = this.viewers_[session.user.id];
    if (!userEl) {
      userEl = goog.dom.createDom('div', 'viewer');
      goog.dom.appendChild(this.viewersEl_, userEl);
      this.viewers_[session.user.id] = userEl;
    }

    if (this.getModel().getCurrentProgram() &&
        (!session.tuneOut || session.tuneOut.getTime() > this.minTime_.getTime())) {
      var lineEl = soy.renderAsElement(brkn.channel.line, {
        user: session.user
      });
      goog.dom.appendChild(userEl, lineEl);
      var tuneInTime = Math.max(session.tuneIn.getTime(), this.minTime_.getTime());
      var offset = (tuneInTime - this.minTime_.getTime()) / 1000 *
          this.pixelsPerSecond_ + brkn.Guide.NAME_WIDTH;
      var elapsed = (goog.now() - tuneInTime) / 1000 * this.pixelsPerSecond_;
      goog.style.setWidth(lineEl, elapsed);
      goog.style.setPosition(lineEl, offset);
      goog.style.setStyle(lineEl, 'background', session.user.color);
      this.getHandler().listen(lineEl, goog.events.EventType.CLICK, function() {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, session.user)
      })
    }
  }
};


/**
 * @param {brkn.model.User} user The user to display
 */
brkn.Channel.prototype.removeViewer = function(user) {
  if (this.viewers_[user.id]) {
    goog.dom.removeNode(this.viewers_[user.id])
  	goog.object.remove(this.viewers_, user.id);
  } 
};


/**
 * @param {Event} e
 * @private
 */
brkn.Channel.prototype.onSuggest_ = function(e) {
  if (!goog.dom.classes.has(this.suggestEl_, 'show')) {
    goog.style.setOpacity(goog.dom.getElementByClass('select-program', this.suggestEl_), 1);
    goog.dom.classes.add(this.suggestEl_, 'show');
    this.suggestInput_.focusAndSelect(); 
  }
};


/**
 * @private
 */
brkn.Channel.prototype.onCloseSuggest_ = function() {
  goog.dom.classes.remove(this.suggestEl_, 'show');
  this.suggestInput_.setValue('');
  goog.dom.getElementByClass('page2', this.getElement()).innerHTML = '';
};


/**
 * @param e {Event} The event
 * @private
 */
brkn.Channel.prototype.onSuggestInput_ = function(e) {
  var contentEl = goog.dom.getElementByClass('select-content', this.getElement());
  var el = goog.dom.getElementByClass('page2', this.getElement());
  if (goog.dom.getChildren(el).length) {
    return;
  }

  try {
    var video = goog.ui.media.YoutubeModel.newInstance(this.suggestInput_.getValue());

    goog.net.XhrIo.send(    
        goog.string.subs(brkn.Channel.YOUTUBE_DATA, video.getVideoId()),
        goog.bind(function(e){
          var entry = goog.json.parse(e.target.getResponse())['entry'];
          var title = entry['title']['$t'];
          var thumb = entry['media$group']['media$thumbnail'][0]['url'];
          soy.renderElement(el, brkn.channel.confirmMedia, {
            title: title,
            thumb: thumb
          });
          var confirmButton = new goog.ui.CustomButton('YES');
          confirmButton.decorate(goog.dom.getElementByClass('button', el));
          
          var scrollAnim = new goog.fx.dom.Scroll(contentEl,
              [0, 0], [160, 0], 300, goog.fx.easing.easeOut);
          scrollAnim.play();
          this.getHandler().listen(confirmButton,
              goog.ui.Component.EventType.ACTION,
              goog.bind(this.onSuggestProgram_, this, video));
        }, this));
  } catch (error) {
    return;
  }
};


/**
 * @param {goog.ui.media.YoutubeModel} video 
 * @private
 */
brkn.Channel.prototype.onSuggestProgram_ = function(video) {
  goog.net.XhrIo.send(
    '/_addprogram',
    goog.bind(function(e) {
      var response = e.target.getResponseJson();
      if (response['id']) {
        var newProgram = new brkn.model.Program(response);
        this.getModel().publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram); 
      }
    }, this),
    'POST',
    'channel_id=' + this.getModel().id +'&url=' + video.getUrl());
  goog.style.setOpacity(goog.dom.getElementByClass('button', this.suggestEl_), 0);
  goog.style.showElement(goog.dom.getElementByClass('added', this.suggestEl_), true);
  goog.style.setOpacity(goog.dom.getElementByClass('select-program', this.suggestEl_), 0);
  
  goog.Timer.callOnce(goog.bind(function() {
    this.onCloseSuggest_();
  }, this), 3000);
};


/**
 * Updater
 */
brkn.Channel.prototype.update = function() {
  if (!this.online && !!this.getModel().programming.length) {
    // We just came online, broadcast event
    this.getModel().publish(brkn.model.Channel.Action.ONLINE, true);
  }

  // Hide if no content
  this.online = !!this.getModel().programming.length;
  goog.dom.classes.enable(this.getElement(), 'offline', !this.online);
  if (!this.getModel().programming.length) {
    return;
  }
  
  if (this.showGraph_) {
    // Update path
    this.constructPath();
  }
 
  // Potentially move title for current program
  if (this.currentProgram_) {
    var currentProgram = this.programs_[this.currentProgram_];
    var delta = goog.style.getPosition(currentProgram).x +
        goog.style.getPosition(goog.dom.getElement('guide')).x;
    var title = goog.dom.getElementByClass('title', currentProgram);
    goog.style.setPosition(title, delta < 5 ? -delta + 10 : 5);
  } else {
    this.changeTime_++;
  }

  // Update viewers
	goog.object.forEach(this.getModel().viewerSessions, function(session) {
		if (this.getModel().getCurrentProgram() && !session.tuneOut && this.viewers_[session.user.id]) {
			var tuneInTime = Math.max(session.tuneIn.getTime(), this.minTime_.getTime());
			var width = goog.style.getSize(this.programsEl_).width;
			var elapsed = Math.floor((goog.now() - tuneInTime)/1000 * this.pixelsPerSecond_);
			var myCurrentProgram = brkn.model.Player.getInstance().getCurrentProgram();
			if (session.user.id == brkn.model.Users.getInstance().currentUser.id && myCurrentProgram) {
			  elapsed = Math.floor((myCurrentProgram.time.getTime() +
            brkn.model.Player.getInstance().getProgress()*1000 - tuneInTime)/1000 *
            this.pixelsPerSecond_);
			}
			this.viewers_[session.user.id].lastChild &&
			    goog.style.setWidth(this.viewers_[session.user.id].lastChild, elapsed);
		}
	}, this);
	goog.style.getPosition(this.viewersEl_); // Refresh DOM
	
	// Overlay graph and viewers
	var graphHeight = goog.style.getSize(this.graphEl_).height;
	var viewersHeight = goog.style.getSize(this.viewersEl_).height;
	var delta = graphHeight - viewersHeight;
	if (delta < 0) {
		goog.style.setStyle(this.graphEl_, 'margin-top', -delta + 'px');
	}

	//Set programs and name heights
	//goog.style.setHeight(this.programsEl_, goog.style.getSize(this.getElement()).height - 21 /* padding */);
	goog.style.setHeight(this.nameEl_, goog.style.getSize(this.getElement()).height - 1);
};


/**
 * @private
 */
brkn.Channel.prototype.setupDragging_ = function() {
  this.dragListGroup_.addDragList(this.programsEl_, goog.fx.DragListDirection.RIGHT);
  this.dragListGroup_.setDraggerElClass('drag');
  var parent = this.getElement();
  this.dragListGroup_.handlePotentialDragStart_ = function(e) {
    var uid = goog.getUid(/** @type {Node} */ (e.currentTarget));
    this.currDragItem_ = /** @type {Element} */ (this.dragItemForHandle_[uid]);

    this.draggerEl_ = this.cloneNode_(this.currDragItem_);
    if (this.draggerElClass_) {
      // Add CSS class for the clone, if any.
      goog.dom.classes.add(this.draggerEl_, this.draggerElClass_);
    }

    this.draggerEl_.style.margin = '0';
    this.draggerEl_.style.position = 'absolute';
    this.draggerEl_.style.visibility = 'hidden';
    parent.appendChild(this.draggerEl_);
    var currDragItemPos = goog.style.getPageOffset(this.currDragItem_);
    goog.style.setPageOffset(this.draggerEl_, currDragItemPos);

    this.dragger_ = new goog.fx.Dragger(this.draggerEl_);
    this.dragger_.setHysteresis(this.hysteresisDistance_);
    goog.events.listen(this.dragger_, goog.fx.Dragger.EventType.START,
        this.handleDragStart_, false, this);
    goog.events.listen(this.dragger_, goog.fx.Dragger.EventType.END,
        this.handleDragEnd_, false, this);
    goog.events.listen(this.dragger_, goog.fx.Dragger.EventType.EARLY_CANCEL,
        this.cleanup_, false, this);
    this.dragger_.startDrag(e);
  };
  
  this.dragListGroup_.init();
  var displaced = {};
  var newPosition;
  var newTime;
  var startCenter;
  var startLeft;
  var hoverPrevItem;
  var hasPrev = true;
  this.getHandler()
      .listen(this.dragListGroup_,
          goog.fx.DragListGroup.EventType.BEFOREDRAGSTART, goog.bind(function(e) {
            if (!this.adminMode_ || !e.event.shiftKey) {
              e.preventDefault();
            }
          }, this))
      .listen(this.dragListGroup_,
          goog.fx.DragListGroup.EventType.DRAGMOVE, function(e) {
            startCenter = startCenter || e.draggerElCenter.x;
            startLeft = startLeft || goog.style.getPosition(e.currDragItem).x;
            hoverPrevItem = hoverPrevItem || goog.dom.getPreviousElementSibling(e.currDragItem);
            hasPrev = hasPrev && !!hoverPrevItem;
            var prevWidth = hoverPrevItem ? goog.style.getSize(hoverPrevItem).width : undefined;
            var prevLeft = hoverPrevItem ? goog.style.getPosition(hoverPrevItem).x : undefined;
            var delta = e.draggerElCenter.x - startCenter;
            if (Math.abs(delta) < 10) {
              return;
            }
            if (e.hoverNextItem && !displaced[e.hoverNextItem.id] && delta > 0) {
              var width = goog.style.getSize(e.currDragItem).width;
              var left = goog.style.getPosition(e.hoverNextItem).x;
              newPosition = left - width + goog.style.getSize(e.hoverNextItem).width;
              var nextProgram = this.getModel().getProgram(e.hoverNextItem.id);
              newTime = nextProgram.time.getTime()/1000 + nextProgram.media.duration -
                  this.getModel().getProgram(e.currDragItem.id).media.duration;
              goog.style.setPosition(e.currDragItem, newPosition);
              goog.style.setPosition(e.hoverNextItem, left - width - brkn.Channel.PROGRAM_PADDING);
              displaced[e.hoverNextItem.id] = true;
              goog.dom.insertSiblingAfter(e.currDragItem, e.hoverNextItem);
            } else if (hasPrev && delta < 0 &&
                startLeft + delta < prevLeft + prevWidth) {
              var width = goog.style.getSize(e.currDragItem).width;
              var left = goog.style.getPosition(hoverPrevItem).x;
              newPosition = left;
              newTime = this.getModel().getProgram(hoverPrevItem.id).time.getTime()/1000;
              goog.style.setPosition(e.currDragItem, newPosition);
              goog.style.setPosition(hoverPrevItem, left + width + brkn.Channel.PROGRAM_PADDING);
              var nextPrev = goog.dom.getPreviousElementSibling(hoverPrevItem);
              goog.dom.insertSiblingBefore(e.currDragItem, hoverPrevItem);
              hoverPrevItem = nextPrev;
              hasPrev = !!nextPrev;
            } 
          })
      .listen(this.dragListGroup_,
          goog.fx.DragListGroup.EventType.DRAGEND, function(e) {
            if (newTime) {
              this.onRescheduleProgram_(e.draggerEl.id, newTime);
              this.dragListGroup_.init();
              newTime = undefined;
            }
            displaced = {};
            startCenter = undefined;
            startLeft = undefined;
            hoverPrevItem = undefined;
            newPosition = undefined;
            hasPrev = true;
          });
};

