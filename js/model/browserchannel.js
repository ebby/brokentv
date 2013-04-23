goog.provide('brkn.model.BrowserChannel');

goog.require('brkn.model.Controller');
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
	
	/**
	 * @type {boolean}
	 * @private
	 */
	this.loggedOff_ = false;
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
	socket.onclose = goog.bind(this.onClose_, this);
	window.onbeforeunload = goog.bind(this.onClose_, this);
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

	    var time = message['time'] && goog.date.fromIsoString(message['time'] + 'Z'); 
	    if (user.currentSession && time) {
	      user.currentSession.end(time); 
	    } 

	    var lastChannel = message['last_channel_id'] && brkn.model.Channels.getInstance().get(message['last_channel_id']);
	    if (lastChannel) {
  	    lastChannel.publish(brkn.model.Channel.Action.REMOVE_VIEWER, user);
  	    user.currentMedia && user.currentMedia.publish(brkn.model.Media.Actions.WATCHING, user,
  	        lastChannel, true);
	    }

	    var channel = message['channel_id'] && brkn.model.Channels.getInstance().get(message['channel_id']);
	    var media = message['media'] && brkn.model.Medias.getInstance().getOrAdd(message['media']);
	    if (channel) { /* Might be a private channel */
	      time = time || new goog.date.DateTime();
	      var session = new brkn.model.Session(message['session_id'], user, channel, time);
	      user.currentSession = session;
	      channel.publish(brkn.model.Channel.Action.ADD_VIEWER, session);
	      var program = channel.getCurrentProgram();
	      media = program ? program.media : media;
	    }

	    if (media) {
	      media.publish(brkn.model.Media.Actions.WATCHING, user, channel);
	    }

	    break;
	  case 'new_comment':
	    var comment = new brkn.model.Comment(message['comment']);
	    if (comment.user.id != brkn.model.Users.getInstance().currentUser.id) {
  	    var tweet = message['tweet'] ? new brkn.model.Tweet(message['tweet']) : null;
  	    var media = brkn.model.Medias.getInstance().getOrAdd(message['comment']['media']);
  	    if (media) {
  	      media.publish(brkn.model.Media.Actions.ADD_COMMENT, comment);
  	      tweet && media.publish(brkn.model.Media.Actions.ADD_TWEET, tweet);
  	    }
	    }
	    break;
	  case 'new_activity':
	    brkn.model.Users.getInstance().publish(brkn.model.Users.Action.NEW_ACTIVITY,
	        message['activity']);
	    if (message['activity']['user']['id'] != brkn.model.Users.getInstance().currentUser.id) {
	      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.NEW_ACTIVITIES, 1);
	    }
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
  	            // If no current programming, change to this channel and play.
  	            brkn.model.Channels.getInstance().publish(
  	                brkn.model.Channels.Actions.CHANGE_CHANNEL, channel);
  	            brkn.model.Channels.getInstance().publish(
  	                brkn.model.Channels.Actions.NEXT_PROGRAM, p);
  	          }
	          }
	        }, this));
      break;
	  case 'twitter_auth':
	    brkn.model.Users.getInstance().currentUser.publish(brkn.model.User.Actions.TWITTER_AUTH);
	    break;
	}
};


/**
 * @private
 */
brkn.model.BrowserChannel.prototype.onClose_ = function() {
  if (!this.loggedOff_) {
    // Update UI prefs
    var myChannel = brkn.model.Channels.getInstance().currentChannel.myChannel;
    var currentMedia = myChannel && brkn.model.Channels.getInstance().currentChannel.currentMedia;
    var seek = currentMedia && Math.floor(brkn.model.Player.getInstance().getCurrentTime())
    if (DESKTOP) {
      goog.net.XhrIo.send('/_settings', goog.functions.NULL(), 'POST',
          'show_guide=' + brkn.model.Controller.getInstance().guideToggled +
          '&show_sidebar=' + brkn.model.Controller.getInstance().sidebarToggled +
          (seek ? '&current_seek=' + seek : ''));
    }
    this.loggedOff_ = true;
  }
};
