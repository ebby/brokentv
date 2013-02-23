goog.provide('brkn.model.BrowserChannel');

goog.require('brkn.model.Channels');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Medias');
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
	goog.DEBUG && window.console.log(message);
	switch(message.type) {
	  case 'viewer_change':
	    var user = brkn.model.Users.getInstance().get_or_add(message['user']);
	    var channel = brkn.model.Channels.getInstance().get(message['channel_id']);
	    var time = goog.date.fromIsoString(message['time'] + 'Z');
	    var session = new brkn.model.Session(message['session_id'], user, channel, time);
	    if (user.currentSession) {
	      user.currentSession.end(time); 
	    }
	    user.currentSession = session;
	    if (message['last_channel_id']) {
  	    var lastChannel = brkn.model.Channels.getInstance().get(message['last_channel_id']);
  	    lastChannel.publish(brkn.model.Channel.Action.REMOVE_VIEWER, user);
	    }
	    channel.publish(brkn.model.Channel.Action.ADD_VIEWER, session);
	    break;
	  case 'new_comment':
	    var comment = new brkn.model.Comment(message['comment']);
	    var media = brkn.model.Medias.getInstance().getOrAdd(message['comment']['media']);
	    if (media) {
	      media.publish(brkn.model.Media.Actions.ADD_COMMENT, comment);
	    }
	    break;
	  case 'new_activity':
	    brkn.model.Users.getInstance().publish(brkn.model.Users.Action.NEW_ACTIVITY,
	        message['activity'])
      break;
	  case 'update_programs':
	    var programs = message['programs'];
	    var channel = brkn.model.Channels.getInstance().get(message['channel_id']);
	    goog.array.forEach(programs, function(program) {
	      channel.publish(brkn.model.Channel.Action.UPDATE_PROGRAM, program);
	    }, this);
	    break;
	  case 'new_programs':
	    goog.array.forEach((/** @type {Array.<Object>} */ message['programs']),
	        goog.bind(function(program) {
	          var p = new brkn.model.Program(program);
	          var channel = brkn.model.Channels.getInstance().get(message['channel_id']);
	          if (channel) {
  	          channel.publish(brkn.model.Channel.Action.ADD_PROGRAM, p);
  	          var currentProgram = brkn.model.Channels.getInstance().currentChannel &&
  	              brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  	          if (!currentProgram) {
  	            // If no current programming, change to this channel.
  	            brkn.model.Channels.getInstance().publish(
  	                brkn.model.Channels.Actions.CHANGE_CHANNEL, channel);
  	          }
//  	          if (currentProgram && p.id == currentProgram.id) {
//  	            // If this program is now on, play it.
//  	            brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.NEXT_PROGRAM, p);
//  	          }
	          }
	        }, this));
      break;
	}
};
