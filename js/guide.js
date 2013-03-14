goog.provide('brkn.Guide');

goog.require('soy');
goog.require('brkn.Exp');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Controller');

goog.require('goog.date.Interval');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Guide = function() {
  goog.base(this);

  /**
   * @type {number}
   * @private
   */
  this.timeslots_ = 2;

  /**
   * Minutes per timeslot
   * 
   * @type {number}
   * @private
   */
  this.interval_ = 5;

  /**
   * @type {number}
   */
  this.timeline = this.timeslots_ * this.interval_ * 60;

  /**
   * @type {Array.<brkn.Channel>}
   * @private
   */
  this.channels_ = [];

  /**
   * @type {Object.<string, brkn.Channel>}
   * @private
   */
  this.channelMap_ = {};
  
  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();
  
  /**
   * @type {number}
   * @private
   */
  this.guideOffset_ = 0;
  
  /**
   * @type {boolean}
   * @private
   */
  this.scrolled_ = false;
  
  /**
   * @type {boolean}
   * @private
   */
  this.scrolling_ = false;

  /**
   * @type {boolean}
   * @private
   */
  this.aligned_ = true;

  /**
   * @type {boolean}
   * @private
   */
  this.firstAlign_ = true;
  
  /**
   * @type {boolean}
   * @private
   */
  this.dragging_ = false;

  /** 
   * @type {Array}
   * @private
   */
  this.cursor_ = [brkn.model.Channels.getInstance().currentChannel,
                  brkn.model.Channels.getInstance().currentChannel.getCurrentProgram()];
};
goog.inherits(brkn.Guide, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.Guide.NAME_WIDTH = 200;


/**
 * @type {number}
 * @constant
 */
brkn.Guide.HISTORY_SLOTS = 0;


/**
 * @type {number}
 * @private
 */
brkn.Guide.prototype.width_;


/**
 * @type {number}
 * @private
 */
brkn.Guide.prototype.pixelsPerSecond_;


/**
 * @type {number}
 * @private
 */
brkn.Guide.prototype.timeslotWidth_;


/**
 * @type {brkn.Channel}
 * @private
 */
brkn.Guide.prototype.currentChannel_;


/**
 * @type {brkn.model.Channel}
 * @private
 */
brkn.Guide.prototype.myChannel_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.tickerEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.myTickerEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.channelsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.headerEl_;


/**
 * Where the current timeslot starts
 * @type {goog.date.DateTime}
 * @private
 */
brkn.Guide.prototype.startTime_;


/**
 * Where the timeline starts
 * @type {goog.date.DateTime}
 * @private
 */
brkn.Guide.prototype.minTime_;


/**
 * Where the timeline ends (end of last timeslot)
 * @type {goog.date.DateTime}
 * @private
 */
brkn.Guide.prototype.maxTime_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.channelNameStyle_;


/**
 * @type {goog.fx.Dragger}
 * @private
 */
brkn.Guide.prototype.dragger_;


/**
 * @type {number}
 * @private
 */
brkn.Guide.prototype.controllerHeight_;


/** @inheritDoc */
brkn.Guide.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.tickerEl_ = goog.dom.getElement('ticker');
  this.myTickerEl_ = goog.dom.getElement('my-ticker');
  var goLiveEl = goog.dom.getElement('go-live');
  this.headerEl_ = goog.dom.getElement('header');
  this.channelsEl_ = goog.dom.getElement('channels');
  this.horizon_ = 3;
  this.width_ = goog.dom.getViewportSize().width * this.horizon_;
  this.controllerHeight_ = goog.style.getSize(goog.dom.getElement('controller')).height;

  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      function(show) {
        this.toggleGuide_(show);
      }, this);
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'sidebar-toggled', show);
        this.align_(false, undefined, true);
        this.updateNowButtons_();
      }, this);
  
  this.toggleGuide_(goog.dom.classes.has(this.getElement(), 'toggled'));

  // Set start time
  this.startTime_ = new goog.date.DateTime();
  var minutes = 60;
  while (minutes >= this.startTime_.getMinutes()) {
    minutes -= this.interval_;
  }
  this.startTime_.setMinutes(minutes);

  this.minTime_ = this.startTime_.clone();
  this.minTime_.add(new goog.date.Interval(0, 0, 0, 0, -this.interval_ * brkn.Guide.HISTORY_SLOTS));
  
  this.maxTime_ = this.minTime_.clone();
  this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * (this.timeslots_ + 1)));
  
  this.addTimeSlots(this.timeslots_, this.minTime_);

  goog.style.setWidth(this.getElement(), this.width_);
  var viewOffset = brkn.Guide.HISTORY_SLOTS/this.timeslots_ * this.width_;
  
  this.pixelsPerSecond_ = (this.width_ - brkn.Guide.NAME_WIDTH)/this.timeline;
  this.timeslotWidth_ = this.width_/this.timeslots_;

  this.channelNameStyle_ = document.createElement('style');
  this.channelNameStyle_.id = 'channel-name-offs'
  this.channelNameStyle_.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(this.channelNameStyle_);
  this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' +
    '{left:0 !important}';
  
  var maxLastProgram = 0;
  goog.array.forEach(brkn.model.Channels.getInstance().channels, goog.bind(function(c) {
    if (!(c.myChannel && !brkn.Exp.MY_CHANNEL)) {
      var channel = new brkn.Channel(c, this.timeline, this.startTime_, 0, this.minTime_);
      channel.render(this.channelsEl_);
      this.channels_.push(channel);
      this.channelMap_[c.id] = channel;

      c.subscribe(brkn.model.Channel.Action.ONLINE, function(online) {
        this.resize_();
      }, this);

      var programs = goog.dom.getElementsByClass('program', channel.getElement());
      var lastProgram = /** @type {Element} */ goog.array.peek(programs);
      if (lastProgram) {
        maxLastProgram = Math.max(maxLastProgram, goog.style.getPosition(lastProgram).x +
            goog.style.getSize(lastProgram).width + 170 /* for suggestion box */);
      }
    }
    if (c.id == brkn.model.Channels.getInstance().currentChannel.id && channel) {
      goog.dom.classes.add(channel.getElement(), 'current');
      this.currentChannel_ = channel;
      // Stored for use in dragger override
      window['currentChannel'] = this.currentChannel_;
    }
    this.myChannel_ = c.myChannel ? c : this.myChannel_;
  }, this));
  
  this.dragger_ = new goog.fx.Dragger(this.getElement());
  var channelNameStyle = this.channelNameStyle_;
  var el = this.getElement();
  this.dragger_.defaultAction = function(x, y) {
    if (x < 0 && x > (-goog.style.getSize(el).width + goog.dom.getViewportSize().width)) {
      // Has no access to this object's scope
      window['currentChannel'] && window['currentChannel'].update();
      this.target.style.left = x + 'px';
      channelNameStyle.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:' + -x
          + 'px !important}';
    }
  };

  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  
  this.getHandler()
    .listen(brkn.model.Clock.getInstance().clock,
        goog.Timer.TICK,
        goog.bind(this.tick_, this))
    .listen(goLiveEl, goog.events.EventType.CLICK, goog.bind(function() {
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
          this.currentChannel_.getModel());
      brkn.model.Controller.getInstance().publish(
          brkn.model.Controller.Actions.PLAY,
          true);
    }, this))
    .listen(window, goog.events.EventType.RESIZE, goog.bind(this.align_, this))
    .listen(this.tickerEl_, goog.events.EventType.CLICK,
        goog.bind(this.align_, this, true, undefined, false))
    .listen(nowLeft, goog.events.EventType.CLICK, goog.bind(this.onLeft_, this))
    .listen(nowRight, goog.events.EventType.CLICK, goog.bind(this.onRight_, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function() {
          goog.dom.classes.remove(this.getElement(), 'animate');
          goog.dom.classes.add(this.getElement(), 'drag');
          this.dragging_ = true;
        }, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.END,
        goog.bind(function() {
          goog.dom.classes.remove(this.getElement(), 'drag');
          goog.dom.classes.add(this.getElement(), 'animate');
          this.dragging_ = false;
          this.aligned_ = false;
          this.updateNowButtons_();
        }, this))
    .listen(this.headerEl_,
        'mousewheel',
        goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          e = e.getBrowserEvent();
          goog.dom.classes.remove(this.getElement(), 'animate');
          goog.dom.classes.add(this.getElement(), 'drag');
          this.dragging_ = true;
          var delta = e.wheelDelta ? e.wheelDelta : e.detail ? -e.detail : 0;
          var x = goog.style.getPosition(this.getElement()).x + delta;
          if (x < 0 && x > (-1 * this.width_ + goog.dom.getViewportSize().width)) {
            goog.style.setPosition(this.getElement(), x);
            this.currentChannel_ && this.currentChannel_.update();
            this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:'
                + -x + 'px !important}';
          }
          goog.dom.classes.remove(this.getElement(), 'drag');
          goog.dom.classes.add(this.getElement(), 'animate');
          this.dragging_ = false;
          this.aligned_ = false;
          this.updateNowButtons_();
        }, this));

  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      goog.bind(function() {
        goog.Timer.callOnce(goog.bind(function() {
          this.align_(!brkn.model.Controller.getInstance().guideToggled ? true : undefined);
        }, this));
      }, this));
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'admin', show);
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);

  while (goog.style.getSize(this.getElement()).width < maxLastProgram) {
    this.expand_();
  }
  this.resize_();

  if (this.isAdmin_) {
    // Don't drag when shift key is pressed...we're rescheduling a show.
    this.getHandler().listen(this.dragger_, goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function(e) {
          if (e.browserEvent.shiftKey) {
            e.preventDefault();
          }
        }, this));
  }
};



