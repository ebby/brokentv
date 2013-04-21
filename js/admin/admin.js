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
  
  this.policies_ = goog.dom.getElement('policies');
  this.updateLimit_ = goog.dom.getElement('update-limit');
  this.inviteLimit_ = goog.dom.getElement('invite-limit');
  
  this.getHandler()
      .listen(sectionsEl, goog.events.EventType.CLICK, function(e) {
        goog.dom.classes.remove(this.currentTab_, 'selected');
        this.currentTab_ = e.target;
        goog.dom.classes.add(this.currentTab_, 'selected');
        goog.dom.classes.set(this.contentEl_, '');
        if (goog.dom.classes.has(this.currentTab_, 'users')) {
          goog.dom.classes.add(this.contentEl_, 'users');
        } else if (goog.dom.classes.has(this.currentTab_, 'launch')) {
          goog.dom.classes.add(this.contentEl_, 'launch');
        } else if (goog.dom.classes.has(this.currentTab_, 'stats')) {
          goog.dom.classes.add(this.contentEl_, 'stats');
        } else if (goog.dom.classes.has(this.currentTab_, 'channels')) {
          goog.dom.classes.add(this.contentEl_, 'channels');
        }
      })
    .listen(this.policies_, goog.events.EventType.CLICK, function(e) {
      var button = goog.dom.getAncestorByClass(e.target, 'button');
      if (button) {
        var policyId = goog.dom.classes.has(button, '0') ? 0 :
            goog.dom.classes.has(button, '1') ? 1 :
              goog.dom.classes.has(button, '2') ? 2 : 3;
        goog.net.XhrIo.send('/admin/_launchsettings', goog.functions.NULL,
            'POST', 'invite_policy=' + policyId);
      }
      goog.array.forEach(goog.dom.getChildren(this.policies_), function(button) {
        goog.dom.classes.enable(button, 'selected', goog.dom.classes.has(button, policyId.toString()));
      });
    })
    .listen(this.updateLimit_, goog.events.EventType.CLICK, function(e) {
      if (this.inviteLimit_.value) {
        goog.net.XhrIo.send('/admin/_launchsettings', goog.functions.NULL,
            'POST', 'invite_limit=' + this.inviteLimit_.value);
      }
    });
};


/** @inheritDoc */
brkn.Admin.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.users_.decorate(goog.dom.getElement('users')); 
};

goog.exportSymbol('brkn.Admin.init', brkn.Admin.init);