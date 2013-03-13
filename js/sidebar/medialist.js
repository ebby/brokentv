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
 * @param {?string=} opt_descUrl
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.MediaList = function(opt_mediaList, opt_url, opt_thumb, opt_desc, opt_link, opt_descUrl) {
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
  this.descUrl_ = opt_descUrl || null;
  
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
brkn.sidebar.MediaList.prototype.listInfoEl_;


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


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.MediaList.prototype.spinner_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.MediaList.prototype.noActivitiesEl_;


/** @inheritDoc */
brkn.sidebar.MediaList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  el.innerHTML = '';
  el.scrollTop = 0;
  goog.dom.classes.add(this.getElement(), 'ios-scroll');
  
  if (this.description_ || this.thumbnail_) {
    this.setListInfo_();
  }

  if (!this.description_ && this.descUrl_) {
    goog.net.XhrIo.send(
        this.descUrl_,
        goog.bind(function(e) {
          var data = e.target.getResponseJson();
          if (this.listInfoEl_) {
            var descEl = goog.dom.getElementByClass('description', this.listInfoEl_);
            descEl.innerHTML = goog.string.linkify.linkifyPlainText(data['description']);
            this.infoHeight_ = goog.style.getSize(this.listInfoEl_).height;
            this.resize();
          } else {
            this.setListInfo_(); 
          }
        }, this));
  }
  
  this.spinner_ = goog.dom.createDom('div', 'loading',
      goog.dom.createDom('div', 'loading-spinner'));
  goog.dom.appendChild(this.getElement(), this.spinner_);
  goog.style.showElement(this.spinner_, false);

  if (goog.dom.classes.has(this.getElement(), 'starred')) {
    this.noActivitiesEl_ = goog.dom.createDom('div', 'no-comments',
        'Stories you love will be here.');
    goog.dom.appendChild(this.getElement(), this.noActivitiesEl_);
  }

  this.mediasEl_ = goog.dom.createDom('div', 'medias');
  goog.dom.appendChild(this.getElement(), this.mediasEl_);
  
  this.getHandler().listen(window, 'resize',
      goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)));
  
  if (this.url_) {
    goog.style.showElement(this.spinner_, true);
    goog.net.XhrIo.send(
        this.url_,
        goog.bind(function(e) {
          goog.style.showElement(this.spinner_, false);
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
  this.noActivitiesEl_ && goog.style.showElement(this.noActivitiesEl_, false);

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
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 40 -
      (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
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
 * @private
 */
brkn.sidebar.MediaList.prototype.setListInfo_ = function() {
  this.listInfoEl_ = soy.renderAsElement(brkn.sidebar.listInfo, {
    thumbnail: this.thumbnail_,
    description: this.description_ ? goog.string.linkify.linkifyPlainText(this.description_) : '',
    link: this.link_
  });
  goog.dom.appendChild(this.getElement(), this.listInfoEl_);
  this.infoHeight_ = goog.style.getSize(this.listInfoEl_).height;
  this.resize();
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
