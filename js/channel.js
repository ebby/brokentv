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
	 * @type {goog.ui.CustomButton}
	 */
	this.addProgram_ = new goog.ui.CustomButton('Add Program');
	this.addProgram_.setSupportedState(goog.ui.Component.State.CHECKED,
			true);
	
	/**
	 * @type {Object.<number, Element>}
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
};
goog.inherits(brkn.Channel, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.Channel.PROGRAM_PADDING = 12;


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
    this.graph_ = raphael.path("M0,0").attr({stroke: "none", opacity: .8, fill: '#5d5d5d'/*Raphael.getColor(1)*/});
  }
  
  // Color the name
  goog.style.setStyle(this.nameEl_, 'background', Raphael.getColor());
  
  var programs = this.getModel().programming;
  for (var i = 0; i < programs.length; i++) {
  	if ((programs[i].time.getTime() < this.startTime_.getTime()) &&
  			(programs[i].time.getTime() + programs[i].media.duration * 1000 > (this.startTime_.getTime() - this.timeline_*1000))) {
  		// This program is in progress
  		var remaining = (programs[i].media.duration * 1000 +
  				programs[i].time.getTime() - this.startTime_.getTime()) / 1000;
  		this.addProgram(programs[i]);
  	} else if (programs[i].time.getTime() > this.startTime_.getTime()) {
  		this.addProgram(programs[i]);
  	}
  }
  if (this.isAdmin_) {
    this.setupDragging_();
  }
  
  goog.array.forEachRight(this.getModel().viewerSessions, this.addViewer, this);
  
  this.addChild(this.addProgram_);
	this.addProgram_.decorate(goog.dom.getElementByClass('add-program'));

	this.getHandler()
		.listen(this.addProgram_,
				goog.ui.Component.EventType.ACTION,
				goog.bind(this.onSelectProgram_, this))
		.listen(goog.dom.getElementByClass('name', this.getElement()),
				goog.events.EventType.CLICK,
				goog.bind(function() {
				  if (this.getModel().id != brkn.model.Channels.getInstance().currentChannel.id) {
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
      this.updateCurrentProgram_, this);
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
  var program = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (this.currentProgram_) {
    goog.dom.classes.remove(this.programs_[this.currentProgram_], 'playing');
  }
  this.currentProgram_ = null;
  var programEl = this.programs_[program.id];
  if (programEl) {
    this.currentProgram_ = program.id;
    goog.dom.classes.add(programEl, 'playing');
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
	var showAdmin = this.isAdmin_ &&
	    (program.time.getTime() + program.media.duration*1000) > goog.now();
	soy.renderElement(programEl, brkn.channel.program, {
		program: program,
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

	var width = program.media.duration * this.pixelsPerSecond_;
	goog.style.setWidth(programEl, width - brkn.Channel.PROGRAM_PADDING);
	var offset = (program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
	goog.style.setPosition(programEl, offset);
	goog.dom.appendChild(this.programsEl_, programEl);
	var clipped = width < 120;
	goog.dom.classes.enable(programEl, 'clipped', clipped);

	this.getHandler().listen(programEl, goog.events.EventType.CLICK, function() {
	  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, program.media);
	});
	
	var programWidth = goog.dom.classes.has(programEl, 'clipped') ? 200 :
	    goog.style.getSize(programEl).width;

	// Marquee text and pan
	this.getHandler()
	    .listen(programEl, goog.events.EventType.MOUSEOVER, function() {
    	  var titleEl = goog.dom.getElementByClass('title', programEl);
    	  var titleWidth = goog.style.getSize(titleEl).width;
    	  if (titleWidth > programWidth) {
    	    goog.style.setStyle(titleEl, 'margin-left', -(titleWidth - programWidth - 10) + 'px');
    	    goog.dom.classes.add(titleEl, 'marquee');
    	  }
    	  if (!this.adminMode_) {
    	    goog.style.setStyle(img, 'background-position-y', program.media.thumbPos +
    	        15 * Math.max(program.media.thumbSize.width/programWidth, 1) + '%');
    	  }
    	})
    	.listen(programEl, goog.events.EventType.MOUSEOUT, function() {
        var titleEl = goog.dom.getElementByClass('title', programEl);
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
          program.media.thumbPos = percent;
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
  goog.dom.removeNode(programEl);
  goog.net.XhrIo.send(
    '/admin/_removeprogram',
    undefined,
    'POST',
    'program=' + program.id);
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
	var userEl = this.viewers_[session.user.id];
	if (!userEl) {
		userEl = goog.dom.createDom('div', 'viewer');
		goog.dom.appendChild(this.viewersEl_, userEl);
		this.viewers_[session.user.id] = userEl;
	}
	if (!session.tuneOut || session.tuneOut.getTime() > this.minTime_.getTime()) {
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
	}
};


/**
 * @param {brkn.model.User} user The user to display
 * @param {goog.date.DateTime} tuneOut The tune-in time
 */
brkn.Channel.prototype.removeViewer = function(user, tuneOut) {
	// Simply stop updating element.
	goog.object.remove(this.viewers_, user.id);
};


/**
 * @param {Event} e
 * @private
 */
brkn.Channel.prototype.onSelectProgram_ = function(e) {
  e.stopPropagation();
  e.preventDefault();
  
  if (this.lastHideTime_ && (goog.now() - this.lastHideTime_ < 200)) {
    // If popup last closed this quickly, then this click most likely
    // implies a hide event.
    this.addProgram_.setActive(false);
    this.addProgram_.setChecked(false);
    return;
  }

  brkn.model.Popup.getInstance().publish(brkn.model.Popup.Action.SELECT_PROGRAM,
			this.addProgram_.getElement(), this.getModel());
  brkn.model.Popup.getInstance().subscribeOnce(
  		brkn.model.Popup.Action.ON_HIDE,
      goog.bind(function() {
        this.addProgram_.setChecked(false);
        this.lastHideTime_ = goog.now();
      }, this));
};


/**
 * Updater
 */
brkn.Channel.prototype.update = function() {
  if (this.showGraph_) {
    // Update path
    this.constructPath();
  }

  // Update viewers
	goog.object.forEach(this.getModel().viewerSessions, function(session) {
		if (!session.tuneOut) {
			var tuneInTime = Math.max(session.tuneIn.getTime(), this.minTime_.getTime());
			var width = goog.style.getSize(this.programsEl_).width;
			var elapsed = (goog.now() - tuneInTime)/1000 * this.pixelsPerSecond_;
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
	
	// Update current program if playing
//	if (this.currentProgram_) {
//	  var programEl = this.programs_[this.currentProgram_];
//	  var progress = goog.dom.getElementByClass('progress', programEl);
//	  var program = this.getModel().getProgram(this.currentProgram_);
//	  var elapsed = (goog.now() - program.time.getTime())/(program.media.duration * 10);
//	  goog.style.setWidth(progress, elapsed + '%');
//	}

	//Set programs and name heights
	//goog.style.setHeight(this.programsEl_, goog.style.getSize(this.getElement()).height - 21 /* padding */);
	goog.style.setHeight(this.nameEl_, goog.style.getSize(this.getElement()).height - 1);
	
	// Redraw (THIS CAN CAUSE LATENCY ISSUE)
	// goog.style.getPosition(goog.dom.getElement('guide'));
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