/**
 * @param {Element} el
 * @param {number} scrollTo
 */
brkn.Guide.prototype.forceScroll_ = function(el, scrollTo) {
  var tries = 0;
  var backoff = 0;
  
  if (el.scrollTop == scrollTo) {
    return;
  }
  el.scrollTop = scrollTo;
};


/**
 * @param {boolean} show
 * @private
 */
brkn.Guide.prototype.toggleGuide_ = function(show) {
  // Align before we see guide
  goog.dom.classes.remove(this.getElement(), 'animate');
  this.align_(true, undefined, false);
  goog.dom.classes.add(this.getElement(), 'animate');

  var height = Math.min(this.channelsEl_.scrollHeight, 210);
  goog.dom.classes.enable(this.getElement(), 'toggled', show);
  goog.style.setHeight(this.getElement(), show ? height + this.controllerHeight_ + 19 :
      this.controllerHeight_);
  if (this.currentChannel_) {
    // In case we're async playing.
    this.channelsEl_.scrollTop = goog.style.getPosition(this.currentChannel_.getElement()).y;
  }
  goog.Timer.callOnce(goog.bind(function() {
    goog.style.setHeight(this.channelsEl_, show ? height : 40);
    goog.dom.classes.enable(this.getElement(), 'collapsed', !show);
    this.resize_();
    this.align_();
    if (this.currentChannel_) {
      this.forceScroll_(this.channelsEl_, goog.style.getPosition(this.currentChannel_.getElement()).y);
    }
  }, this), show ? 0 : 800);

  show && this.resize_();
  this.dragger_ && this.dragger_.setEnabled(show);
};


