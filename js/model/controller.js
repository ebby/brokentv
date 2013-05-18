goog.provide('brkn.model.Controller');
goog.provide('brkn.model.Controller.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Controller = function() {
	goog.base(this);
	
	this.playing = true;
	
	var el = goog.dom.getElement('controller');
	
	this.sidebarToggled = !el || goog.dom.classes.has(el, 'sidebar-toggled');
	
	this.guideToggled = el && goog.dom.classes.has(el, 'guide-toggled');
	
	
	var guideEl = goog.dom.getElement('guide');
	this.timeless = guideEl && goog.dom.classes.has(guideEl, 'timeless');

	this.subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, function(show) {
	  this.sidebarToggled = show;
	}, this);
	this.subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE, function(show) {
    this.guideToggled = show;
  }, this);
	this.subscribe(brkn.model.Controller.Actions.PLAY, function(play) {
    this.playing = play;
  }, this);
};
goog.inherits(brkn.model.Controller, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Controller);


/**
 * @param {string} count
 */
brkn.model.Controller.prototype.setPending = function(count) {
  var togglePending = goog.dom.getElement('toggle-pending');
  goog.dom.setTextContent(togglePending, count);
  goog.style.showElement(togglePending, !!count);
};


/**
 * @return {string}
 */
brkn.model.Controller.prototype.getPending = function() {
  var togglePending = goog.dom.getElement('toggle-pending');
  return goog.dom.getTextContent(togglePending);
};


/**
 * @enum {string}
 */
brkn.model.Controller.Actions = {
	PLAY: 'play',
	FINISHED: 'finished',
	MUTE: 'mute',
	RESTART: 'restart',
	TOGGLE_GUIDE: 'toggle-guide',
	TOGGLE_SIDEBAR: 'toggle-sidebar',
	TOGGLE_ADMIN: 'toggle-admin',
	TOGGLE_INFO: 'toggle-info'
};