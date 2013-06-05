goog.provide('brkn.Controller');

goog.require('soy');
goog.require('brkn.Channel');
goog.require('brkn.Exp');
goog.require('brkn.model.Channels');
goog.require('brkn.model.Controller');

goog.require('goog.fx.Dragger');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Controller = function() {
	goog.base(this);

	/**
	 * @type {goog.ui.CustomButton}
	 */
	this.guideToggle_ = new goog.ui.CustomButton('Guide');
	this.guideToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
			true);

	/**
   * @type {goog.ui.CustomButton}
   */
  this.sidebarToggle_ = new goog.ui.CustomButton('Sidebar');
  this.sidebarToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.nextButton_ = new goog.ui.CustomButton('Next');
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.playButton_ = new goog.ui.CustomButton('Play');
  this.playButton_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.volumeButton_ = new goog.ui.CustomButton('Volume');
  this.volumeButton_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.adminToggle_ = new goog.ui.CustomButton('Admin');
  this.adminToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.infoToggle_ = new goog.ui.CustomButton('Info');
};
goog.inherits(brkn.Controller, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.rightEl_;


/**
 * @type {number}
 * @private
 */
brkn.Controller.prototype.rightWidth_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.progressEl_;


/**
 * @type {number}
 * @private
 */
brkn.Controller.prototype.progressWidth_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.seekEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.elapsedEl_;


/**
 * @type {goog.fx.Dragger}
 * @private
 */
brkn.Controller.prototype.dragger_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.titleEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.durationEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Controller.prototype.currentTimeEl_;


/** @inheritDoc */
brkn.Controller.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.rightEl_ = goog.dom.getElementByClass('right', this.getElement());
  this.progressEl_ = goog.dom.getElementByClass('progress', this.getElement());
  this.seekEl_ = goog.dom.getElementByClass('seek', this.getElement());
  this.elapsedEl_ = goog.dom.getElementByClass('elapsed', this.getElement());
  this.titleEl_ = goog.dom.getElementByClass('title', this.getElement());
  this.durationEl_ = goog.dom.getElementByClass('duration', this.getElement());
  this.currentTimeEl_ = goog.dom.getElementByClass('current-time', this.getElement());

	this.addChild(this.guideToggle_);
	this.guideToggle_.decorate(goog.dom.getElement('guide-toggle'));
	this.guideToggle_.setChecked(goog.dom.classes.has(this.getElement(), 'guide-toggled'));
	
	this.addChild(this.sidebarToggle_);
  this.sidebarToggle_.decorate(goog.dom.getElement('sidebar-toggle'));
  this.sidebarToggle_.setChecked(goog.dom.classes.has(this.getElement(), 'sidebar-toggled'));
  
  this.addChild(this.nextButton_);
  this.nextButton_.decorate(goog.dom.getElementByClass('next', this.getElement()));
  
  this.addChild(this.playButton_);
  this.playButton_.decorate(goog.dom.getElementByClass('play', this.getElement()));
  
  this.addChild(this.volumeButton_);
  this.volumeButton_.decorate(goog.dom.getElementByClass('volume', this.getElement()));
  
  this.addChild(this.infoToggle_);
  this.infoToggle_.decorate(goog.dom.getElement('info-toggle'));
  goog.style.showElement(this.infoToggle_.getElement(),
      brkn.model.Users.getInstance().currentUser.accessLevel != brkn.model.User.AccessLevel.ADMIN);
  
  this.addChild(this.adminToggle_);
  this.adminToggle_.decorate(goog.dom.getElement('admin-toggle'));
  goog.style.showElement(this.adminToggle_.getElement(),
      brkn.model.Users.getInstance().currentUser.accessLevel == brkn.model.User.AccessLevel.ADMIN);

  var guideThrottle = new goog.Throttle(this.throttledGuide_, 1000, this);

  this.resize();
  this.dragger_ = new goog.fx.Dragger(this.seekEl_);
  this.dragger_.setEnabled(false);
  var progressEl = this.progressEl_;
  var elapsedEl = this.elapsedEl_;
  var durationEl = this.durationEl_;
  this.dragger_.defaultAction = function(x, y) {
    if (x > 0 && x < goog.style.getSize(progressEl).width) {
      this.target.style.left = x + 'px';
      elapsedEl.style.width = x + 'px'; 
      var percent = x/goog.style.getSize(progressEl).width;
      var duration = brkn.model.Player.getInstance().getCurrentProgram().media.duration;
      goog.dom.setTextContent(durationEl, (Math.round(percent * duration)).toString().toHHMMSS() +
          ' / ' + duration.toString().toHHMMSS());
    }
  };
  
  this.getHandler()
      .listen(window, 'resize', goog.bind(this.resize, this))
  		.listen(this.guideToggle_,
  				goog.ui.Component.EventType.ACTION,
  				goog.bind(function(e) {
  				  if (IPAD) {
  				    e.preventDefault();
  				    e.stopPropagation();
  				    alert('The guide is not available yet on iPads.')
  				  }
  				  guideThrottle.fire();
  				}, this))
  	  .listen(this.sidebarToggle_,
  	      goog.ui.Component.EventType.ACTION,
  	      goog.bind(function(e) {
  	        e.stopPropagation();
  	        brkn.model.Controller.getInstance().publish(
  	            brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
  	            this.sidebarToggle_.isChecked());
  	      }, this))
      .listen(this.nextButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Channels.getInstance().currentChannel.offline = true;
            var currentProgram = brkn.model.Player.getInstance().getCurrentProgram();
            if (currentProgram) {
              currentProgram.ended = true;
            }
            var nextProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
            if (nextProgram) {
              brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.NEXT_PROGRAM,
                  nextProgram);  
            } else {
              brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
                  brkn.model.Channels.getInstance().findOnline(), true);
            }
            this.nextButton_.setEnabled(
                brkn.model.Channels.getInstance().currentChannel.hasNextProgram());
          }, this))
  	  .listen(this.playButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY,
                !this.playButton_.isChecked());
            this.resize();
          }, this))
      .listen(this.infoToggle_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_INFO);
          }, this))
      .listen(this.volumeButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.MUTE,
                this.volumeButton_.isChecked());
          }, this))
  	  .listen(this.adminToggle_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_ADMIN,
                this.adminToggle_.isChecked());
            this.resize();
          }, this))
      .listen(brkn.model.Clock.getInstance().clock,
          goog.Timer.TICK,
          goog.bind(function() {
            if (brkn.model.Player.getInstance().getCurrentProgram()) {
              var elapsed = brkn.model.Player.getInstance().getCurrentTime() /
                  brkn.model.Player.getInstance().getCurrentProgram().media.duration;
              var remaining = brkn.model.Player.getInstance().getCurrentProgram().media.duration -
                  brkn.model.Player.getInstance().getCurrentTime();
              if (remaining < 2) {
                brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.BEFORE_END);
              }
              if (!goog.dom.classes.has(this.progressEl_, 'drag')) {
                goog.dom.setTextContent(this.durationEl_,
                    (brkn.model.Player.getInstance().getCurrentTime() ?
                    brkn.model.Player.getInstance().getCurrentTime().toString().toHHMMSS() + ' / ' : '') +
                    brkn.model.Player.getInstance().getCurrentProgram().media.duration.toString().toHHMMSS());
                goog.style.setWidth(this.elapsedEl_, this.progressWidth_ ? elapsed * this.progressWidth_ : 0);
              }
            }
          }, this))
    .listen(this.progressEl_, goog.events.EventType.CLICK,
        goog.bind(function(e) {
          if (!goog.dom.classes.has(this.progressEl_, 'drag') &&
              brkn.model.Player.getInstance().getCurrentProgram()) {
            var seek = e.offsetX / goog.style.getSize(this.progressEl_).width *
                brkn.model.Player.getInstance().getCurrentProgram().media.duration;
            goog.dom.classes.remove(this.elapsedEl_, 'animate');
            brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.SEEK, seek);
            goog.Timer.callOnce(goog.bind(function() {
              goog.dom.classes.add(this.elapsedEl_, 'animate');
            }, this), 1000);
          }
        }, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.BEFOREDRAG,
        goog.bind(function() {
          goog.dom.classes.add(this.progressEl_, 'drag');
        }, this))
    .listen(this.dragger_,
        goog.fx.Dragger.EventType.END,
        goog.bind(function(e) {
          this.seekEl_.style.left = '';
          var seek = e.left / goog.style.getSize(this.progressEl_).width *
              brkn.model.Player.getInstance().getCurrentProgram().media.duration;
          goog.dom.classes.remove(this.elapsedEl_, 'animate');
          brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.SEEK, seek);
          goog.Timer.callOnce(goog.bind(function() {
            goog.dom.classes.remove(this.progressEl_, 'drag');
            goog.dom.classes.add(this.elapsedEl_, 'animate');
          }, this), 1000);
        }, this));
  
  if (IPAD) {
    this.guideToggle_.setEnabled(false);
  }

  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC, function(program) {
    goog.dom.classes.remove(this.elapsedEl_, 'animate');
    this.setAsync_(program, true);
  }, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      function() {
        goog.dom.classes.remove(this.elapsedEl_, 'animate');
        goog.dom.classes.remove(this.getElement(), 'window');
        goog.Timer.callOnce(goog.bind(this.resize, this), 1000); // Account for timed animations.
        this.nextButton_.setEnabled(brkn.model.Channels.getInstance().currentChannel.hasNextProgram());
        if (brkn.model.Channels.getInstance().currentChannel.getCurrentProgram()) {
          this.setAsync_(brkn.model.Channels.getInstance().currentChannel.getCurrentProgram(), true);
        }
      }, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      function(p) {
        this.resize();
        goog.dom.classes.remove(this.elapsedEl_, 'animate');
        this.nextButton_.setEnabled(brkn.model.Channels.getInstance().currentChannel.hasNextProgram());
        this.setAsync_(p, true);
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.MUTE,
      this.mute_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      this.toggleGuide_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.sidebarToggle_.setChecked(show);
        goog.dom.classes.enable(this.getElement(), 'sidebar-toggled', show);
        this.resize();
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.PLAY,
      function(play) {
        this.playButton_.setChecked(!play);
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAYING, function() {
    if (brkn.model.Channels.getInstance().currentChannel.myChannel &&
        brkn.model.Player.getInstance().getCurrentProgram()) {
      this.nextButton_.setEnabled(brkn.model.Channels.getInstance().currentChannel.hasNextProgram());
    }
    this.dragger_.setEnabled(true);
    goog.dom.classes.add(this.elapsedEl_, 'animate');
    this.resize();
  }, this);
  brkn.model.Channels.getInstance().getMyChannel().subscribe(brkn.model.Channel.Action.ADD_QUEUE,
      function() {
        this.nextButton_.setEnabled(
            brkn.model.Channels.getInstance().currentChannel.hasNextProgram());
      }, this); 
};


