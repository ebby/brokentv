goog.provide('brkn.model.Controller');
goog.provide('brkn.model.Controller.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Controller = function() {
	goog.base(this);
};
goog.inherits(brkn.model.Controller, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Controller);


/**
 * @enum {string}
 */
brkn.model.Controller.Actions = {
	PLAY: 'play',
	FINISHED: 'finished',
	TOGGLE_GUIDE: 'toggle-guide',
	TOGGLE_SIDEBAR: 'toggle-sidebar'
};