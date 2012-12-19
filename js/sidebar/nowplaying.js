goog.provide('brkn.sidebar.NowPlaying');

goog.require('soy');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.NowPlaying = function() {
  goog.base(this);
  
};
goog.inherits(brkn.sidebar.NowPlaying, goog.ui.Component);