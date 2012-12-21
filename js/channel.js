goog.provide('brkn.Channel');

goog.require('soy');
goog.require('brkn.channel');
goog.require('brkn.model.Channel');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Popup');
goog.require('brkn.model.Popup.Action');

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
  this.isAdmin_ = true;
	
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
};
goog.inherits(brkn.Channel, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Channel.prototype.programsEl_;


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
  this.graph_ = raphael.path("M0,0").attr({stroke: "none", opacity: .7, fill: 'white'/*Raphael.getColor(1)*/});
  //c.attr({path: path, stroke: Raphael.getColor(1)});
  
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
				    brkn.model.Channels.getInstance().publish(brkn.model.Channels.Action.CHANGE_CHANNEL,
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

	this.update(); // Refresh UI
};


/**
 */
brkn.Channel.prototype.constructPath = function() {
	var path = "";
  var width = goog.style.getSize(this.programsEl_).width;
  var height = 60;
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
  	if (i) {
  		path += "L" + [x - 30, prevY];
  		path += "C" + [x - 20, prevY, x - 10, y, x, y];	
  	} else {
  		path += "M" + [x, y] + "R";
  	}
  	prevY = y;
  }, this);
  this.graph_.attr({path: path + 'L' + currentSeconds/this.timeline_*width +',60 10,60z'});
};


/**
 * @param {brkn.model.Program} program The program to add
 */
brkn.Channel.prototype.addProgram = function(program) {
	var programEl = goog.dom.createDom('div', 'program');
	var showAdmin = this.isAdmin_ && program.time.getTime() > goog.now();
	soy.renderElement(programEl, brkn.channel.program, {
		program: program,
		admin: showAdmin
	});
	this.programs_[program.id] = programEl;

	// Position image
	var img = goog.dom.getElementByClass('thumb', programEl);
	
	goog.dom.classes.enable(programEl, 'current',
			this.getModel().currentProgram && this.getModel().currentProgram.id == program.id);
	var programsWidth = goog.style.getSize(this.programsEl_).width;
	var width = program.media.duration/this.timeline_ * programsWidth;
	goog.style.setWidth(programEl, width - (width < 120 ? 1 : 0));
	var offset = (program.time.getTime() - this.minTime_.getTime())/(this.timeline_ * 1000) *
			programsWidth;
	goog.style.setPosition(programEl, offset);
	goog.dom.appendChild(this.programsEl_, programEl);
	var clipped = width < 120;
	goog.dom.classes.enable(programEl, 'clipped', clipped);
	goog.dom.classes.enable(programEl, 'stretched', goog.style.getSize(img).height > 360);
	
	this.getHandler().listen(img,
	    goog.events.EventType.LOAD,
	    function() {
	      goog.style.showElement(img, true);
	      goog.Timer.callOnce(function() {
	        if (clipped) {
	          goog.style.setWidth(img, 200);
	        } else if (goog.style.getSize(img).height < goog.style.getSize(programEl).height) {
	          goog.dom.classes.add(img, 'fix-height');
	        }
	        // Center the cropped picture.
	        img.style.marginTop = -goog.style.getSize(img).height/2 + 'px';
	        img.style.marginLeft = -goog.style.getSize(img).width/2 + 'px';
	      });
	    });
	if (showAdmin) {
	  this.getHandler().listen(goog.dom.getElementByClass('remove', programEl),
	      goog.events.EventType.CLICK,
	      goog.bind(this.onRemoveProgram_, this, program, programEl));
	}
};


/**
 * @param {brkn.model.Program} program The program to add
 */
brkn.Channel.prototype.updateProgram = function(program) {
  var programEl = this.programs_[program.id];
  var programsWidth = goog.style.getSize(this.programsEl_).width;
  var offset = (goog.date.fromIsoString(program.time + 'Z').getTime() - this.minTime_.getTime())/
      (this.timeline_ * 1000) * programsWidth;
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
		var programsWidth = goog.style.getSize(this.programsEl_).width;
		var offset = (tuneInTime - this.minTime_.getTime())/(this.timeline_ * 1000) * programsWidth;
		goog.style.setWidth(lineEl, ((session.tuneOut ? session.tuneOut.getTime() :
		    goog.now()) - tuneInTime)/(this.timeline_ * 10) + '%');
		goog.style.setPosition(lineEl, offset);
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
	// Update path
  this.constructPath();

  // Update viewers
	goog.object.forEach(this.getModel().viewerSessions, function(session) {
		if (!session.tuneOut) {
			var tuneInTime = Math.max(session.tuneIn.getTime(), this.startTime_.getTime());
			goog.style.setWidth(this.viewers_[session.user.id].lastChild, (goog.now() - tuneInTime)/(this.timeline_ * 10) + '%');
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
	goog.style.setHeight(this.programsEl_, goog.style.getSize(this.getElement()).height - 1);
	goog.style.setHeight(this.nameEl_, goog.style.getSize(this.getElement()).height - 1);
	
	// Redraw (THIS CAN CAUSE LATENCY ISSUE)
	goog.style.getPosition(goog.dom.getElement('guide'));
};
