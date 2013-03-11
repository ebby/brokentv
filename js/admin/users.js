goog.provide('brkn.admin.Users');

goog.require('brkn.admin');
goog.require('brkn.model.User');
goog.require('soy');

goog.require('goog.functions');
goog.require('goog.net.XhrIo');
goog.require('goog.ui.Component');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.admin.Users = function() {
  goog.base(this);

};
goog.inherits(brkn.admin.Users, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.admin.Users.prototype.userList_;


/** @inheritDoc */
brkn.admin.Users.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.admin.users);
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.admin.Users.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  var content = soy.renderAsElement(brkn.admin.users);
  el.innerHTML = content.innerHTML;
}


/** @inheritDoc */
brkn.admin.Users.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.userList_ = goog.dom.getElementByClass('user-list', this.getElement());

  goog.net.XhrIo.send('/admin/_users',
      goog.bind(function(e) {
        var users = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
        users = goog.array.map(users, function(u) {
          return new brkn.model.User(u);
        });
        goog.array.forEach(users, this.addUser, this);
      }, this));
};


/**
 * @param {brkn.model.User} user
 * @private
 */
brkn.admin.Users.prototype.addUser = function(user) {
  var userEl = soy.renderAsElement(brkn.admin.user, {
    user: user,
    lastLogin: user.getLastLogin(true)
  });
  goog.dom.appendChild(this.userList_, userEl);

  this.getHandler().listen(userEl, goog.events.EventType.CLICK, function(e) {
    var button = goog.dom.getAncestorByClass(e.target, 'button');
    if (button) {
      var uid = goog.dom.getAncestorByClass(e.target, 'user').id;
      var controls = goog.dom.getAncestorByClass(e.target, 'controls');
      if (controls) {
        var level = goog.dom.classes.has(button, '2') ? 2 : goog.dom.classes.has(button, '0') ? 0 : 1;
        goog.net.XhrIo.send('/admin/_access', goog.functions.NULL,
            'POST', 'uid=' + uid + '&level=' + level);
        goog.array.forEach(goog.dom.getChildren(controls), function(button) {
          goog.dom.classes.enable(button, 'selected', goog.dom.classes.has(button, level.toString()));
        });
      } else if (goog.dom.classes.has(button, 'demo')) {
        var demo = goog.dom.classes.toggle(button, 'selected');
        goog.net.XhrIo.send('/admin/_demo', goog.functions.NULL,
            'POST', 'demo=' + demo + '&uid=' + uid);
      }
    }
  });
};