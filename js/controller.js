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


/** @inheritDoc */
brkn.Controller.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

	this.addChild(this.guideToggle_);
	this.guideToggle_.decorate(goog.dom.getElement('guide-toggle'));
	this.guideToggle_.setChecked(true);
//	goog.Timer.callOnce(goog.bind(function() {
//	  this.guideToggle_.setChecked(false);
//	  this.toggleGuide_();
//	}, this), 10000);
	
	this.addChild(this.sidebarToggle_);
  this.sidebarToggle_.decorate(goog.dom.getElement('sidebar-toggle'));
  
  this.addChild(this.adminToggle_);
  this.adminToggle_.decorate(goog.dom.getElement('admin-toggle'));
  goog.style.showElement(this.adminToggle_.getElement(),
      brkn.model.Users.getInstance().currentUser.accessLevel == brkn.model.User.AccessLevel.ADMIN);

  this.getHandler()
      .listen(window, 'resize', goog.bind(this.resize, this))
  		.listen(this.guideToggle_,
  				goog.ui.Component.EventType.ACTION,
  				goog.bind(this.toggleGuide_, this))
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
brkn.Controller.prototype.toggleGuide_ = function() {
  brkn.model.Controller.getInstance().publish(
      brkn.model.Controller.Actions.TOGGLE_GUIDE,
      this.guideToggle_.isChecked());
  this.resize();
};


/**
 * Resize
 */
brkn.Controller.prototype.resize = function() {
  goog.style.setWidth(this.getElement(), goog.dom.getViewportSize().width -
      (this.sidebarToggle_.isChecked() ? 300 : 0)); 
};