/**
 * @param {brkn.model.Program} program
 * @param {?boolean=} opt_restart
 * @private 
 */
brkn.Controller.prototype.setAsync_ = function(program, opt_restart) {
  goog.dom.setTextContent(this.titleEl_, program.media.name.toUpperCase());
  if (opt_restart) {
    goog.dom.classes.remove(this.elapsedEl_, 'animate');
    goog.style.setWidth(this.elapsedEl_, 0); 
    goog.Timer.callOnce(goog.bind(function() {
      goog.dom.classes.add(this.elapsedEl_, 'animate');
    }, this), 1000);
  }
};


/**
 * @private 
 */
brkn.Controller.prototype.mute_ = function(mute) {
  this.volumeButton_.setChecked(mute);
};


/**
 * @private 
 */
brkn.Controller.prototype.throttledGuide_ = function() {
  var toggled = this.guideToggle_.isChecked();
  brkn.model.Controller.getInstance().publish(
      brkn.model.Controller.Actions.TOGGLE_GUIDE,
      toggled);
};


/**
 * @private 
 */
brkn.Controller.prototype.toggleGuide_ = function(show) {
  this.guideToggle_.setChecked(show);
  if (show) {
    goog.dom.classes.remove(this.getElement(), 'window');
    goog.dom.classes.remove(this.getElement(), 'collapsed');
    goog.Timer.callOnce(goog.bind(this.resize, this));
  }
  goog.Timer.callOnce(goog.bind(function() {
    goog.dom.classes.enable(this.getElement(), 'guide-toggled', show);
    if (!show) {
      var currentProgram = brkn.model.Channels.getInstance().currentChannel &&
          brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
      goog.dom.classes.add(this.getElement(), 'collapsed');
      this.resize();
    }
  }, this), show ? 0 : 600);
};


