goog.provide('brkn.model.BrowserChannel');

goog.require('brkn.model.Channels');
goog.require('brkn.model.Users');

goog.require('goog.pubsub.PubSub');



/**
 * @param {string} token Channel token.
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.BrowserChannel = function(token) {
	goog.base(this);
};
goog.inherits(brkn.model.BrowserChannel, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.BrowserChannel);


/**
 * @type {string}
 * @private
 */
brkn.model.BrowserChannel.prototype.token_;


/**
 * @param {string} token Channel token.
 * @private
 */
brkn.model.BrowserChannel.prototype.init = function(token) {
	this.token_ = token;

	// Register browser channel
	var channel = new appengine.Channel(unescape(token));
	var socket = channel.open();
	socket.onmessage = goog.bind(this.onMessage_, this);
	return this;
};


/**
 * @param {Object} rawMessage Raw message
 * @private
 */
brkn.model.BrowserChannel.prototype.onMessage_ = function(rawMessage) {
	var message = goog.json.parse(rawMessage.data);
	window.console.log(message);
	switch(message.type) {
	  case 'viewer_change':
	    var user = brkn.model.Users.getInstance().get_or_add(message['user']);
	    var channel = brkn.model.Channels.getInstance().get(message['channel_id']);
	    var last_channel = brkn.model.Channels.getInstance().get(message['last_channel_id']);
	    var time = goog.date.fromIsoString(message['time'] + 'Z');
	    last_channel.publish(brkn.model.Channel.Action.REMOVE_VIEWER, user, time);
	    channel.publish(brkn.model.Channel.Action.ADD_VIEWER, user, time);
	    break;
	}
};