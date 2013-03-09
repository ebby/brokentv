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
 * @type {Element}
 * @private
 */
brkn.Admin.prototype.contentEl_;

/**
 * @type {Element}
 * @private
 */
brkn.Admin.prototype.sectionsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Admin.prototype.currentTab_;


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
  
  var sectionsEl = goog.dom.getElement('sections');
  
  this.contentEl_ = goog.dom.getElement('content');
  this.currentTab_ = goog.dom.getElementByClass('users', sectionsEl);
  
  this.getHandler().listen(sectionsEl, goog.events.EventType.CLICK, function(e) {
    goog.dom.classes.remove(this.currentTab_, 'selected');
    this.currentTab_ = e.target;
    goog.dom.classes.add(this.currentTab_, 'selected');
    goog.dom.classes.set(this.contentEl_, '');
    if (goog.dom.classes.has(this.currentTab_, 'users')) {
      goog.dom.classes.add(this.contentEl_, 'users');
    } else if (goog.dom.classes.has(this.currentTab_, 'stats')) {
      goog.dom.classes.add(this.contentEl_, 'stats');
    } else if (goog.dom.classes.has(this.currentTab_, 'channels')) {
      goog.dom.classes.add(this.contentEl_, 'channels');
    }
  })
};


/** @inheritDoc */
brkn.Admin.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.users_.decorate(goog.dom.getElement('users')); 
};

goog.exportSymbol('brkn.Admin.init', brkn.Admin.init);