/**
 * Resize
 */
brkn.Controller.prototype.resize = function() {
  if (!brkn.model.Channels.getInstance().currentChannel.myChannel &&
      !brkn.model.Controller.getInstance().timeless) {
    goog.style.showElement(this.progressEl_, false);
    
    var guide = goog.dom.getElement('guide');
    var currentPrograms = goog.dom.getElementByClass('current', guide);
    var programs = goog.dom.getElementsByClass('program', currentPrograms);
    var lastProgram = /** @type {Element} */ goog.array.peek(programs);
    var viewportLeft = lastProgram ? goog.style.getPosition(guide).x +
        goog.style.getPosition(lastProgram).x + goog.style.getSize(lastProgram).width + 210 : 9999999;
    var width = Math.min(goog.dom.getViewportSize().width - 200,
        Math.max(100, goog.dom.getViewportSize().width - viewportLeft));
    var showWindow = (goog.dom.classes.has(this.getElement(), 'collapsed') && !!lastProgram &&
        width < goog.dom.getViewportSize().width - 203);
 
    goog.Timer.callOnce(goog.bind(function() {
      goog.dom.classes.enable(this.getElement(), 'window', showWindow &&
          goog.dom.classes.has(this.getElement(), 'collapsed'));
    }, this), 400);
  }
  
  if (brkn.model.Player.getInstance().getCurrentProgram()) {
    goog.style.showElement(this.progressEl_, true);
    this.setAsync_(brkn.model.Player.getInstance().getCurrentProgram());
    this.progressWidth_ = goog.dom.getViewportSize().width -
        (this.sidebarToggle_.isChecked() ? 580 : 260) - 50;
    goog.style.setWidth(this.progressEl_, this.progressWidth_);
  }
};
