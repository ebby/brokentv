goog.provide('brkn.sidebar.MediaList');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.fx.DragDrop');
goog.require('goog.fx.DragDropGroup');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {?Array.<brkn.model.Media>=} opt_mediaList
 * @param {?string=} opt_url
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 * @param {?string=} opt_link
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.MediaList = function(opt_mediaList, opt_url, opt_thumb, opt_desc, opt_link) {
  goog.base(this);

  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();

  /**
   * @type {?Array.<brkn.model.Media>}
   * @private
   */
  this.mediaList_ = opt_mediaList || null;
  
  /**
   * @type {?string}
   * @private
   */
  this.url_ = opt_url || null;
  
  /**
   * @type {Object.<string, Element>}
   * @private
   */
  this.mediaEls_ = {};

  /**
   * @type {?string}
   * @private
   */
  this.thumbnail_ = opt_thumb || null;

  /**
   * @type {?string}
   * @private
   */
  this.description_ = opt_desc || null;
  
  /**
   * @type {?string}
   * @private
   */
  this.link_ = opt_link || null;

  /**
   * @type {goog.fx.DragDropGroup}
   * @private
   */
  this.dragDropGroup_ = this.isAdmin_ ? new goog.fx.DragDropGroup() : null;

  /**
   * @type {number}
   * @private
   */
  this.infoHeight_ = 0;


  /**
   * @type {number}
   * @private
   */
  this.mediasHeight_ = 0;
};
goog.inherits(brkn.sidebar.MediaList, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.MediaList.prototype.mediasEl_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.MediaList.prototype.scrollable_;


/** @inheritDoc */
brkn.sidebar.MediaList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  el.innerHTML = '';
  el.scrollTop = 0;
  this.scrollable_ = goog.dom.createDom('div', 'ios-scroll');
  goog.dom.appendChild(this.getElement(), this.scrollable_);
  
  if (this.description_ || this.thumbnail_) {
    var listInfoEl = soy.renderAsElement(brkn.sidebar.listInfo, {
      thumbnail: this.thumbnail_,
      description: this.description_,
      link: this.link_
    });
    goog.dom.appendChild(this.scrollable_, listInfoEl);
    this.infoHeight_ = goog.style.getSize(listInfoEl).height;
  }

  this.mediasEl_ = goog.dom.createDom('div', 'medias');
  goog.dom.appendChild(this.scrollable_, this.mediasEl_);
  
  if (this.url_) {
    goog.net.XhrIo.send(
        this.url_,
        goog.bind(function(e) {
          var medias = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          medias = goog.array.map(medias, function(m) {
            return new brkn.model.Media(m);
          });
          goog.array.forEach(medias, this.addMedia, this);
          this.mediasHeight_ = goog.style.getSize(this.mediasEl_).height;
          this.resize();
        }, this));
  } else if (this.mediaList_) {
    goog.array.forEach(this.mediaList_, this.addMedia, this);
    this.mediasHeight_ = goog.style.getSize(this.mediasEl_).height;
    this.resize();
  }
};


/**
 * @param {brkn.model.Media} media 
 * @private
 */
brkn.sidebar.MediaList.prototype.addMedia = function(media) {
  var mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, {
    media: media
  });
  goog.dom.appendChild(this.mediasEl_, mediaEl);
  if (this.isAdmin_) {
    this.dragDropGroup_.addItem(mediaEl);
  }
  this.getHandler().listen(mediaEl,
      goog.events.EventType.CLICK,
      goog.bind(function() {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
      }, this));
  this.mediaEls_[media.id] = mediaEl;
};


/**
 * @private
 */
brkn.sidebar.MediaList.prototype.resize = function() {
  goog.style.setHeight(this.scrollable_, this.mediasHeight_ + this.infoHeight_ + 65);
};


/**
 * @param {brkn.model.Media} media 
 * @private
 */
brkn.sidebar.MediaList.prototype.removeMedia = function(media) {
  var mediaEl = this.mediaEls_[media.id]; 
  if (mediaEl) {
    goog.dispose(mediaEl);
    goog.object.remove(this.mediaEls_, media.id);
  }
};


/**
 * @param {brkn.model.Channel} channel The channel
 * @param {brkn.model.Media} media 
 * @private
 */
brkn.sidebar.MediaList.prototype.onAddProgram_ = function(channel, media) {
  goog.net.XhrIo.send(
    '/admin/_addprogram',
    goog.bind(function(e) {
      var response = goog.json.parse(e.target.getResponse());
      var newProgram = new brkn.model.Program(response);
      channel.publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram);
    }, this),
    'POST',
    'channel=' + channel.id +'&media=' + media.id);
};
