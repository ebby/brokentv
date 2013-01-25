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
 * @param {Array.<brkn.model.Media>} mediaList
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.MediaList = function(mediaList, opt_thumb, opt_desc) {
  goog.base(this);

  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();

  /**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.mediaList_ = mediaList;

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
   * @type {goog.fx.DragDropGroup}
   * @private
   */
  this.dragDropGroup_ = this.isAdmin_ ? new goog.fx.DragDropGroup() : null;
};
goog.inherits(brkn.sidebar.MediaList, goog.ui.Component);


/** @inheritDoc */
brkn.sidebar.MediaList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  el.innerHTML = '';
  el.scrollTop = 0;
  goog.dom.classes.add(this.getElement(), 'ios-scroll');
  
  if (this.description_ || this.thumbnail_) {
    var listInfoEl = soy.renderAsElement(brkn.sidebar.listInfo, {
      thumbnail: this.thumbnail_,
      description: this.description_
    });
    goog.dom.appendChild(this.getElement(), listInfoEl);
  }

  var mediasEl = goog.dom.createDom('div', 'medias');
  goog.dom.appendChild(this.getElement(), mediasEl);

  goog.array.forEach(this.mediaList_, function(media) {
    var mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, {
      media: media
    });
    goog.dom.appendChild(mediasEl, mediaEl);
    if (this.isAdmin_) {
      this.dragDropGroup_.addItem(mediaEl);
    }
    this.getHandler().listen(mediaEl,
        goog.events.EventType.CLICK,
        goog.bind(function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
        }, this));
  }, this);
};


/** @inheritDoc */
brkn.sidebar.MediaList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

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
