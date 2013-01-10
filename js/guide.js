goog.provide('brkn.Guide');

goog.require('soy');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Controller');

goog.require('goog.date.Interval');
goog.require('goog.fx.Dragger');
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
  this.timeslots_ = 3;

  /**
   * Minutes per timeslot
   * 
   * @type {number}
   * @private
   */
  this.interval_ = 10;

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
   * @type {Object.<String, brkn.Channel>}
   * @private
   */
  this.channelMap_ = {};
  
  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();
};
goog.inherits(brkn.Guide, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.Guide.NAME_WIDTH = 200;


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
 * @type {Element}
 * @private
 */
brkn.Guide.prototype.tickerEl_;


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


/** @inheritDoc */
brkn.Guide.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.tickerEl_ = goog.dom.getElement('ticker');
  var headerEl = goog.dom.getElement('header');
  var channelsEl = goog.dom.getElement('channels');
  this.horizon_ = 3;
  this.width_ = goog.dom.getViewportSize().width * this.horizon_;

  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
//  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
//      function(show) {
//        goog.dom.classes.enable(this.getElement(), 'faded', show);
//      }, this);

  // Set start time
  var startTime = new goog.date.DateTime();
  var minutes = 60;
  while (minutes >= startTime.getMinutes()) {
    minutes -= this.interval_;
  }
  startTime.setMinutes(minutes);

  
  var historySlots = 2;
  this.minTime_ = startTime.clone();
  this.minTime_.add(new goog.date.Interval(0, 0, 0, 0, -this.interval_ * historySlots));
  
  this.maxTime_ = this.minTime_.clone();
  this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * (this.timeslots_ + 1)));
  
  this.addTimeSlots(this.timeslots_, this.minTime_);

  goog.style.setWidth(this.getElement(), this.width_);
  var viewOffset = historySlots/this.timeslots_ * this.width_;
  var startTimeOffset = viewOffset - brkn.Guide.NAME_WIDTH;
  goog.style.setPosition(this.getElement(), -1 * startTimeOffset);
  
  this.pixelsPerSecond_ = (this.width_ - brkn.Guide.NAME_WIDTH)/this.timeline;
  this.timeslotWidth_ = this.width_/this.timeslots_;

  this.channelNameStyle_ = document.createElement('style');
  this.channelNameStyle_.id = 'channel-name-offs'
  this.channelNameStyle_.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(this.channelNameStyle_);
  this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:'
      + startTimeOffset + 'px !important}';

  var dragger = new goog.fx.Dragger(this.getElement());
  var channelNameStyle = this.channelNameStyle_;
  var el = this.getElement();
  dragger.defaultAction = function(x, y) {
    if (x < 0 && x > (-goog.style.getSize(el).width + goog.dom.getViewportSize().width)) {
      this.target.style.left = x + 'px';
      channelNameStyle.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:' + -x
          + 'px !important}';
    }
  };

  goog.array.forEach(brkn.model.Channels.getInstance().channels, goog.bind(function(c) {
    var channel = new brkn.Channel(c, this.timeline, startTime, startTimeOffset, this.minTime_);
    channel.render(channelsEl);
    if (c.id == brkn.model.Channels.getInstance().currentChannel.id) {
      goog.dom.classes.add(channel.getElement(), 'current');
      this.currentChannel_ = channel;
    }
    this.channels_.push(channel);
    this.channelMap_[c.id] = channel;
  }, this));

  var resizing = false;
  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  
  this.getHandler()
    .listen(brkn.model.Clock.getInstance().clock,
        goog.Timer.TICK,
        goog.bind(function() {
          var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;

          this.updateNowButtons_();
          
          if (elapsed + goog.dom.getViewportSize().width > this.width_ -
              (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0) && !resizing) {
            resizing = true;
            window.console.log('infinite scrollerize');
            
            // Update UI per last set of params
            var slotsPerHorizon = this.timeslots_/this.horizon_;
            var newSlots = Math.ceil(slotsPerHorizon);
            // Add a timeslot
            this.addTimeSlots(1, this.maxTime_);
            this.width_ += this.timeslotWidth_;
            goog.style.setWidth(this.getElement(), this.width_);
            this.timeslots_++;
            //this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * newSlots));
            this.timeline = this.timeslots_ * this.interval_ * 60;
            resizing = false;
          }
          goog.style.setPosition(this.tickerEl_, elapsed);
        }, this))
    .listen(nowLeft, goog.events.EventType.CLICK, goog.bind(this.align_, this))
    .listen(nowRight, goog.events.EventType.CLICK, goog.bind(this.align_, this))
    .listen(dragger,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function() {
          goog.dom.classes.add(this.getElement(), 'drag');
        }, this))
    .listen(dragger,
        goog.fx.Dragger.EventType.END,
        goog.bind(function() {
          goog.dom.classes.remove(this.getElement(), 'drag');
          this.updateNowButtons_();
        }, this))
    .listen(headerEl,
        'mousewheel',
        goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          e = e.getBrowserEvent();
          goog.dom.classes.add(this.getElement(), 'drag');
          var delta = e.wheelDelta ? e.wheelDelta : e.detail ? -e.detail : 0;
          var x = goog.style.getPosition(this.getElement()).x + delta;
          if (x < 0 && x > (-1 * this.width_ + goog.dom.getViewportSize().width)) {
            goog.style.setPosition(this.getElement(), x);
            this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:'
                + -x + 'px !important}';
          }
          goog.dom.classes.remove(this.getElement(), 'drag');
          this.updateNowButtons_();
        }, this));

  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      this.align_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'admin', show);
      }, this);
  
  this.align_();
  
  if (this.isAdmin_) {
    // Don't drag when shift key is pressed...we're rescheduling a show.
    this.getHandler().listen(dragger, goog.fx.Dragger.EventType.BEFOREDRAG, goog.bind(function(e) {
      if (e.browserEvent.shiftKey) {
        e.preventDefault();
      }
    }, this));
  }
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
  goog.dom.classes.remove(this.currentChannel_.getElement(), 'current');
  this.currentChannel_ = this.channelMap_[channel.id];
  goog.dom.classes.add(this.currentChannel_.getElement(), 'current');
  this.align_();
};


/**
 * @param {?boolean=} opt_hide
 * @private
 */
brkn.Guide.prototype.updateNowButtons_ = function(opt_hide) {
  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
  nowRight.style.right = brkn.model.Controller.getInstance().sidebarToggled ? '300px' : 0;
  goog.style.showElement(nowRight, -elapsed < goog.style.getPosition(this.getElement()).x -
      goog.dom.getViewportSize().width || opt_hide);
  goog.style.showElement(nowLeft, -elapsed >
      goog.style.getPosition(this.getElement()).x + brkn.Guide.NAME_WIDTH || opt_hide);
};


/**
 * @private
 */
brkn.Guide.prototype.align_ = function() {
  var program = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (program) {
    var offset = -(program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_ + 5;
    goog.style.setPosition(this.getElement(), Math.min(offset, 0));
    this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' +
        '{left:' + -offset + 'px !important}';
  }
};


