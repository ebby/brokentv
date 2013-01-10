goog.provide('brkn.sidebar.Admin');

goog.require('soy');
goog.require('brkn.model.Sidebar');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.AdminList');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Admin = function() {
  goog.base(this);
  
};
goog.inherits(brkn.sidebar.Admin, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Admin.prototype.collectionsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Admin.prototype.storiesEl_;


/** @inheritDoc */
brkn.sidebar.Admin.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.admin);
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.Admin.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  var contentEl = soy.renderAsElement(brkn.sidebar.admin);
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Admin.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.collectionsEl_ = goog.dom.getElementByClass('collections', this.getElement());
  this.storiesEl_ = goog.dom.getElementByClass('stories', this.getElement());
  var adminListEl = goog.dom.getElement('admin-list');
  var channel = brkn.model.Channels.getInstance().currentChannel;

  goog.net.XhrIo.send(
      '/admin/_collections/' + channel.id,
      goog.bind(function(e) {
        var collections = /** @type {Array.<Object>} */goog.json.parse(e.target.getResponse());
        goog.array.forEach(collections, function(col) {
          var colEl = soy.renderAsElement(brkn.sidebar.collection, {
            collection: col
          });
          goog.dom.appendChild(this.collectionsEl_, colEl);
          goog.events.listen(colEl, goog.events.EventType.CLICK, goog.bind(function(e) {
            goog.net.XhrIo.send(
                '/admin/_media/collection/' + col.id,
                goog.bind(function(e) {
                  var medias = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
                  medias = goog.array.map(medias, function(m) {
                    return new brkn.model.Media(m);
                  });
                  var adminList = new brkn.sidebar.AdminList(col.id, medias);
                  adminList.decorate(adminListEl);
                  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
                      adminListEl, true, col.name);
                }, this));
          }, this));
        }, this);
      }, this));
};
