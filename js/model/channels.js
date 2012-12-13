goog.provide('brkn.model.Channels');
goog.provide('brkn.model.Action');


goog.require('brkn.model.Channel');
goog.require('brkn.model.User');
goog.require('brkn.model.Users');

goog.require('goog.net.XhrIo');
goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Channels = function() {
	goog.base(this);
	
	/**
	 * @type {Array.<brkn.model.Channel>}
	 */
	this.channels = [];
	
	/**
	 * @type {Object.<string, brkn.model.Channel>}
	 */
	this.channelMap = {};
	
	this.subscribe(brkn.model.Channels.Action.CHANGE_CHANNEL, this.changeChannel, this);
};
goog.inherits(brkn.model.Channels, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Channels);


/**
 * @type {brkn.model.Channel}
 */
brkn.model.Channels.prototype.currentChannel;


/**
 * @param {string} id The id
 * @return {brkn.model.Channel} The channel
 */
brkn.model.Channels.prototype.get = function(id) {
	return this.channelMap[id];
};


/**
 * @param {Object} channels Channels json object.
 */
brkn.model.Channels.prototype.loadFromJson = function(channels, currentChannel) {
	goog.array.forEach((/** @type {Array.<Object>} */ channels),
			goog.bind(function(channel) {
				var c = new brkn.model.Channel(channel)
				this.channels.push(c);
				this.channelMap[channel.id] = c;
			}, this));
	this.currentChannel = this.channelMap[currentChannel] || this.channels[0];
};


/**
 * @param {Object} viewerSessions Viewers json object.
 */
brkn.model.Channels.prototype.loadViewersFromJson = function(viewerSessions) {
	var users = brkn.model.Users.getInstance();
	goog.array.forEach((/** @type {Array.<Object>} */ viewerSessions),
			goog.bind(function(session) {
				var u = brkn.model.Users.getInstance().get_or_add(session['user']);
				users.add(u);
				var channel = this.channelMap[session['channel_id']]
				channel.viewerSessions.push({
						user: u,
						tuneIn: goog.date.fromIsoString(session['tune_in'] + 'Z'),
						tuneOut: session['tune_out'] ? goog.date.fromIsoString(session['tune_out'] + 'Z') : null
				});
			}, this));
};


/**
 * @param {brkn.model.Channel} channel New channel
 */
brkn.model.Channels.prototype.changeChannel = function(channel) {
	this.currentChannel = channel;
	goog.net.XhrIo.send('/_changechannel', goog.functions.NULL(), 'POST', 'channel=' + channel.id);
};


/**
 * @enum {string}
 */
brkn.model.Channels.Action = {
	CHANGE_CHANNEL: 'change-channel'
};
