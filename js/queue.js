goog.provide('brkn.Queue');

goog.require('brkn.queue');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('soy');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Queue = function() {
  goog.base(this);
  
  
  /**
   * @type {Object.<string, Element>}
   */
  this.mediaEls_ = {};

  /**
   * @type {number}
   */
  this.mediasCount_ = 0;
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.toggle_ = new goog.ui.CustomButton('Queue');
  this.toggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
};
goog.inherits(brkn.Queue, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Queue.prototype.listEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Queue.prototype.mediasEl_;


/** @inheritDoc */
brkn.Queue.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  this.toggle_.decorate(goog.dom.getElementByClass('queue-toggle', this.getElement()));
  this.listEl_ = goog.dom.getElementByClass('queue-list', this.getElement());
  this.mediasEl_ = goog.dom.getElementByClass('medias', this.getElement());
  
  this.getHandler()
      .listen(this.toggle_.getElement(),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            goog.dom.classes.enable(this.getElement(), 'show', this.toggle_.isChecked());
          }, this))
      .listen(this.listEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            e.preventDefault();
            e.stopPropagation();
          }, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (this.toggle_.isChecked()) {
              if (!goog.dom.getAncestorByClass(e.target, 'queue')) {
                goog.Timer.callOnce(goog.bind(function() {
                  goog.dom.classes.remove(this.getElement(), 'show');
                  this.toggle_.setChecked(false);
                }, this));
              }
            }
          }, this));
  
  brkn.model.Channels.getInstance().getMyChannel().subscribe(brkn.model.Channel.Action.ADD_QUEUE,
      this.addMedia_, this); 
  
  if (brkn.model.Users.getInstance().currentUser.loggedIn) {
    brkn.model.Channels.getInstance().getMyChannel().fetchQueue(goog.bind(function(medias) {
      goog.array.forEach(medias, function(media) {
        this.addMedia_(media, true)
      }, this);
    }, this));
  }
};


/**
 * @param {brkn.model.Media} media
 * @param {boolean} add
 * @private
 */
brkn.Queue.prototype.addMedia_ = function(media, add) {
  if (!add) {
    if (goog.object.get(this.mediaEls_, media.id)) {
      var mediaEl = this.mediaEls_[media.id];
      goog.dom.removeNode(mediaEl);
      this.mediasCount_ -= 1;
    }
  } else {
    var mediaEl = soy.renderAsElement(brkn.queue.media, {
      media: media
    });
    this.mediaEls_[media.id] = mediaEl;
    this.mediasCount_ += 1;
    
    var playEl = goog.dom.getElementByClass('play', mediaEl); 
    var removeEl = goog.dom.getElementByClass('remove', mediaEl); 
  
    goog.dom.appendChild(this.mediasEl_, mediaEl);
    
    this.getHandler()
        .listen(mediaEl, goog.events.EventType.CLICK, goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
        }, this))
        .listen(playEl, goog.events.EventType.CLICK, goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          goog.dom.classes.remove(this.getElement(), 'show');
          this.toggle_.setChecked(false);
          var program = brkn.model.Program.async(media);
          brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
          brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
              media, false);
        }, this))
        .listen(removeEl, goog.events.EventType.CLICK, goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
              media, false); 
        }, this));
  }
  goog.dom.classes.enable(this.mediasEl_, 'no-medias', !this.mediasCount_);
  goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
      this.mediasCount_ > 0 ? this.mediasCount_.toString() : '');
};