/**
 * Render time slots
 * @param {number} timeslots
 * @param {goog.date.DateTime} startTime
 */
brkn.Guide.prototype.addTimeSlots = function(timeslots, startTime) {
  // Add time increment elements
  var timesEl = goog.dom.getElementByClass('times', this.getElement());
  for (var i = 0; i <= timeslots; i++) {
    var slot = startTime.clone();
    slot.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * i));
    goog.dom.appendChild(timesEl, goog.dom.createDom('div', {
      'class' : 'time',
      'style' : 'width:' + (this.width_ - brkn.Guide.NAME_WIDTH) / this.timeslots_ + 'px'
    }, slot.toUsTimeString()));
  }
};


/**
 * @param {brkn.model.Channel}
 *          channel
 */
brkn.Guide.prototype.changeChannel = function(channel) {
  this.currentChannel_ && goog.dom.classes.remove(this.currentChannel_.getElement(), 'current');
  this.currentChannel_ = this.channelMap_[channel.id] || null;
  window['currentChannel'] = this.currentChannel_;
  if (this.currentChannel_) {
    goog.dom.classes.add(this.currentChannel_.getElement(), 'current');
    goog.Timer.callOnce(goog.bind(this.align_, this, true, undefined, false));
  }
  this.cursor_[0] = channel;
};


