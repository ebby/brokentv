goog.provide('brkn.Guide');

goog.require('soy');
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
 * @private
 */
brkn.Guide.prototype.width_;


/**
 * @type {boolean}
 * @private
 */
brkn.Guide.prototype.aligned_;


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
        this.align_();
    //goog.dom.classes.enable(this.getElement(), 'faded', show);
      }, this);

  // Set start time
  this.startTime_ = new goog.date.DateTime();
  var minutes = 60;
  while (minutes >= this.startTime_.getMinutes()) {
    minutes -= this.interval_;
  }
  this.startTime_.setMinutes(minutes);

  var historySlots = 2;
  this.minTime_ = this.startTime_.clone();
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

  this.dragger_ = new goog.fx.Dragger(this.getElement());
  var channelNameStyle = this.channelNameStyle_;
  var el = this.getElement();
  this.dragger_.defaultAction = function(x, y) {
    if (x < 0 && x > (-goog.style.getSize(el).width + goog.dom.getViewportSize().width)) {
      this.target.style.left = x + 'px';
      channelNameStyle.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:' + -x
          + 'px !important}';
    }
  };

  goog.array.forEach(brkn.model.Channels.getInstance().channels, goog.bind(function(c) {
    var channel = new brkn.Channel(c, this.timeline, this.startTime_, startTimeOffset, this.minTime_);
    channel.render(this.channelsEl_);
    if (c.id == brkn.model.Channels.getInstance().currentChannel.id) {
      goog.dom.classes.add(channel.getElement(), 'current');
      this.currentChannel_ = channel;
    }
    this.myChannel_ = c.myChannel ? c : this.myChannel_;
    this.channels_.push(channel);
    this.channelMap_[c.id] = channel;
  }, this));

  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  
  this.getHandler()
    .listen(brkn.model.Clock.getInstance().clock,
        goog.Timer.TICK,
        goog.bind(function() {
          var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;

          this.updateNowButtons_();
          if (elapsed + goog.dom.getViewportSize().width > this.width_ -
              (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0)) {
            this.expand_();
          }
          goog.style.setPosition(this.tickerEl_, elapsed);
          this.align_();
        }, this))
    .listen(window, goog.events.EventType.RESIZE, goog.bind(this.align_, this))
    .listen(this.channelsEl_, goog.events.EventType.SCROLL,
        goog.bind(this.align_, this, undefined, undefined, true))
    .listen(this.tickerEl_, goog.events.EventType.CLICK,
        goog.bind(this.align_, this, true, undefined, false))
    .listen(nowLeft, goog.events.EventType.CLICK, goog.bind(this.onLeft_, this))
    .listen(nowRight, goog.events.EventType.CLICK, goog.bind(this.onRight_, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function() {
          goog.dom.classes.add(this.getElement(), 'drag');
        }, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.END,
        goog.bind(function() {
          goog.dom.classes.remove(this.getElement(), 'drag');
          this.aligned_ = false;
          this.updateNowButtons_();
        }, this))
    .listen(this.headerEl_,
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
          this.aligned_ = false;
          this.updateNowButtons_();
        }, this));

  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      goog.bind(this.align_, this, true));
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_ADMIN,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'admin', show);
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);
  
  this.resize_();
  this.align_(true);
  
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
 * @param {boolean} show
 * @private
 */
brkn.Guide.prototype.toggleGuide_ = function(show) {
  var height = Math.min(this.channelsEl_.scrollHeight, 210);
  goog.dom.classes.enable(this.getElement(), 'toggled', show);
  goog.style.setHeight(this.channelsEl_, show ? height : 40);
  goog.style.setHeight(this.getElement(), show ? height + this.controllerHeight_ + 19 :
      this.controllerHeight_);
  goog.Timer.callOnce(goog.bind(function() {
    goog.dom.classes.enable(this.getElement(), 'collapsed', !show);
    this.channelsEl_.scrollTop = goog.style.getPosition(this.currentChannel_.getElement()).y;
    this.resize_();
  }, this), show ? 0 : 800);
  this.align_(true, undefined, false);
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
  goog.dom.classes.remove(this.currentChannel_.getElement(), 'current');
  this.currentChannel_ = this.channelMap_[channel.id];
  goog.dom.classes.add(this.currentChannel_.getElement(), 'current');
  this.cursor_[0] = channel;
  this.align_(true, undefined, false);
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.Guide.prototype.playAsync_ = function(media) {
  if (!this.myChannel_) {
    // Create a private channel
    var user = brkn.model.Users.getInstance().currentUser;
    this.myChannel_ = new brkn.model.Channel({
      id: user.id,
      name: user.name.split(' ')[0] + '\'s Channel'
    });
    brkn.model.Channels.getInstance().myChannel = this.myChannel_;
    var channel = new brkn.Channel(this.myChannel_, this.timeline, this.startTime_, 0,
        this.minTime_);
    channel.render(this.channelsEl_);
    this.channels_.push(channel);
    this.channelMap_[this.myChannel_.id] = channel;
  }
  var program = brkn.model.Program.async(media);
  this.myChannel_.publish(brkn.model.Channel.Action.ADD_PROGRAM, program);
  this.resize_();
  brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      this.myChannel_);
  goog.net.XhrIo.send('/_addprogram', goog.functions.NULL(), 'POST',
      'channel_id=' + brkn.model.Channels.getInstance().myChannel.id + '&media_id=' + media.id);
};


