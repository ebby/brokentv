goog.provide('brkn.Search');

goog.require('brkn.model.Search');
goog.require('brkn.sidebar');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.LabelInput');
goog.require('soy');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Search = function() {
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
   * @type {boolean}
   */
  this.hasResults_ = false;
  
  /**
   * @type {goog.ui.LabelInput}
   */
  this.input_ = new goog.ui.LabelInput('Search');
  
  /**
   * @type {goog.ui.CustomButton}
   */
  this.toggle_ = new goog.ui.CustomButton('Search');
  this.toggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);
};
goog.inherits(brkn.Search, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Search.prototype.searchEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Search.prototype.resultMedias_;


/**
 * @type {Element}
 * @private
 */
brkn.Search.prototype.clearEl_;


/** @inheritDoc */
brkn.Search.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  this.input_.decorate(goog.dom.getElement('search-input'));
  this.toggle_.decorate(goog.dom.getElement('search-icon'));
  this.searchEl_ = goog.dom.getElement('search-results');
  this.resultMedias_ = goog.dom.getElementByClass('result-medias', this.getElement());
  this.clearEl_ = goog.dom.getElement('clear-icon');
  var keyHandler = new goog.events.KeyHandler(this.input_.getElement());
  var searchThrottle = new goog.Throttle(function() {
    if (this.input_.getValue()) {
      brkn.model.Search.getInstance().search(this.input_.getValue(), goog.bind(this.onSearch_, this));
      goog.style.showElement(this.clearEl_, true);
      goog.dom.classes.add(this.getElement(), 'show');
    } else {
      this.resultMedias_.innerHTML = '';
      this.hasResults_ = false;
    }
  }, 1000, this);
  
  this.getHandler()
      .listen(this.getElement(),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            this.toggle_.setChecked(true);
            if (this.hasResults_) {
              goog.dom.classes.add(this.getElement(), 'show');
            }
          }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            e.stopPropagation();
            searchThrottle.fire();
          }, this))
      .listen(this.clearEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            this.input_.setValue('');
            goog.dom.classes.remove(this.getElement(), 'show');
            this.toggle_.setChecked(false);
            goog.style.showElement(this.clearEl_, false);
            this.resultMedias_.innerHTML = '';
            this.hasResults_ = false;
          }, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (this.toggle_.isChecked()) {
              if (!goog.dom.getAncestorByClass(e.target, 'search')) {
                goog.Timer.callOnce(goog.bind(function() {
                  goog.dom.classes.remove(this.getElement(), 'show');
                  this.toggle_.setChecked(false);
                }, this));
              }
            }
          }, this));
};


/**
 * @param {Array.<brkn.model.Media>} medias
 * @private
 */
brkn.Search.prototype.onSearch_ = function(medias) {
  this.resultMedias_.innerHTML = '';

  this.hasResults_ = !!medias.length;
  goog.dom.classes.enable(this.searchEl_, 'no-medias', !this.hasResults_);
  goog.array.forEach(medias, function(media) {
    this.addMedia_(media);
  }, this);
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.Search.prototype.addMedia_ = function(media) {
  var mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, {
    media: media
  });

  var playEl = goog.dom.getElementByClass('list-play', mediaEl); 
//  var plusEl = goog.dom.getElementByClass('plus', mediaEl); 

  goog.dom.appendChild(this.resultMedias_, mediaEl); 
  
  this.getHandler()
      .listen(mediaEl, goog.events.EventType.CLICK, goog.bind(function(e) {
        e.preventDefault();
        e.stopPropagation();
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
      }, this))
      .listen(playEl, goog.events.EventType.CLICK, goog.bind(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var program = brkn.model.Program.async(media);
        brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
      }, this));

//  goog.dom.classes.enable(this.mediasEl_, 'no-medias', !this.mediasCount_);
//  goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
//      this.mediasCount_ > 0 ? this.mediasCount_.toString() : '');
};
