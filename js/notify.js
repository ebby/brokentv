goog.provide('brkn.Notify');

goog.require('brkn.notify');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('soy');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Notify = function() {
  goog.base(this);
};
goog.inherits(brkn.Notify, goog.ui.Component);


/** @inheritDoc */
brkn.Notify.prototype.createDom = function() {
  this.setElementInternal(goog.dom.createDom('div', {id: 'notify'}));
};


/** @inheritDoc */
brkn.Notify.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  brkn.model.Notify.getInstance().subscribe(brkn.model.Notify.Actions.FLASH,
      function(action, content, opt_user, opt_img, opt_link) {
        this.show_(true,  action, content, opt_user, opt_img, opt_link);
      }, this);
  brkn.model.Notify.getInstance().subscribe(brkn.model.Notify.Actions.SHOW,
      function(action, content, opt_user, opt_img, opt_link) {
        this.show_(false,  action, content, opt_user, opt_img, opt_link);
      }, this);
};


/**
 * @param {string} action
 * @param {string} content
 * @param {?brkn.model.User=} opt_user
 * @param {?string=} opt_img
 * @param {?string=} opt_link
 * @private
 */
brkn.Notify.prototype.show_ = function(flash, action, content, opt_user, opt_img, opt_link) {
  var noteEl = soy.renderAsElement(brkn.notify.note, {
    action: action,
    content: content,
    user: opt_user,
    img: opt_img,
    link: opt_link
  });
  
  var image = goog.dom.getElementByClass('image', noteEl);
  var close = goog.dom.getElementByClass('close', noteEl);
  this.getHandler()
      .listen(goog.dom.getElementByClass('close', noteEl), goog.events.EventType.CLICK, function(e) {
        e.preventDefault()
        e.stopPropagation()
        goog.dom.removeNode(noteEl);
      })
      .listen(image,
          goog.events.EventType.LOAD,
          function() {
            goog.style.showElement(image, true);
            goog.Timer.callOnce(function() {
              // Center the cropped picture.
              image.style.marginLeft = -1 * image.clientWidth / 2 + 'px';
              image.style.marginTop = -1 * image.clientHeight / 2 + 'px';
            });
          });
  goog.dom.appendChild(this.getElement(), noteEl);

  var dispEl = goog.dom.getElementByClass('note', noteEl);
  goog.Timer.callOnce(function() {
    if (dispEl) {
      goog.dom.classes.add(dispEl, 'show');
      if (flash) {
        goog.Timer.callOnce(function() {
          goog.dom.classes.remove(dispEl, 'show');
          goog.dom.classes.add(dispEl, 'fade-out');
          goog.Timer.callOnce(function() {
            goog.dom.removeNode(noteEl);
          }, 5100);
        }, 3000);
      } else {
        goog.Timer.callOnce(function() {
          goog.dom.classes.add(dispEl, 'dim'); 
        }, 3000);
      }
    }
  });
};