/**
 * @param {brkn.model.Program} program
 * @private
 */
brkn.Guide.prototype.playAsync_ = function(program) {
  this.myChannel_ = this.myChannel_ || brkn.model.Channels.getInstance().getMyChannel();
  if (brkn.Exp.MY_CHANNEL && !this.channelMap_[this.myChannel_.id]) {
    var channel = new brkn.Channel(this.myChannel_, this.timeline, this.startTime_, 0,
        this.minTime_);
    channel.render(this.channelsEl_);
    this.channels_.push(channel);
    this.channelMap_[this.myChannel_.id] = channel;
  }
  
  brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.myChannel_);
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_GUIDE, false);
};


/**
 * @param {?boolean=} opt_hide
 * @private
 */
brkn.Guide.prototype.updateNowButtons_ = function(opt_hide) {
  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
  var sidebarWidth = brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0;
  var viewWidth = goog.dom.getViewportSize().width - sidebarWidth;
  var timelineWidth = goog.style.getSize(this.getElement()).width - sidebarWidth - 200;
  var currentPixels = this.cursor_[0].hasNextProgram(this.guideOffset_ + 1) ?
      ((this.cursor_[0].getCurrentProgram(this.guideOffset_ + 1).time.getTime() - goog.now())/1000 +
          this.cursor_[0].getCurrentProgram(this.guideOffset_ + 1).media.duration) * this.pixelsPerSecond_ + viewWidth : 0;
  if (currentPixels > timelineWidth - elapsed) {
    this.expand_();
  }
  nowRight.style.right = brkn.model.Controller.getInstance().sidebarToggled ? '300px' : 0;
 
  // Base NOW on current program, not live program
  //  goog.dom.classes.enable(nowRight, 'now', !!(-elapsed <
  //      goog.style.getPosition(this.getElement()).x - viewWidth || opt_hide));
  //  goog.dom.classes.enable(nowLeft, 'now', !!(-elapsed >
  //      goog.style.getPosition(this.getElement()).x + brkn.Guide.NAME_WIDTH || opt_hide));
  
  goog.dom.classes.enable(nowRight, 'now', !!(-goog.style.getPosition(this.tickerEl_).x <
      goog.style.getPosition(this.getElement()).x - viewWidth || opt_hide));
  goog.dom.classes.enable(nowLeft, 'now', !!(-goog.style.getPosition(this.tickerEl_).x >
  goog.style.getPosition(this.getElement()).x || opt_hide));

  var prevOffset = -1;
  if (this.cursor_[0].hasPrevProgram(this.guideOffset_) &&
      this.cursor_[0].getCurrentProgram(this.guideOffset_ - 1)) {
    var prevProgram = this.cursor_[0].getCurrentProgram(this.guideOffset_ - 1);
    prevOffset = (prevProgram.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
  }

  goog.style.showElement(nowRight, this.cursor_[0].hasNextProgram(this.guideOffset_) ||
      goog.dom.classes.has(nowRight, 'now'));
  goog.style.showElement(nowLeft, prevOffset > 0 || goog.dom.classes.has(nowLeft, 'now'));
};


/**
 * @private
 */
brkn.Guide.prototype.onLeft_ = function() {
  var nowLeft = goog.dom.getElement('now-left');
  if (goog.dom.classes.has(nowLeft, 'now')) {
    if (brkn.model.Channels.getInstance().currentChannel.getCurrentProgram() == 
      brkn.model.Player.getInstance().getCurrentProgram()) {
      this.align_(true, undefined, undefined, true); 
    } else {
      this.align_(false, undefined, undefined, true); 
    }
  } else {
    this.align_(false, -1);
  }
};


/**
 * @private
 */
brkn.Guide.prototype.onRight_ = function() {
  var nowRight = goog.dom.getElement('now-right');
  if (goog.dom.classes.has(nowRight, 'now')) {
    if (brkn.model.Channels.getInstance().currentChannel.getCurrentProgram() == 
      brkn.model.Player.getInstance().getCurrentProgram()) {
      this.align_(true, undefined, undefined, true); 
    } else {
      this.align_(false, undefined, undefined, false); 
    }
  } else {
    this.align_(false, 1);
  }
}


/**
 * @private
 */
brkn.Guide.prototype.expand_ = function() {
  // Update UI per last set of params
  var slotsPerHorizon = this.timeslots_/this.horizon_;
  var newSlots = Math.ceil(slotsPerHorizon);
  // Add a timeslot
  this.addTimeSlots(1, this.maxTime_);
  this.width_ += this.timeslotWidth_;
  goog.style.setWidth(this.getElement(), this.width_);
  this.timeslots_++;
  this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * newSlots));
  this.timeline = this.timeslots_ * this.interval_ * 60;
};