/**
 * @param {?boolean=} opt_hide
 * @private
 */
brkn.Guide.prototype.updateNowButtons_ = function(opt_hide) {
  var nowLeft = goog.dom.getElement('now-left');
  var nowRight = goog.dom.getElement('now-right');
  var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
  var viewWidth = goog.dom.getViewportSize().width - 
      (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0);
  nowRight.style.right = brkn.model.Controller.getInstance().sidebarToggled ? '300px' : 0;
  goog.dom.classes.enable(nowRight, 'now', !!(-elapsed <
      goog.style.getPosition(this.getElement()).x - viewWidth || opt_hide));
  goog.dom.classes.enable(nowLeft, 'now', !!(-elapsed >
      goog.style.getPosition(this.getElement()).x + brkn.Guide.NAME_WIDTH || opt_hide));
  goog.style.showElement(nowRight, this.cursor_[0].hasNextProgram(this.guideOffset_));
  goog.style.showElement(nowLeft, this.cursor_[0].hasPrevProgram(this.guideOffset_));
};


/**
 * @private
 */
brkn.Guide.prototype.onLeft_ = function() {
  var nowLeft = goog.dom.getElement('now-left');
  if (goog.dom.classes.has(nowLeft, 'now')) {
    this.align_(true);
  } else {
    this.align_(false, -1);
  }
}

/**
 * @private
 */
brkn.Guide.prototype.onRight_ = function() {
  var nowRight = goog.dom.getElement('now-right');
  if (goog.dom.classes.has(nowRight, 'now')) {
    this.align_(true);
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
  //this.maxTime_.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * newSlots));
  this.timeline = this.timeslots_ * this.interval_ * 60;
};


/**
 * @param {?boolean=} opt_setAligned
 * @param {?number=} opt_offset
 * @param {?boolean=} opt_setScrolled
 * @private
 */
brkn.Guide.prototype.align_ = function(opt_setAligned, opt_offset, opt_setScrolled) {
  this.aligned_ = opt_setAligned != undefined ? !!opt_setAligned : this.aligned_;
  this.scrolled_ = opt_setAligned != undefined ? !!opt_setScrolled : this.aligned_;
  this.guideOffset_ = this.aligned_ ? 0 : opt_offset ? this.guideOffset_ + opt_offset : this.guideOffset_;
  //var program = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram(this.guideOffset_);
  var program = this.cursor_[0].getCurrentProgram(this.guideOffset_);
  this.cursor_[1] = program;
  if ((this.aligned_ || opt_offset) && program) {
    var elapsed = (goog.now() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_;
    var offset = -(program.time.getTime() - this.minTime_.getTime())/1000 * this.pixelsPerSecond_ + 5;
    var viewWidth = goog.dom.getViewportSize().width - 
        (brkn.model.Controller.getInstance().sidebarToggled ? 300 : 0);
    if (!opt_offset && elapsed > -offset + viewWidth - 300) {
      offset = -elapsed + viewWidth - 350;
    }

    offset = Math.max(offset, -goog.style.getSize(this.getElement()).width + viewWidth)
    goog.style.setPosition(this.getElement(), Math.min(offset, -200));
    this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' +
        '{left:' + -offset + 'px !important}';
    
    if (!this.scrolled_) {
      var scrollTo = goog.style.getPosition(this.currentChannel_.getElement()).y -
          goog.style.getSize(this.headerEl_).height; 
      var scrollAnim = new goog.fx.dom.Scroll(this.channelsEl_,
          [this.channelsEl_.scrollLeft, this.channelsEl_.scrollTop],
          [this.channelsEl_.scrollLeft, scrollTo], this.channels_.length * 100);
      goog.Timer.callOnce(goog.bind(function() {
        scrollAnim.play()
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


