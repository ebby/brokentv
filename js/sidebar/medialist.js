goog.provide('brkn.sidebar.MediaList');

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
 * @param  {Array.<brkn.model.Media>} mediaList
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.MediaList = function(mediaList) {
  goog.base(this);
  
  /**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.mediaList_ = mediaList;
};
goog.inherits(brkn.sidebar.MediaList, goog.ui.Component);


/** @inheritDoc */
brkn.sidebar.MediaList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  goog.array.forEach(this.mediaList_, function(media) {
    var mediaEl = soy.renderAsElement(brkn.sidebar.media, {
      media: media,
      published: media.published.getMonth() + '/' + media.published.getDate() + '/' +
          media.published.getYear() + ' ' + media.published.toUsTimeString()
    });
    goog.dom.appendChild(this.getElement(), mediaEl);
  }, this);
  this.resize();
};



/** @inheritDoc */
brkn.sidebar.MediaList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.getHandler()
      .listen(window, 'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
};


brkn.sidebar.MediaList.prototype.resize = function() {
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 60);
};
