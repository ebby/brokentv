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
  
  /**
   * @type {number}
   * @private
   */
  this.totalPending_ = 0;
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


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Admin.prototype.input_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Admin.prototype.adminListEl_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Admin.prototype.colListEl_;


/** @inheritDoc */
brkn.sidebar.Admin.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.admin);
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.Admin.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  var contentEl = soy.renderAsElement(brkn.sidebar.admin, {
    inputText: this.channelId_ ? 'Add a collection' : 'Add a Channel'
  });
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Admin.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.input_ = goog.dom.getElementByClass('input', this.getElement());
  var keyHandler = new goog.events.KeyHandler(this.input_);
  this.scrollable_ = goog.dom.getElementByClass('scrollable', this.getElement());
  this.channelsEl_ = goog.dom.getElementByClass('admin-channels', this.getElement());
  this.topicsEl_ = goog.dom.getElementByClass('topics', this.getElement());
  this.collectionsEl_ = goog.dom.getElementByClass('collections', this.getElement());
  this.colListEl_ = goog.dom.getElement('admin-col-list')
  this.adminListEl_ = goog.dom.getElement('admin-list');
  var channel = brkn.model.Channels.getInstance().currentChannel;
  
  if (!this.channelId_) {
  goog.net.XhrIo.send(
      '/admin/_channels',
      goog.bind(function(e) {
        var channels = /** @type {Array.<Object>} */ e.target.getResponseJson();
        goog.style.showElement(this.channelsEl_.parentElement, !!channels.length);
        goog.array.forEach(channels, this.addChannel_, this);

        this.channelsHeight_ = goog.style.getSize(this.channelsEl_.parentElement).height;
        this.resize();
      }, this));
  } else {
//    goog.net.XhrIo.send(
//        '/admin/_topicmedias/' + this.channelId_,
//        goog.bind(function(e) {
//          var topicMedias = /** @type {Array.<Object>} */ e.target.getResponseJson();
//          goog.object.forEach(topicMedias, function(medias, topic) {
//            goog.style.showElement(this.topicsEl_.parentElement, true);
//            if (medias && medias.length) {
//              var topicEl = soy.renderAsElement(brkn.sidebar.topic, {
//                topic: topic,
//                pending: medias.length
//              });
//              goog.dom.appendChild(this.topicsEl_, topicEl);
//              goog.events.listen(topicEl, goog.events.EventType.CLICK, goog.bind(function(e) {
//                medias = goog.array.map(medias, function(m) {
//                  return new brkn.model.Media(m);
//                });
//                var adminList = new brkn.sidebar.AdminList('', medias, [], [], []);
//                adminList.decorate(this.adminListEl_);
//                brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
//                    this.adminListEl_, false, topic);
//              }, this));
//              brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.APPROVED, function(media) {
//                if (goog.array.find(medias, function(m){return m.id == media.id})) {
//                  var pendingEl = goog.dom.getElementByClass('pending', topicEl);
//                  var newCount = goog.dom.getTextContent(pendingEl) - 1;
//                  if (newCount <= 0) {
//                    goog.dom.removeNode(topicEl);
//                    goog.dispose(topicEl);
//                  } else {
//                    goog.dom.setTextContent(pendingEl, (/** @type {string} */ newCount));
//                  }
//                }
//              }, this);
//            }
//          }, this);
//          if (this.totalPending_) {
//            brkn.model.Controller.getInstance().setPending(this.totalPending_);
//          }
//          
//          this.topicsHeight_ = goog.style.getSize(this.topicsEl_.parentElement).height;
//          this.resize();
//        }, this));
//    
    
    goog.net.XhrIo.send(
        '/admin/_collections/' + this.channelId_,
        goog.bind(function(e) {
          var collections = /** @type {Array.<Object>} */ e.target.getResponseJson();
          goog.style.showElement(this.collectionsEl_.parentElement, !!collections.length);
          goog.array.forEach(collections, this.addCollection_, this);
          if (this.totalPending_) {
            brkn.model.Controller.getInstance().setPending(this.totalPending_);
          }

          this.collectionsHeight_ = goog.style.getSize(this.collectionsEl_.parentElement).height;
          this.resize();
        }, this));
  }
  
  this.getHandler().listen(keyHandler, goog.events.KeyHandler.EventType.KEY, goog.bind(function(e) {
    if (e.keyCode == '13' && this.input_.value) {
      this.onInput_(this.input_.value);
    }
  }, this));
};


/**
 * @param {Object} channel
 * @private
 */
