goog.provide('brkn.Sidebar');

goog.require('soy');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Controller');
goog.require('brkn.sidebar');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Sidebar = function() {
  goog.base(this);
  
};
goog.inherits(brkn.Sidebar, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Sidebar.prototype.infoEl_;


/** @inheritDoc */
brkn.Sidebar.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.infoEl_ = goog.dom.getElementByClass('info', this.getElement());
    
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        goog.dom.classes.enable(this.getElement(), 'toggled', show);
      }, this);
  
  this.showMedia(brkn.model.Channels.getInstance().currentChannel.getCurrentProgram().media);
};

/**
 * @param {brkn.model.Media} media 
 */
brkn.Sidebar.prototype.showMedia = function(media) {
  soy.renderElement(this.infoEl_, brkn.sidebar.info, {
      media: media
    });  
};
