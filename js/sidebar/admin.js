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
 * @param {?string=} opt_channelId
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Admin = function(opt_channelId) {
  goog.base(this);
  
  this.channelId_ = opt_channelId || null;
  
  this.collectionsHeight_ = 0;
  this.topicsHeight_ = 0;
  this.channelsHeight_ = 0;
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
brkn.sidebar.Admin.prototype.scrollable_;


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

  this.scrollable_ = goog.dom.getElementByClass('scrollable', this.getElement());
  this.channelsEl_ = goog.dom.getElementByClass('admin-channels', this.getElement());
  this.topicsEl_ = goog.dom.getElementByClass('topics', this.getElement());
  this.collectionsEl_ = goog.dom.getElementByClass('collections', this.getElement());
  var colListEl = goog.dom.getElement('admin-col-list')
  var adminListEl = goog.dom.getElement('admin-list');
  var channel = brkn.model.Channels.getInstance().currentChannel;
  var totalPending = 0;
  
  if (!this.channelId_) {
  goog.net.XhrIo.send(
      '/admin/_channels',
      goog.bind(function(e) {
        var channels = /** @type {Array.<Object>} */ e.target.getResponseJson();
        goog.style.showElement(this.channelsEl_.parentElement, !!channels.length);
        goog.array.forEach(channels, function(channel) {
          var channelEl = soy.renderAsElement(brkn.sidebar.channel, {
            channel: channel
          });
          goog.dom.appendChild(this.channelsEl_, channelEl);
          goog.events.listen(channelEl, goog.events.EventType.CLICK, goog.bind(function(e) {
            var colList = new brkn.sidebar.Admin(channel['id']);
            colList.decorate(colListEl);
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
                  colListEl, false, channel['name']);
          }, this));
        }, this);

        this.channelsHeight_ = goog.style.getSize(this.channelsEl_.parentElement).height;
        this.resize();
      }, this));
  } else {
    goog.net.XhrIo.send(
        '/admin/_topicmedias/' + this.channelId_,
        goog.bind(function(e) {
          var topicMedias = /** @type {Array.<Object>} */ e.target.getResponseJson();
          goog.object.forEach(topicMedias, function(medias, topic) {
            goog.style.showElement(this.topicsEl_.parentElement, true);
            if (medias && medias.length) {
              var topicEl = soy.renderAsElement(brkn.sidebar.topic, {
                topic: topic,
                pending: medias.length
              });
              goog.dom.appendChild(this.topicsEl_, topicEl);
              goog.events.listen(topicEl, goog.events.EventType.CLICK, goog.bind(function(e) {
                medias = goog.array.map(medias, function(m) {
                  return new brkn.model.Media(m);
                });
                var adminList = new brkn.sidebar.AdminList('', medias, []);
                adminList.decorate(adminListEl);
                brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
                    adminListEl, false, topic);
              }, this));
              brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.APPROVED, function(media) {
                if (goog.array.find(medias, function(m){return m.id == media.id})) {
                  var pendingEl = goog.dom.getElementByClass('pending', topicEl);
                  var newCount = goog.dom.getTextContent(pendingEl) - 1;
                  window.console.log(newCount);
                  if (newCount <= 0) {
                    goog.dom.removeNode(topicEl);
                    goog.dispose(topicEl);
                  } else {
                    goog.dom.setTextContent(pendingEl, (/** @type {string} */ newCount));
                  }
                }
              }, this);
            }
          }, this);
          if (totalPending) {
            brkn.model.Controller.getInstance().setPending(totalPending);
          }
          
          this.topicsHeight_ = goog.style.getSize(this.topicsEl_.parentElement).height;
          this.resize();
        }, this));
    
    
    goog.net.XhrIo.send(
        '/admin/_collections/' + this.channelId_,
        goog.bind(function(e) {
          var collections = /** @type {Array.<Object>} */ e.target.getResponseJson();
          goog.style.showElement(this.collectionsEl_.parentElement, !!collections.length);
          goog.array.forEach(collections, function(col) {
            var colEl = soy.renderAsElement(brkn.sidebar.collection, {
              collection: col
            });
            totalPending += col['pending'];
            goog.dom.appendChild(this.collectionsEl_, colEl);
            goog.events.listen(colEl, goog.events.EventType.CLICK, goog.bind(function(e) {
              goog.net.XhrIo.send(
                  '/admin/_media/collection/' + col['id'] + '?pending=1',
                  goog.bind(function(e) {
                    var res = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
                    var medias = /** @type {Array.<Object>} */ res['medias'];
                    medias = goog.array.map(medias, function(m) {
                      return new brkn.model.Media(m);
                    });
                    var playlists = /** @type {Array.<Object>} */ res['playlists'];
                    var adminList = new brkn.sidebar.AdminList(col.id, medias, playlists);
                    adminList.decorate(adminListEl);
                    brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
                        adminListEl, false, col.name);
                  }, this));
            }, this));
            brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.APPROVED, function(media, colId) {
              if (colId == col['id']) {
                var pendingEl = goog.dom.getElementByClass('pending', colEl);
                var newCount = goog.dom.getTextContent(pendingEl) - 1;
                if (newCount <= 0) {
                  goog.dom.removeNode(colEl);
                  goog.dispose(colEl);
                } else {
                  goog.dom.setTextContent(pendingEl, (/** @type {string} */ newCount));
                }
              }
            }, this);
          }, this);
          if (totalPending) {
            brkn.model.Controller.getInstance().setPending(totalPending);
          }
          
          this.collectionsHeight_ = goog.style.getSize(this.collectionsEl_.parentElement).height;
          this.resize();
        }, this));
  }
};


/**
 * @private
 */
brkn.sidebar.Admin.prototype.resize = function() {
  goog.style.setHeight(this.scrollable_, this.channelsHeight_ + this.topicsHeight_ +
      this.collectionsHeight_ + 110);
};