/**
 * @private
 */
brkn.Guide.prototype.tick_ = function() {
  if (brkn.model.Controller.getInstance().guideToggled || this.firstAlign_) {
    var isMyChannel = brkn.model.Channels.getInstance().currentChannel &&
        brkn.model.Channels.getInstance().currentChannel.myChannel || false;
    var currentProgram = brkn.model.Channels.getInstance().currentChannel &&
        brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
    var myCurrentProgram = brkn.model.Player.getInstance().getCurrentProgram();
    var myCurrentProgress = brkn.model.Player.getInstance().getProgress()*1000;
    
    var elapsed = Math.round((goog.now() - this.minTime_.getTime())/1000 *
        this.pixelsPerSecond_);
    var myElapsed = myCurrentProgram && myCurrentProgress ?
        Math.round((myCurrentProgram.time.getTime() +
        myCurrentProgress - this.minTime_.getTime())/1000 *
        this.pixelsPerSecond_) : elapsed;
    this.updateNowButtons_();
    
    goog.style.setPosition(this.tickerEl_, elapsed);
    goog.style.setPosition(this.myTickerEl_, myElapsed);
    // goog.style.showElement(this.tickerEl_, !!currentProgram);
    goog.style.showElement(this.myTickerEl_, !!myCurrentProgram);
    goog.dom.classes.enable(this.tickerEl_, 'go-live', !isMyChannel && !!currentProgram &&
        !!myCurrentProgram && currentProgram.id != myCurrentProgram.id && 
        Math.abs(myElapsed - elapsed) > 45);
    // goog.dom.classes.enable(this.tickerEl_, 'can-go-live', !isMyChannel &&
    //     Math.abs(myElapsed - elapsed) > 15);
    goog.dom.classes.enable(this.myTickerEl_, 'show', !Math.abs(myElapsed - elapsed) > 15);
    goog.dom.classes.enable(this.myTickerEl_, 'show-me', !isMyChannel &&
        Math.abs(myElapsed - elapsed) > 15);

    if (this.firstAlign_) {
      this.firstAlign_ = false;
      this.align_(true, undefined, false);
      goog.dom.classes.add(this.getElement(), 'animate');
    } else if (!this.dragging_) {
      this.align_();
    }
  }
};


/**
 * @param {?boolean=} opt_setAligned
 * @param {?number=} opt_offset
 * @param {?boolean=} opt_setScrolled
 * @param {?boolean=} opt_live
 * @private
 */
