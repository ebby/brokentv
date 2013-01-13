goog.provide('brkn.sidebar.Profile');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param  {brkn.model.User} user
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Profile = function(user) {
  goog.base(this);
  
  /**
   * @type {brkn.model.User}
   * @private
   */
  this.user_ = user;
};
goog.inherits(brkn.sidebar.Profile, goog.ui.Component);


/** @inheritDoc */
brkn.sidebar.Profile.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  goog.dom.classes.add(el, 'profile');
  soy.renderElement(el, brkn.sidebar.profile);
};


/** @inheritDoc */
brkn.sidebar.Profile.prototype.enterDocument = function() {
  goog.net.XhrIo.send(
      '/_activity/' + this.user_.id,
      goog.bind(function(e) {
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson();
        this.stream_ = new brkn.sidebar.Stream(activities, this.user_.id);
        this.stream_.decorate(goog.dom.getElementByClass('stream', this.getElement()));
      }, this));
};
  