brkn.sidebar.Admin.prototype.addChannel_ = function(channel) {
  var c = new brkn.model.Channel(channel);
  var channelEl = soy.renderAsElement(brkn.sidebar.channel, {
    channel: c
  });
  goog.dom.appendChild(this.channelsEl_, channelEl);
  goog.events.listen(channelEl, goog.events.EventType.CLICK, goog.bind(function(e) {
    if (goog.dom.classes.has(e.target, 'on') || goog.dom.classes.has(e.target, 'off')) {
      goog.dom.classes.enable(channelEl, 'on', goog.dom.classes.has(e.target, 'on'));
      goog.dom.classes.enable(channelEl, 'off', !goog.dom.classes.has(e.target, 'on'));
      goog.net.XhrIo.send(
          '/admin/_channel/online/' + c.id,
          goog.bind(function(e) {
            e.target.disabled = '';
            var channel = e.target.getResponseJson();
            goog.dom.classes.enable(channelEl, 'on', channel['online']);
            goog.dom.classes.enable(channelEl, 'off', !channel['online']);
          }, this),
          'POST',
          'online=' + goog.dom.classes.has(e.target, 'on'));
    } else if (goog.dom.classes.has(e.target, 'program')) {
      goog.net.XhrIo.send('/admin/_program', goog.functions.NULL(), 'POST',
          'channel_id=' + c.id);
    } else if (goog.dom.classes.has(e.target, 'fetch')) {
      goog.net.XhrIo.send('/admin/_fetch', function() {
        alert('Fetch began, but give it some time.');  
      }, 'POST', 'channel_id=' + c.id);
    } else if (goog.dom.classes.has(e.target, 'remove') &&
        confirm('Remove ' + c.name + '?')) {
      goog.style.showElement(channelEl, false);
      goog.net.XhrIo.send('/admin/_channels/' + c.id, function(e) {
        var response = e.target.getResponseJson();
        if (response['deleted']) {
          goog.dom.removeNode(channelEl);
        } else {
          goog.style.showElement(channelEl, true);
        }
      }, 'DELETE');
    } else {
      var colList = new brkn.sidebar.Admin(c.id);
      colList.decorate(this.colListEl_);
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
            this.colListEl_, false, c.name); 
    }
  }, this));
};


/**
 * @param {Object} col
 * @private
 */
brkn.sidebar.Admin.prototype.addCollection_ = function(col) {
  var colEl = soy.renderAsElement(brkn.sidebar.collection, {
    collection: col
  });
  this.totalPending_ += col['pending'];
  goog.dom.appendChild(this.collectionsEl_, colEl);
  goog.events.listen(colEl, goog.events.EventType.CLICK, goog.bind(function(e) {
    if (goog.dom.classes.has(e.target, 'remove') &&
        confirm('Remove ' + col['name'] + '?')) {
      goog.style.showElement(colEl, false);
      goog.net.XhrIo.send('/admin/_collections/' + col['id'], function(e) {
        var response = e.target.getResponseJson();
        if (response['deleted']) {
          goog.dom.removeNode(colEl);
        } else {
          goog.style.showElement(colEl, true);
        }
      }, 'DELETE');
    } else if (goog.dom.classes.has(e.target, 'fetch')) {
      goog.net.XhrIo.send('/admin/_fetch', function() {
        alert('Fetch began, but give it some time.');  
      }, 'POST', 'col_id=' + col['id']);
    } else {
      goog.net.XhrIo.send(
          '/admin/_media/collection/' + col['id'] + '?pending=1',
          goog.bind(function(e) {
            var res = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
            var medias = /** @type {Array.<Object>} */ res['medias'];
            medias = goog.array.map(medias, function(m) {
              return new brkn.model.Media(m);
            });
            var playlists = /** @type {Array.<Object>} */ res['playlists'];
            var publishers = /** @type {Array.<Object>} */ res['publishers'];
            var categories = /** @type {Object} */ res['categories'];
            var adminList = new brkn.sidebar.AdminList(col.id, medias, playlists, publishers,
                categories);
            adminList.decorate(this.adminListEl_);
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NAVIGATE,
                this.adminListEl_, false, col.name);
          }, this));
    }
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
};


/**
 * @param {string} value
 * @private
 */
brkn.sidebar.Admin.prototype.onInput_ = function(value) {
  this.input_.disabled = 'disabled'
  goog.net.XhrIo.send(
      this.channelId_ ? '/admin/_collections' : '/admin/_channels',
      goog.bind(function(e) {
        var res = e.target.getResponseJson();
        if (this.channelId_) {
          goog.style.showElement(this.collectionsEl_.parentElement, !!res);
          this.addCollection_(res);
        } else {
          goog.style.showElement(this.channelsEl_.parentElement, !!res);
          this.addChannel_(res);
        }
        this.input_.disabled = '';
        this.input_.value = '';
      }, this),
      'POST',
      'name=' + value + (this.channelId_ ? '&cid=' + this.channelId_ : ''));
};


/**
 * @private
 */
brkn.sidebar.Admin.prototype.resize = function() {
  goog.style.setHeight(this.scrollable_, this.channelsHeight_ + this.topicsHeight_ +
      this.collectionsHeight_ + 110);
};
