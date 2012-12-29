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
 * @param  {Array.<brkn.model.Media>} mediaList
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.MediaList = function(mediaList) {
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
  
  goog.array.forEach(this.mediaList_, function(media) {
    var mediaEl = soy.renderAsElement(brkn.sidebar.media, {
      media: media,
      published: media.published.getMonth() + '/' + media.published.getDate() + '/' +
          media.published.getYear() + ' ' + media.published.toUsTimeString()
    });
    goog.dom.appendChild(this.getElement(), mediaEl);
    if (this.isAdmin_) {
      this.dragDropGroup_.addItem(mediaEl);
    }
    this.getHandler().listen(mediaEl,
        goog.events.EventType.CLICK,
        goog.bind(function() {
          var channel = brkn.model.Channels.getInstance().currentChannel;
          this.onAddProgram_(channel, media);
        }, this));
  }, this);
  if (this.isAdmin_) {
    this.dragDropGroup_.addTarget(new goog.fx.DragDrop(this.getElement()));
    this.dragDropGroup_.init();
    this.getHandler().listen(this.dragDropGroup_, 'drag', function(e) {window.console.log(e)});
  }
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