brkn.Guide.prototype.align_ = function(opt_setAligned, opt_offset, opt_setScrolled, opt_live) {
  this.aligned_ = opt_setAligned != undefined ? !!opt_setAligned : this.aligned_;
  this.scrolled_ = opt_setAligned != undefined ? !!opt_setScrolled : this.aligned_;
  this.guideOffset_ = this.aligned_ ? 0 : opt_offset ? this.guideOffset_ + opt_offset : this.guideOffset_;
  var liveProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram(this.guideOffset_);
  var program;
  if (!brkn.model.Channels.getInstance().currentChannel.myChannel) {
    program = opt_live ? liveProgram : this.aligned_ ?
        brkn.model.Player.getInstance().getCurrentProgram() :
        this.cursor_[0].getCurrentProgram(this.guideOffset_);
  } else {
    // Find an online channel to align to
    var channel = brkn.model.Channels.getInstance().findOnline(true);
    program = channel && channel.getCurrentProgram();
  }
  this.cursor_[1] = program;

  if (!this.aligned_) {
    goog.dom.classes.remove(this.getElement(), 'tick-along');
  }

  if ((this.aligned_ || opt_offset) && this.minTime_) {
    var myCurrentProgram = brkn.model.Player.getInstance().getCurrentProgram();
    var myCurrentProgress = brkn.model.Player.getInstance().getCurrentTime();
    var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
    var myElapsed = myCurrentProgram && myCurrentProgress ?
        Math.round((myCurrentProgram.time.getTime() +
        myCurrentProgress - this.minTime_.getTime())/1000 *
        this.pixelsPerSecond_) : elapsed;

    // Expand timeline if need be
    while (elapsed + goog.dom.getViewportSize().width > this.width_ -
        (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0)) {
      this.expand_();
    }

    var viewWidth = goog.dom.getViewportSize().width - 
        (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0);

    var offset = 0;
    if (program) {
      offset = -(program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_ + 5;
    }

    // Align to current playing program
    //    if (!opt_offset && brkn.model.Controller.getInstance().guideToggled &&
    //        elapsed > -offset + viewWidth - 300) {
    //      // If program is off-screen, keep up.
    //      window.console.log('PROGRAM IS OFF SCREEN')
    //      offset = (opt_live ? -elapsed : -myElapsed) + viewWidth - 350;
    //    }

    if (!program || (!opt_offset && brkn.model.Controller.getInstance().guideToggled &&
        elapsed > -offset + viewWidth - 300)) {
      // If off-screen (last program is done), align to ticker
      offset = -goog.style.getPosition(this.tickerEl_).x + viewWidth - 200;
      goog.dom.classes.add(this.getElement(), 'tick-along');
    }
   
    offset = Math.max(offset, -goog.style.getSize(this.getElement()).width + viewWidth)
    offset = Math.min(offset, 0);
    goog.style.setPosition(this.getElement(), offset);
    this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' +
        '{left:' + -offset + 'px !important}';

    if (!this.scrolled_ && this.currentChannel_) {
      var scrollTo = goog.style.getPosition(this.currentChannel_.getElement()).y -
          goog.style.getSize(this.headerEl_).height; 
      var scrollAnim = new goog.fx.dom.Scroll(this.channelsEl_,
          [this.channelsEl_.scrollLeft, this.channelsEl_.scrollTop],
          [this.channelsEl_.scrollLeft, scrollTo], this.channels_.length * 100);
      this.getHandler().listen(scrollAnim, goog.fx.Animation.EventType.END, goog.bind(function() {
        // Forced value just in case.
        this.forceScroll_(this.channelsEl_, scrollTo);
        this.scrolling_ = false;
      }, this));
      goog.Timer.callOnce(goog.bind(function() {
        this.scrolling_ = true;
        scrollAnim.play();
      }, this), 100);
    }
  }
  
  if (opt_offset) {
    this.updateNowButtons_();
  }
};

/**
 * @private
 */
brkn.Guide.prototype.resize_ = function() {
  var channelsHeight = Math.min(this.channelsEl_.scrollHeight, 210);
  goog.style.setHeight(this.channelsEl_, goog.dom.classes.has(this.getElement(), 'toggled')
      ? channelsHeight : this.controllerHeight_);
  goog.style.setHeight(this.getElement(), goog.dom.classes.has(this.getElement(), 'collapsed') ?
      this.controllerHeight_ : channelsHeight + this.controllerHeight_ + 19);
};
