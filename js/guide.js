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
  this.isAdmin_ = !!brkn.model.Users.getInstance().currentUser && brkn.model.Users.getInstance().currentUser.isAdmin();
  
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

  /**
   * @type {number}
   * @private
   */
  this.maxLastProgram_ = 0;
  
  /**
   * @type {number}
   * @private
   */
  this.pixelsPerProgram_ = 201;
};
goog.inherits(brkn.Guide, goog.ui.Component);


/**
 * @type {boolean}
 * @constant
 */
brkn.Guide.MY_TICKER = false;


/**
 * @type {number}
 * @constant
 */
brkn.Guide.NAME_WIDTH = 200;


/**
 * @type {number}
 * @constant
 */
brkn.Guide.GUIDE_HEIGHT = 210;


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
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.scrollableEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.hScrollableEl_;


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
  this.scrollableEl_ = goog.dom.getElementByClass('channel-scrollable', this.getElement());
  this.hScrollableEl_ = goog.dom.getElementByClass('channel-h-scrollable', this.getElement());
  this.horizon_ = 1;
  this.width_ = Math.max(1280, goog.dom.getViewportSize().width) * this.horizon_;
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

  goog.style.setWidth(this.channelsEl_, this.width_);
  goog.style.setWidth(this.headerEl_, this.width_);
  var viewOffset = brkn.Guide.HISTORY_SLOTS/this.timeslots_ * this.width_;
  
  this.pixelsPerSecond_ = (this.width_ - brkn.Guide.NAME_WIDTH)/this.timeline;
  this.timeslotWidth_ = this.width_/this.timeslots_;

  this.channelNameStyle_ = document.createElement('style');
  this.channelNameStyle_.id = 'channel-name-offs'
  this.channelNameStyle_.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(this.channelNameStyle_);

  var maxLastProgram = 0;
  goog.array.forEach(brkn.model.Channels.getInstance().channels, goog.bind(function(c) {
    this.addChannel_(c);
  }, this));
  
  this.dragger_ = new goog.fx.Dragger(this.hScrollableEl_);
  var channelNameStyle = this.channelNameStyle_;
  var el = this.getElement();
  var channelsEl = this.channelsEl_;
  var hScrollableEl = this.hScrollableEl_;
  var scrollableEl = this.scrollableEl_;
  var headerEl = this.headerEl_;
  var firstY;
  var lastY;
  var lastX = 0;
  this.dragger_.defaultAction = function(x, y) {
    if (this.target) {
      this.target.scrollLeft -= (x - lastX);
      lastX = x;
      if (goog.dom.classes.has(this.target, 'channel-h-scrollable')) {
        headerEl.style.left = -this.target.scrollLeft + 'px';
      }
    }
    firstY = firstY || y;
    scrollableEl.scrollTop -= (y- (lastY || firstY));
    lastY = y;
  };

  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  
  this.getHandler()
    .listen(brkn.model.Clock.getInstance().clock,
        goog.Timer.TICK,
        goog.bind(this.tick_, this))
    .listen(goLiveEl, goog.events.EventType.CLICK, goog.bind(function() {
      brkn.model.Channels.getInstance().currentChannel.offline = false;
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
          brkn.model.Channels.getInstance().currentChannel);
    }, this))
    .listen(window, goog.events.EventType.RESIZE, goog.bind(this.align_, this))
    .listen(this.tickerEl_, goog.events.EventType.CLICK,
        goog.bind(this.align_, this, true, undefined, false))
    .listen(nowLeft, goog.events.EventType.CLICK, goog.bind(this.onLeft_, this))
    .listen(nowRight, goog.events.EventType.CLICK, goog.bind(this.onRight_, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function(e) {
          if (!this.dragging_ && brkn.model.Controller.getInstance().timeless) {
            e = e.browserEvent;
            var target = goog.dom.getAncestorByClass(e.target, 'channel') ||
                goog.dom.getElementByClass('channel', e.target);
            var programsEl = goog.dom.getElementByClass('programs', target);
            programsEl.style.paddingRight = goog.dom.getViewportSize().width - 400 + 'px';
            
            this.dragger_.target = target;
          } else if (!this.dragging_) {
            this.dragger_.target = this.hScrollableEl_;
          }
          goog.dom.classes.remove(this.getElement(), 'animate');
          goog.dom.classes.add(this.getElement(), 'drag');
          this.dragging_ = true;
        }, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.END,
        goog.bind(function() {
          goog.Timer.callOnce(goog.bind(function() {
            goog.dom.classes.remove(this.getElement(), 'drag'); 
          }, this));
          goog.dom.classes.add(this.getElement(), 'animate');
          this.dragging_ = false;
          this.aligned_ = false;
          firstY = undefined;
          lastY = 0;
          lastX = 0;
          this.updateNowButtons_();
        }, this))
    .listen(this.channelsEl_,
        'mousewheel',
        goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          e = e.getBrowserEvent();
          var delta = e.wheelDelta ? e.wheelDelta : e.detail ? -e.detail : 0;
          this.scrollableEl_.scrollTop -= delta;
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
          this.hScrollableEl_.scrollLeft += delta;
          goog.dom.classes.remove(this.getElement(), 'drag');
          goog.dom.classes.add(this.getElement(), 'animate');
          this.dragging_ = false;
          this.aligned_ = false;
          this.updateNowButtons_();
        }, this))
    .listen(goog.dom.getElementByClass('switcher', this.getElement()),
        goog.events.EventType.CLICK,
        goog.bind(function(e) {
          goog.dom.classes.remove(this.getElement(), 'animate');
          brkn.model.Controller.getInstance().timeless = !brkn.model.Controller.getInstance().timeless;
          if (brkn.model.Controller.getInstance().timeless) {
            goog.dom.classes.add(this.getElement(), 'timeless');
            goog.Timer.callOnce(goog.bind(function() {
              goog.dom.classes.add(this.getElement(), 'position-hack');
              goog.dom.classes.add(this.getElement(), 'animate');
            }, this));
          } else {
            goog.dom.classes.remove(this.getElement(), 'timeless');
            goog.Timer.callOnce(goog.bind(function() {
              goog.dom.classes.remove(this.getElement(), 'position-hack');
              goog.dom.classes.add(this.getElement(), 'animate');
            }, this));
          }
          this.align_(true, undefined, false);
        }, this));

  window.onbeforeunload = function(e) {
    return 'Leaving so soon?'
  };

  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.RESIZE,
      this.resize_, this);
  
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.ADD_CHANNEL,
      this.addChannel_, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      goog.bind(function() {
        if (!this.dragging_) {
          goog.Timer.callOnce(goog.bind(function() {
            this.align_(true);
          }, this));
        }
      }, this));
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'admin', show);
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);

  while (this.width_ < this.maxLastProgram_) {
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
 * @param {brkn.model.Channel} c
 */
brkn.Guide.prototype.addChannel_ = function(c) {
  if (this.channelMap_[c['id']]) {
    // Already exists
    return;
  }
  if (!(c.myChannel && !brkn.Exp.MY_CHANNEL)) {
    var channel = new brkn.Channel(c, this.timeline, this.startTime_, 0, this.minTime_);
    channel.render(this.channelsEl_);
    this.channels_.push(channel);
    this.channelMap_[c.id] = channel;

    c.subscribe(brkn.model.Channel.Action.ONLINE, function(online) {
      goog.Timer.callOnce(goog.bind(function() {
        this.resize_();
      }, this));
    }, this);
    channel.update();

    var programs = goog.dom.getElementsByClass('program', channel.getElement());
    var lastProgram = /** @type {Element} */ goog.array.peek(programs);
    if (lastProgram) {
      this.maxLastProgram_ = Math.max(this.maxLastProgram_, goog.style.getPosition(lastProgram).x +
          goog.style.getSize(lastProgram).width);
    }
  }
  if (c.id == brkn.model.Channels.getInstance().currentChannel.id && channel) {
    channel.setCurrent(true);
    this.currentChannel_ = channel;
  }
  this.myChannel_ = c.myChannel ? c : this.myChannel_;
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
 * @private
 */
brkn.Guide.prototype.transform_ = function(element, x, y) {
  element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px,0)';
  element.style.msTransform = 'translate3d(' + x + 'px, ' + y + 'px,0)';
  element.style.WebkitTransform = 'translate3d(' + x + 'px, ' + y + 'px,0)';
  element.style.MozTransform = 'translate3d(' + x + 'px, ' + y + 'px,0)';
  element.style.OTransform = 'translate3d(' + x + 'px, ' + y + 'px,0)';
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

  var height = Math.min(this.channelsEl_.scrollHeight, brkn.Guide.GUIDE_HEIGHT);
  goog.dom.classes.enable(this.getElement(), 'toggled', show);

  goog.style.setHeight(this.getElement(), show ? height + this.controllerHeight_ :
      this.controllerHeight_);
  if (this.currentChannel_) {
    // In case we're async playing.
    this.scrollableEl_.scrollTop = goog.style.getPosition(this.currentChannel_.getElement()).y;
  }

  goog.Timer.callOnce(goog.bind(function() {
    goog.style.setHeight(this.scrollableEl_, show ? height : 40);
    goog.style.setHeight(this.hScrollableEl_, goog.style.getSize(this.channelsEl_).height + 22);
    goog.dom.classes.enable(this.getElement(), 'collapsed', !show);
    this.resize_();
    this.align_();
    if (this.currentChannel_) {
      this.forceScroll_(this.scrollableEl_, goog.style.getPosition(this.currentChannel_.getElement()).y);
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
  if (channel) {
    this.currentChannel_ && this.currentChannel_.setCurrent(false);
    this.currentChannel_ = this.channelMap_[channel.id] || null;
    if (this.currentChannel_) {
      this.currentChannel_.setCurrent(true);
      goog.Timer.callOnce(goog.bind(this.align_, this, true, undefined, false));
    }
    this.cursor_[0] = channel;
  }
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
};


/**
 * @param {?boolean=} opt_hide
 * @private
 */
brkn.Guide.prototype.updateNowButtons_ = function(opt_hide) {
  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
  var sidebarWidth = brkn.model.Controller.getInstance().sidebarToggled ? 320 : 0;
  var viewWidth = goog.dom.getViewportSize().width - sidebarWidth;
  var timelineWidth = this.width_ - sidebarWidth - 200;
  var currentPixels = this.cursor_[0].hasNextProgram(this.guideOffset_ + 1) ?
      ((this.cursor_[0].getCurrentProgram(this.guideOffset_ + 1).time.getTime() - goog.now())/1000 +
          this.cursor_[0].getCurrentProgram(this.guideOffset_ + 1).media.duration) * this.pixelsPerSecond_ + viewWidth : 0;
  if (currentPixels > this.width_ - elapsed) {
    this.expand_();
  }
  nowRight.style.right = brkn.model.Controller.getInstance().sidebarToggled ? '320px' : 0;
 
  // Base NOW on current program, not live program
  //  goog.dom.classes.enable(nowRight, 'now', !!(-elapsed <
  //      goog.style.getPosition(this.getElement()).x - viewWidth || opt_hide));
  //  goog.dom.classes.enable(nowLeft, 'now', !!(-elapsed >
  //      goog.style.getPosition(this.getElement()).x + brkn.Guide.NAME_WIDTH || opt_hide));

  if (brkn.model.Controller.getInstance().timeless) {
    goog.dom.classes.enable(nowRight, 'now', this.guideOffset_ < 0);
    goog.dom.classes.enable(nowLeft, 'now', this.guideOffset_ > 0);
  } else {
    goog.dom.classes.enable(nowRight, 'now', !!(-goog.style.getPosition(this.tickerEl_).x <
        -this.hScrollableEl_.scrollLeft - viewWidth || opt_hide));
    goog.dom.classes.enable(nowLeft, 'now', !!(-goog.style.getPosition(this.tickerEl_).x >
        -this.hScrollableEl_.scrollLeft || opt_hide));
  }

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
  this.updateNowButtons_();
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
  this.updateNowButtons_();
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
  goog.style.setWidth(this.channelsEl_, this.width_);
  goog.style.setWidth(this.headerEl_, this.width_);
  this.timeslots_++;
  this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * newSlots));
  this.timeline = this.timeslots_ * this.interval_ * 60;
};


/**
 * @private
 */
brkn.Guide.prototype.tick_ = function() {
  if ((brkn.model.Controller.getInstance().guideToggled &&
      !brkn.model.Controller.getInstance().timeless) || this.firstAlign_) {
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
    goog.dom.classes.enable(this.tickerEl_, 'go-live', !isMyChannel && ((!!currentProgram &&
        !!myCurrentProgram && currentProgram.id != myCurrentProgram.id && 
        Math.abs(myElapsed - elapsed) > 45) || (Math.abs(myElapsed - elapsed) > 120)));
    
    if (brkn.Guide.MY_TICKER) {
      goog.style.setPosition(this.myTickerEl_, myElapsed);
      goog.style.showElement(this.myTickerEl_, !!myCurrentProgram);
      goog.dom.classes.enable(this.myTickerEl_, 'show', !Math.abs(myElapsed - elapsed) > 15);
      goog.dom.classes.enable(this.myTickerEl_, 'show-me', !isMyChannel &&
          Math.abs(myElapsed - elapsed) > 15); 
    }

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

  var liveProgram = brkn.model.Channels.getInstance().currentChannel.getScheduledProgram();
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

    var viewWidth = goog.dom.getViewportSize().width - 
        (brkn.model.Controller.getInstance().sidebarToggled ? 320 : 0);

    if (brkn.model.Controller.getInstance().timeless) {
      goog.array.forEach(brkn.model.Channels.getInstance().channels, function(channel) {
        var channelUi = this.channelMap_[channel.id];
        if (channelUi) {
          var program = channel.getCurrentProgram();
          var index = channel.currentProgramIndex || 0;
          var offset = (index + this.guideOffset_) * this.pixelsPerProgram_;
          var channelEl = goog.dom.getElementByClass('channel', channelUi.getElement())
          var programsEl = goog.dom.getElementByClass('programs', channelUi.getElement());
          programsEl.style.paddingRight = goog.dom.getViewportSize().width - 200 + 'px';
          if (offset != channelEl.scrollLeft) {
            var scrollAnim = new goog.fx.dom.Scroll(channelEl,
                [channelEl.scrollLeft, channelEl.scrollTop],
                [offset, channelEl.scrollTop], 300);
            scrollAnim.play();
          }
        }
      }, this);
    } else {
      // Expand timeline if need be
      while (elapsed + goog.dom.getViewportSize().width > this.width_ -
          (brkn.model.Controller.getInstance().sidebarToggled ? 320 : 0)) {
        this.expand_();
      }
      
      var offset = 0;
      if (program) {
        offset = (program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_ + 5;
      }

      // Align to current playing program
      //    if (!opt_offset && brkn.model.Controller.getInstance().guideToggled &&
      //        elapsed > -offset + viewWidth - 300) {
      //      // If program is off-screen, keep up.
      //      window.console.log('PROGRAM IS OFF SCREEN')
      //      offset = (opt_live ? -elapsed : -myElapsed) + viewWidth - 350;
      //    }
      
      if (!program || (!opt_offset && brkn.model.Controller.getInstance().guideToggled &&
          elapsed > offset + viewWidth - 320)) {
        // If off-screen (last program is done), align to ticker
        offset = goog.style.getPosition(this.tickerEl_).x - viewWidth + 200;
        goog.dom.classes.add(this.getElement(), 'tick-along');
      }
      
      offset = Math.max(offset, 0);
      offset = Math.min(offset, this.hScrollableEl_.scrollWidth - this.hScrollableEl_.clientWidth);
      
      if (opt_offset || opt_setAligned) {
        var scrollAnim = new goog.fx.dom.Scroll(this.hScrollableEl_,
            [this.hScrollableEl_.scrollLeft, this.hScrollableEl_.scrollTop],
            [offset - 5 /* offset */, this.hScrollableEl_.scrollTop], 300);
        scrollAnim.play();
        this.headerEl_.style.left = -offset + 'px';
      } else {
        this.hScrollableEl_.scrollLeft = offset - 5;
        this.headerEl_.style.left = -offset + 'px';
      }
    }

    if (!this.scrolled_ && this.currentChannel_) {
      var scrollTo = goog.style.getPosition(this.currentChannel_.getElement()).y -
          goog.style.getSize(this.headerEl_).height; 
      var scrollAnim = new goog.fx.dom.Scroll(this.scrollableEl_,
          [this.scrollableEl_.scrollLeft, this.scrollableEl_.scrollTop],
          [this.scrollableEl_.scrollLeft, scrollTo], this.channels_.length * 100);
      this.getHandler().listen(scrollAnim, goog.fx.Animation.EventType.END, goog.bind(function() {
        // Forced value just in case.
        this.forceScroll_(this.scrollableEl_, scrollTo);
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
  if (!brkn.model.Controller.getInstance().timeless && opt_live && (!liveProgram ||
      !brkn.model.Player.getInstance().getCurrentProgram() ||
      liveProgram.id != brkn.model.Player.getInstance().getCurrentProgram().id)) {
    this.aligned_ = false;
  }
};

/**
 * @private
 */
brkn.Guide.prototype.resize_ = function() {
  var channelsHeight = Math.min(this.channelsEl_.scrollHeight, brkn.Guide.GUIDE_HEIGHT) + 22;
  goog.style.setHeight(this.scrollableEl_, goog.dom.classes.has(this.getElement(), 'toggled')
      ? channelsHeight : this.controllerHeight_);
  goog.style.setHeight(this.hScrollableEl_, goog.style.getSize(this.channelsEl_).height + 22);
  goog.style.setHeight(this.getElement(), goog.dom.classes.has(this.getElement(), 'collapsed') ?
      this.controllerHeight_ : channelsHeight + this.controllerHeight_);
};
