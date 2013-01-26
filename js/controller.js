goog.provide('brkn.Controller');

goog.require('soy');
goog.require('brkn.Channel');
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


/** @inheritDoc */
brkn.Controller.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.rightEl_ = goog.dom.getElementByClass('right', this.getElement());

	this.addChild(this.guideToggle_);
	this.guideToggle_.decorate(goog.dom.getElement('guide-toggle'));
	this.guideToggle_.setChecked(true);
	
	this.addChild(this.sidebarToggle_);
  this.sidebarToggle_.decorate(goog.dom.getElement('sidebar-toggle'));
  
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
  	        this.resize();
  	      }, this))
  	  .listen(this.adminToggle_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Controller.getInstance().publish(
                brkn.model.Controller.Actions.TOGGLE_ADMIN,
                this.adminToggle_.isChecked());
            this.resize();
          }, this));
  
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      this.toggleGuide_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.sidebarToggle_.setChecked(show);
        this.resize();
      }, this);
  
  this.resize();
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
  }
  goog.Timer.callOnce(goog.bind(function() {
    goog.dom.classes.enable(this.getElement(), 'guide-toggled', show);
    if (!show) {
      goog.Timer.callOnce(goog.bind(goog.dom.classes.add, this, this.getElement(), 'window'), 300);
      // Adjust window to fit content
      var guide = goog.dom.getElement('guide');
      var currentPrograms = goog.dom.getElementByClass('current', guide);
      var programs = goog.dom.getElementsByClass('program', currentPrograms);
      var lastProgram = /** @type {Element} */ goog.array.peek(programs);
      var viewportLeft = goog.style.getPosition(guide).x +
          goog.style.getPosition(lastProgram).x + goog.style.getSize(lastProgram).width;
      window.console.log(viewportLeft);
      window.console.log(goog.dom.getViewportSize().width - viewportLeft);
      goog.style.setWidth(this.rightEl_,
          Math.max(100, goog.dom.getViewportSize().width - viewportLeft));
    }
  }, this), show ? 0 : 600);
  this.resize();
};


/**
 * Resize
 */
brkn.Controller.prototype.resize = function() {
  goog.style.setWidth(this.getElement(), goog.dom.getViewportSize().width -
      (this.sidebarToggle_.isChecked() ? 300 : 0)); 
};
