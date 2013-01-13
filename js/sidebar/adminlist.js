goog.provide('brkn.sidebar.AdminList');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.DragDrop');
goog.require('goog.fx.DragDropGroup');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {string} collectionId
 * @param {Array.<brkn.model.Media>} mediaList
 * @param {?Element=} opt_pendingEl
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.AdminList = function(collectionId, mediaList, opt_pendingEl, opt_thumb, opt_desc) {
  goog.base(this);

  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();

  /**
   * @type {string}
   * @private
   */
  this.collectionId_ = collectionId;
  
  /**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.mediaList_ = mediaList;

  /**
   * @type {?Element}
   * @private
   */
  this.pendingEl_ = opt_pendingEl || null;
  
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
goog.inherits(brkn.sidebar.AdminList, goog.ui.Component);


/** @inheritDoc */
brkn.sidebar.AdminList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  el.innerHTML = '';
  el.scrollTop = 0;
  
  if (this.description_ || this.thumbnail_) {
    var listInfoEl = soy.renderAsElement(brkn.sidebar.listInfo, {
      thumbnail: this.thumbnail_,
      description: this.description_
    });
    goog.dom.appendChild(this.getElement(), listInfoEl);
  }

  goog.dom.appendChild(this.getElement(), goog.dom.createDom('div', 'label', 'PENDING APPROVAL'));
  
  var mediasEl = goog.dom.createDom('div', 'medias');
  goog.dom.appendChild(this.getElement(), mediasEl);

  goog.array.forEach(this.mediaList_, function(media) {
    var mediaEl = soy.renderAsElement(brkn.sidebar.adminMedia, {
      media: media,
      published: media.published.getMonth() + '/' + media.published.getDate() + '/' +
          media.published.getYear() + ' ' + media.published.toUsTimeString()
    });
    goog.dom.appendChild(mediasEl, mediaEl);
    if (this.isAdmin_) {
      this.dragDropGroup_.addItem(mediaEl);
    }
    var dragger = new goog.fx.Dragger(goog.dom.getElementByClass('repos', mediaEl));
    var thumb = goog.dom.getElementByClass('thumb', mediaEl);
    var play = goog.dom.getElementByClass('play', mediaEl);
    var approve = goog.dom.getElementByClass('approve', mediaEl);
    var remove = goog.dom.getElementByClass('remove', mediaEl);
    dragger.defaultAction = function(x, y) {
      var delta = y - 24
      if (delta >= -50 && delta <= 50) {
        goog.style.setStyle(thumb, 'background-position-y', 50 - delta + '%');
      }
    };
    this.getHandler().listen(dragger, 'end',
        function(e) {
          var percent = goog.style.getStyle(thumb, 'background-position').split(' ')[1];
          percent = percent.substring(0, percent.length - 1);
          goog.net.XhrIo.send(
              '/admin/_posthumb',
              goog.functions.NULL(),
              'POST',
              'media=' + media.id +
              '&pos=' + percent);
        })
        .listen(play, goog.events.EventType.CLICK, goog.bind(this.play_, this, media))
        .listen(approve, goog.events.EventType.CLICK,
            goog.bind(this.approval_, this, media, true, mediaEl))
        .listen(remove, goog.events.EventType.CLICK,
            goog.bind(this.approval_, this, media, false, mediaEl));
  }, this);
  
//  if (this.isAdmin_) {
//    this.dragDropGroup_.addTarget(new goog.fx.DragDrop(this.getElement()));
//    this.dragDropGroup_.init();
//    this.getHandler().listen(this.dragDropGroup_, 'drag', function(e) {window.console.log(e)});
//  }
  this.resize();
};



/** @inheritDoc */
brkn.sidebar.AdminList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.getHandler()
      .listen(window, 'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
};


brkn.sidebar.AdminList.prototype.resize = function() {
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 40);
};


/**
 * @param {brkn.model.Channel} channel The channel
 * @param {brkn.model.Media} media 
 * @private
 */
brkn.sidebar.AdminList.prototype.onAddProgram_ = function(channel, media) {
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


/**
 * @param {brkn.model.Media} media 
 * @param {boolean} approve
 * @param {Element} mediaEl
 * @private
 */
brkn.sidebar.AdminList.prototype.approval_ = function(media, approve, mediaEl) {
  goog.net.XhrIo.send(
      'admin/_media/collection',
      goog.bind(function() {
        goog.dom.classes.add(mediaEl, 'remove');
        goog.Timer.callOnce(function() {
          goog.dom.removeNode(mediaEl)
        }, 300);
        brkn.model.Controller.getInstance().setPending(
            (/** @type {string}*/ brkn.model.Controller.getInstance().getPending() - 1));
        if (this.pendingEl_) {
          goog.dom.setTextContent(this.pendingEl_,
              (/** @type {string} */ goog.dom.getTextContent(this.pendingEl_) - 1));
        }
      }, this),
      'POST',
      'col=' + this.collectionId_ + '&media=' + media.id + '&approve=' + approve);
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.sidebar.AdminList.prototype.play_ = function(media) {
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC,
      media);
};
