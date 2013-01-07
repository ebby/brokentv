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
  this.timeline = this.timeslots_ * (this.interval_ * 2 + 1) * 60;

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
 * @private
 */
brkn.Guide.prototype.width_;

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
 * @type {goog.date.DateTime}
 * @private
 */
brkn.Guide.prototype.minTime_;


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

  // Add time increment elements
  var timesEl = goog.dom.getElementByClass('times', this.getElement());
  for ( var i = -1 * (this.timeslots_ - 1); i <= this.timeslots_ + 1; i++) {
    var slot = startTime.clone();
    slot.add(new goog.date.Interval(0, 0, 0, 0, this.interval_ * i));
    goog.dom.appendChild(timesEl, goog.dom.createDom('div', {
      'class' : 'time',
      'style' : 'width:' + this.width_ / (this.timeslots_ * 2 + 1) + 'px'
    }, slot.toUsTimeString()));
  }
  this.minTime_ = startTime.clone();
  this.minTime_.add(new goog.date.Interval(0, 0, 0, 0, -this.interval_ * (this.timeslots_ - 1)));

  goog.style.setWidth(this.getElement(), this.width_);
  var viewOffset = (this.timeslots_ - 1) / (this.timeslots_ * 2 + 1) * this.width_;
  var startTimeOffset = viewOffset - 145;
  goog.style.setPosition(this.getElement(), -1 * startTimeOffset);

  this.channelNameStyle_ = document.createElement('style');
  this.channelNameStyle_.id = 'channel-name-offs'
  this.channelNameStyle_.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(this.channelNameStyle_);
  this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:'
      + startTimeOffset + 'px !important}';

  var dragger = new goog.fx.Dragger(this.getElement());
  var channelNameStyle = this.channelNameStyle_;
  var width = this.width_;
  dragger.defaultAction = function(x, y) {
    if (x < 0 && x > (-1 * width + goog.dom.getViewportSize().width)) {
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

  this.getHandler()
    .listen(brkn.model.Clock.getInstance().clock,
        goog.Timer.TICK,
        goog.bind(function() {
          var elapsed = (goog.now() - this.minTime_.getTime()) / (this.timeline * 1000) * this.width_;
          goog.style.setPosition(this.tickerEl_, elapsed);
        }, this))
    .listen(dragger,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function() {
          goog.dom.classes.add(this.getElement(), 'drag');
        }, this))
    .listen(dragger,
        goog.fx.Dragger.EventType.END,
        goog.bind(function() {
          goog.dom.classes.remove(this.getElement(), 'drag');
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
          if (x < 0 && x > (-1 * width + goog.dom.getViewportSize().width)) {
            goog.style.setPosition(this.getElement(), x);
            this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' + '{left:'
                + -x + 'px !important}';
          }
          goog.dom.classes.remove(this.getElement(), 'drag');
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
 * Gets the pixel offset for a certain time in the channels element.
 * 
 * @param {number}
 *          startTime
 * @param {number}
 *          time
 * @return {number} pixels
 */
brkn.Guide.prototype.getPixelsFromTime = function(startTime, time) {
  return 0;
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
 * @private
 */
brkn.Guide.prototype.align_ = function() {
  var program = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  if (program) {
    var offset = -(program.time.getTime() - this.minTime_.getTime())/(this.timeline * 1000) *
        goog.style.getSize(this.getElement()).width + 195 /* name width */;
    goog.style.setPosition(this.getElement(), offset);
    this.channelNameStyle_.innerHTML = 'div#guide div.channels div.channel div.name' +
        '{left:' + -offset + 'px !important}';
  }
};


