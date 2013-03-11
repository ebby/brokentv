goog.provide('brkn.model.Channels');
goog.provide('brkn.model.Actions');


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
	
	/**
   * @type {brkn.model.Channel}
   */
  this.myChannel;
	
	this.subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL, this.changeChannel, this);
	this.subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM, this.updateOnlineUsers, this);
};
goog.inherits(brkn.model.Channels, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Channels);


/**
 * @type {brkn.model.Channel}
 */
brkn.model.Channels.prototype.currentChannel;


/**
 * Used to track online users locally. Not updated by time.
 * @type {brkn.model.Program}
 */
brkn.model.Channels.prototype.currentProgram_;


/**
 * @type {brkn.model.Channel}
 */
brkn.model.Channels.prototype.lastChannel;


/**
 * @param {string} id The id
 * @return {brkn.model.Channel} The channel
 */
brkn.model.Channels.prototype.get = function(id) {
	return this.channelMap[id];
};


/**
 * @param {?boolean=} opt_public Only public channels
 * @return {?brkn.model.Channel} The next channel with current programming
 */
brkn.model.Channels.prototype.findOnline = function(opt_public) {
  if (this.currentChannel && this.currentChannel.getCurrentProgram() &&
      ((opt_public && !this.currentChannel.myChannel) || !opt_public)) {
    return this.currentChannel;
  } else if (this.lastChannel && this.lastChannel.getCurrentProgram() &&
      ((opt_public && !this.lastChannel.myChannel) || !opt_public)) {
    return this.lastChannel;
  }
  var channel = null
  var currentProgram = null;
  var index = 0;
  while (!currentProgram && index < this.channels.length) {
    channel = !this.channels[index].myChannel ? this.channels[index] : null;
    currentProgram = channel && channel.getCurrentProgram();
    index++;
  }

  return channel;
};


/**
 * @param {Object} channels Channels json object.
 * @param {string} currentChannelId
 */
brkn.model.Channels.prototype.loadFromJson = function(channels, currentChannelId) {
	goog.object.forEach((/** @type {Object.<string, Object>} */ channels),
			goog.bind(function(channel, id) {
				var c = new brkn.model.Channel(channel)
				this.channels.push(c);
				this.channelMap[channel.id] = c;
				if (c.myChannel) {
				  this.myChannel = c;
				}
			}, this));
	
	// Set current channel or first channel with content.
	var channel = this.channelMap[currentChannelId] || this.channels[0];
	this.currentChannel = channel;
	this.currentChannel = this.findOnline() || this.currentChannel;
	if (this.currentChannel) {
	  this.updateOnlineUsers(this.currentChannel.getCurrentProgram());
	}
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
				brkn.model.Users.getInstance().addOnline(u);
				var channel = this.channelMap[session['channel_id']];
				var tuneIn = goog.date.fromIsoString(session['tune_in'] + 'Z');
				var tuneOut = session['tune_out'] ?
				    goog.date.fromIsoString(session['tune_out'] + 'Z') : null;
				var newSession = new brkn.model.Session(session['id'], u, channel, tuneIn, tuneOut);
				u.currentSession = newSession;
				if (channel) {
				  channel.viewerSessions.push(newSession);
				  var program = channel.getCurrentProgram();
	        program && program.media.publish(brkn.model.Media.Actions.WATCHING, u, channel);
				}	
			}, this));
};


/**
 * @param {brkn.model.Channel} channel New channel
 * @param {?boolean=} opt_forced Forced channel change, not by user
 */
brkn.model.Channels.prototype.changeChannel = function(channel, opt_forced) {
  if ((channel && !this.currentChannel) ||
      (channel && this.currentChannel && this.currentChannel.id != channel.id)) {
    this.lastChannel = this.currentChannel;
    this.currentChannel = channel;
    this.updateOnlineUsers(channel.getCurrentProgram());
    var program = channel.getCurrentProgram();
    var withFriends = program && !!program.media.onlineViewers.length;
    goog.net.XhrIo.send('/_changechannel', goog.functions.NULL(), 'POST',
        'channel=' + channel.id + '&friends=' + withFriends + (opt_forced ? '&forced=true' : ''));
    brkn.model.Analytics.getInstance().changeChannel(channel, this.lastChannel);
  }
};


/**
 * @param {?brkn.model.Program} program
 */
brkn.model.Channels.prototype.updateOnlineUsers = function(program) {
  if (this.currentChannel) {
    if (this.currentProgram_) {
      // If previous program, remove channel viewers.
      goog.array.forEach(this.currentChannel.viewerSessions, function(s) {
        goog.array.removeIf(this.currentProgram_.media.onlineViewers,
            function(v) {return v.id == s.user.id});
      }, this);
    }
    
    if (program) {
      // If next program, add channel viewers.
      this.currentProgram_ = program;
      var viewers = goog.array.map(this.currentChannel.viewerSessions, function(s) {return s.user});
      program.media.onlineViewers = goog.array.concat(program.media.onlineViewers, viewers);
    }
  }
};


/**
 * Make or return my channel
 */
brkn.model.Channels.prototype.getMyChannel = function() {
  if (!this.myChannel) {
    // Create a private channel
    var user = brkn.model.Users.getInstance().currentUser;
    this.myChannel = new brkn.model.Channel({
      id: user.id,
      name: user.name.split(' ')[0] + '\'s Channel'
    });
  }
  return this.myChannel;
};


/**
 * @enum {string}
 */
brkn.model.Channels.Actions = {
	CHANGE_CHANNEL: 'change-channel',
	NEXT_PROGRAM: 'next-program',
	PLAY_ASYNC: 'play-async'
};
