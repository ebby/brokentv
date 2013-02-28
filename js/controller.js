goog.provide('brkn.Controller');

goog.require('soy');
goog.require('brkn.Channel');
goog.require('brkn.Exp');
goog.require('brkn.model.Channels');
goog.require('brkn.model.Controller');

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
  this.restartButton_ = new goog.ui.CustomButton('Restart');
  
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
  
  this.addChild(this.restartButton_);
  this.restartButton_.decorate(goog.dom.getElementByClass('restart', this.getElement()));
  
  this.addChild(this.playButton_);
  this.playButton_.decorate(goog.dom.getElementByClass('play', this.getElement()));
  
  this.addChild(this.volumeButton_);
  this.volumeButton_.decorate(goog.dom.getElementByClass('volume', this.getElement()));
  
  this.addChild(this.adminToggle_);
  this.adminToggle_.decorate(goog.dom.getElement('admin-toggle'));
  goog.style.showElement(this.adminToggle_.getElement(),
      brkn.model.Users.getInstance().currentUser.accessLevel == brkn.model.User.AccessLevel.ADMIN);

  var guideThrottle = new goog.Throttle(this.throttledGuide_, 1000, this);
  
  this.getHandler()
      .listen(window, 'resize', goog.bind(this.resize, this))
  		.listen(this.guideToggle_,
  				goog.ui.Component.EventType.ACTION,
  				goog.bind(function(e) {
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
  	  .listen(this.restartButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            if (brkn.model.Player.getInstance().getCurrentProgram()) {
              brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC,
                  brkn.model.Player.getInstance().getCurrentProgram().media);
              this.resize();
            }
          }, this))
  	  .listen(this.playButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY,
                !this.playButton_.isChecked());
            this.resize();
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
            if (brkn.model.Channels.getInstance().currentChannel.myChannel &&
                brkn.model.Player.getInstance().getCurrentProgram()) {
              var elapsed = brkn.model.Player.getInstance().getCurrentTime() /
                  brkn.model.Player.getInstance().getCurrentProgram().media.duration;
              goog.dom.setTextContent(this.durationEl_,
                  (brkn.model.Player.getInstance().getCurrentTime() ?
                  brkn.model.Player.getInstance().getCurrentTime().toString().toHHMMSS() + ' / ' : '') +
                  brkn.model.Player.getInstance().getCurrentProgram().media.duration.toString().toHHMMSS());
              goog.style.setWidth(this.elapsedEl_, this.progressWidth_ ? elapsed * this.progressWidth_ : 0);
            }
          }, this));

  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.setAsync_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAYING,
      this.resize, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
      function() {
        goog.dom.classes.remove(this.getElement(), 'window');
        goog.Timer.callOnce(goog.bind(this.resize, this), 1000); // Account for timed animations.
      }, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      function() {
        this.resize();
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      this.toggleGuide_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.sidebarToggle_.setChecked(show);
        this.resize();
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.PLAY,
      function(play) {
        this.playButton_.setChecked(!play);
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAYING, function() {
    if (brkn.model.Channels.getInstance().currentChannel.myChannel &&
        brkn.model.Player.getInstance().getCurrentProgram()) {
      this.resize();
    }
  }, this);

  this.resize();
};


/**
 * @param {brkn.model.Media} media
 * @private 
 */
brkn.Controller.prototype.setAsync_ = function(media) {
  goog.dom.setTextContent(this.titleEl_, media.name.toUpperCase());
  goog.dom.setTextContent(this.durationEl_, media.duration.toString().toHHMMSS());
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
 * @param {?boolean=} opt_window
 */
brkn.Controller.prototype.resize = function(opt_window) {
  goog.style.setWidth(this.getElement(), goog.dom.getViewportSize().width -
      (this.sidebarToggle_.isChecked() ? 300 : 0));
  if (!brkn.model.Channels.getInstance().currentChannel.myChannel) {
    goog.style.showElement(this.progressEl_, false);
    
    var guide = goog.dom.getElement('guide');
    var currentPrograms = goog.dom.getElementByClass('current', guide);
    var programs = goog.dom.getElementsByClass('program', currentPrograms);
    var lastProgram = /** @type {Element} */ goog.array.peek(programs);
    var viewportLeft = lastProgram ? goog.style.getPosition(guide).x +
        goog.style.getPosition(lastProgram).x + goog.style.getSize(lastProgram).width + 210 : 9999999;

    var width = Math.min(goog.dom.getViewportSize().width - 200,
        Math.max(100, goog.dom.getViewportSize().width - viewportLeft));
    var rightWidth = this.sidebarToggle_.isChecked() && width > 300 ? width - 295 : width + 5;
    if (this.rightWidth_ != rightWidth) {
      this.rightWidth_ = rightWidth;
      goog.style.setWidth(this.rightEl_, rightWidth);
    }
    goog.Timer.callOnce(goog.bind(function() {
      goog.dom.classes.enable(this.getElement(), 'window', opt_window || 
          (goog.dom.classes.has(this.getElement(), 'collapsed') && !!lastProgram &&
          width < goog.dom.getViewportSize().width - 203));
    }, this), 400);
  } else if (brkn.model.Player.getInstance().getCurrentProgram()) {
    goog.style.showElement(this.progressEl_, true);
    this.setAsync_(brkn.model.Player.getInstance().getCurrentProgram().media);
    this.progressWidth_ = goog.dom.getViewportSize().width -
        (this.sidebarToggle_.isChecked() ? 560 : 260) -
        (brkn.model.Users.getInstance().currentUser.isAdmin() ? 50 : 0);
    goog.style.setWidth(this.progressEl_, this.progressWidth_);
  }
};
