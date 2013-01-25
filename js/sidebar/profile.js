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
  
  this.setModel(user);
  
  /**
   * @type {brkn.model.User}
   * @private
   */
  this.user_ = user;
  
  /**
   * @type {Array.<string>}
   * @private
   */
  this.tabs_ = ['activity', 'starred'];
};
goog.inherits(brkn.sidebar.Profile, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Profile.prototype.tabsEl_;


/** @inheritDoc */
brkn.sidebar.Profile.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  goog.dom.classes.add(el, 'profile');
  goog.dom.classes.add(el, 'ios-scroll');
  soy.renderElement(el, brkn.sidebar.profile);
};


/** @inheritDoc */
brkn.sidebar.Profile.prototype.enterDocument = function() {
  
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());

  goog.net.XhrIo.send(
      '/_star',
      goog.bind(function(e) {
        var medias = /** @type {Array.<Object>} */ e.target.getResponseJson();
        medias = goog.array.map(medias, function(m) {
          return new brkn.model.Media(m);
        });
        this.starred_ = new brkn.sidebar.MediaList(medias);
        this.starred_.decorate(goog.dom.getElementByClass('starred-content', this.getElement()));
      }, this));

  goog.net.XhrIo.send(
      '/_activity/' + this.user_.id,
      goog.bind(function(e) {
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson();
        this.stream_ = new brkn.sidebar.Stream(activities, this.user_.id);
        this.stream_.decorate(goog.dom.getElementByClass('activity-content', this.getElement()));
      }, this));
  
  this.getHandler().listen(this.tabsEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        var tabEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
        this.navigate_(tabEl);
      }, this));
};


/**
 * @param {Element} tabEl
 * @private
 */
brkn.sidebar.Profile.prototype.navigate_ = function(tabEl) {
  goog.array.forEach(this.tabs_, function(tab) {
    goog.dom.classes.enable(this.tabsEl_.parentElement, tab, goog.dom.classes.has(tabEl, tab));
    this.currentTab_ = goog.dom.classes.has(tabEl, tab) ? tab : this.currentTab_;
  }, this);
};
  