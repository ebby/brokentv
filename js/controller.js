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
	this.guideToggle_.setChecked(true);
};
goog.inherits(brkn.Controller, goog.ui.Component);


/** @inheritDoc */
brkn.Controller.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

	this.addChild(this.guideToggle_);
	this.guideToggle_.decorate(goog.dom.getElement('guide-toggle'));

  this.getHandler()
  		.listen(this.guideToggle_,
  				goog.ui.Component.EventType.ACTION,
  				goog.bind(function(e) {
  	  			e.stopPropagation();
  	  			brkn.model.Controller.getInstance().publish(
  	  					brkn.model.Controller.Actions.TOGGLE_GUIDE,
  	  					this.guideToggle_.isChecked());
  	  		}, this));
};