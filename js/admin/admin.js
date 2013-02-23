goog.provide('brkn.Admin');

goog.require('brkn.admin.Users');

goog.require('goog.ui.Component');

/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Admin = function() {
  goog.base(this);

  this.users_ = new brkn.admin.Users();
};
goog.inherits(brkn.Admin, goog.ui.Component);


/**
 * Init the statsboard
 */
brkn.Admin.init = function() {
  var admin = new brkn.Admin();
  admin.decorate(goog.dom.getElement('content'));
};


/** @inheritDoc */
brkn.Admin.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
};


/** @inheritDoc */
brkn.Admin.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.users_.render(this.getElement()); 
};

goog.exportSymbol('brkn.Admin.init', brkn.Admin.init);