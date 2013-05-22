goog.provide('brkn.Hovercard');

goog.require('soy');

goog.require('brkn.hovercard');
goog.require('brkn.model.Hovercard');

/**
 * Hovercard UI component.
 *
 * @constructor
 * @extends {goog.ui.Hovercard}
 */
brkn.Hovercard = function() {
  //var el = goog.dom.getElement('hovercard');
  if (!el) {
    // Insert our base div into the document if not already there.
    el = soy.renderAsElement(brkn.Hovercard.base);
    goog.dom.appendChild(document.body, el);
  }
  goog.base(this, el);

  goog.events.listen(window, goog.events.EventType.RESIZE,
      goog.bind(this.setVisible, this, false));
  goog.events.listen(this, goog.ui.HovercardBase.EventType.HIDE,
      this.onHideInternal_);

  /**
   * @type {brkn.model.Hovercard}
   * @private
   */
  this.model_ = brkn.model.Hovercard.getInstance();
  this.model_.subscribe(brkn.model.Hovercard.Action.SELECT_PROGRAM,
      this.showForSelectProgram_, this);
  this.model_.subscribe(brkn.model.Hovercard.Action.HIDE,
      this.hide_, this);
};
goog.inherits(brkn.Hovercard, goog.ui.Hovercard);
goog.addSingletonGetter(brkn.Hovercard);