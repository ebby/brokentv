goog.provide('brkn.Player');

goog.require('brkn.model.Channels');
goog.require('brkn.model.Player');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Player = function() {
	goog.base(this);
};
goog.inherits(brkn.Player, goog.ui.Component);


/**
 * @type {YT.Player}
 * @private
 */
brkn.Player.prototype.player_;


/**
 * @type {brkn.model.Program}
 * @private
 */
brkn.Player.prototype.currentProgram_;


/**
 * @type {brkn.model.Channel}
 * @private
 */
brkn.Player.prototype.currentChannel_;


/** @inheritDoc */
brkn.Player.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.currentChannel_ = brkn.model.Channels.getInstance().currentChannel;
  this.currentProgram_ = this.currentChannel_ && this.currentChannel_.getCurrentProgram();
  var seek = this.currentProgram_ ? (goog.now() - this.currentProgram_.time.getTime())/1000 : 0;
  
  this.updateStagecover_();
  
  if (this.currentProgram_) {
    this.playProgram(this.currentProgram_);
  }
  
  this.getHandler().listen(window, 'resize', this.resize);
  
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
			this.changeChannel, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.resize(show);
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      function(show) {
        this.resize(undefined, show);
      }, this);
  
  this.resize();
};


/**
 * Play a program
 * @param {brkn.model.Program} program
 */
brkn.Player.prototype.playProgram = function(program) {
  var seek = (goog.now() - program.time.getTime())/1000;
  this.play(program.media, seek);
};


/**
 * Play
 * @param {brkn.model.Media} media
 * @param {number} seek
 * @param {?number=} opt_tries
 */
brkn.Player.prototype.play = function(media, seek, opt_tries) {
  var retry = 1000;

  if (!this.player_) {
    this.player_ = new YT.Player('ytplayer', {
      height: goog.dom.getViewportSize().height - 40,
      width: goog.dom.getViewportSize().width,
      videoId: media.hostId,
      playerVars: {
        'autoplay': 1,
        'controls': 0,
        'showinfo': 0,
        'iv_load_policy': 3,
        'start': seek,
        'modestbranding': 1
      },
      events: {
          'onStateChange': goog.bind(this.playerStateChange_, this),
          'onReady': goog.bind(this.onPlayerReady_, this),
          'onError': goog.bind(this.onPlayerError_, this)
        }
      });
  } else {
    this.player_.loadVideoById(media.hostId, seek);
    goog.Timer.callOnce(goog.bind(function() {
      var tries = opt_tries || 0;
      if (!this.player_.getPlayerState() && tries < 4) {
        this.play(media, seek + retry, ++tries);
      }
    }, this), retry);
  }
};


/**
 * Resize
 */
brkn.Player.prototype.resize = function() {
  var playerEl = goog.dom.getElement('ytplayer');
  var stagecover = goog.dom.getElement('stagecover');
  var message = goog.dom.getElementByClass('message', stagecover)
  var guideHeight = goog.dom.classes.has(goog.dom.getElement('guide'), 'toggled') ? 230 : 0;
  var sidebarWidth = goog.dom.classes.has(goog.dom.getElement('sidebar'), 'toggled')  ? 300 : 0;
  goog.style.setHeight(playerEl, goog.dom.getViewportSize().height - guideHeight - 40);
  goog.style.setWidth(playerEl, goog.dom.getViewportSize().width - sidebarWidth); 
  goog.style.setHeight(stagecover, goog.dom.getViewportSize().height - guideHeight - 40);
  goog.style.setWidth(stagecover, goog.dom.getViewportSize().width - sidebarWidth);
  var messageSize = goog.style.getSize(message);
  goog.style.setStyle(message, {
    'margin-left': -messageSize.width/2 + 'px',
    'margin-top': -messageSize.height/2 + 'px'
  });
};


/**
 * @param {brkn.model.Channel} channel
 */
brkn.Player.prototype.changeChannel = function(channel) {
	var program = channel.getCurrentProgram();
	if (program) {
	  this.currentProgram_ = program;
		this.playProgram(program);
	}
	this.updateStagecover_();
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.Player.prototype.playAsync_ = function(media) {
  this.asyncMedia_ = media;
  this.play(media, 0);
  
  goog.net.XhrIo.send('/_optin', goog.functions.NULL(), 'POST',
      'media_id=' + this.currentProgram_.media.id);
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.playerStateChange_ = function(event) {  
	if (event.data == YT.PlayerState.ENDED) {
	  goog.net.XhrIo.send(
	      '/_seen',
	      goog.functions.NULL(),
	      'POST',
	      'media_id=' + this.currentProgram_.media.id +
	      '&session_id=' + brkn.model.Users.getInstance().currentUser.currentSession.id);
	  
	  var nextProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
	  if (nextProgram) {
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.NEXT_PROGRAM, nextProgram);
      this.currentProgram_ = nextProgram;
      this.playProgram(nextProgram);
    } else {
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
          brkn.model.Channels.getInstance().findOnline());
      if (this.asyncMedia_) {
        this.asyncMedia_ = null;
      } else {
        goog.net.XhrIo.send('/_started', goog.functions.NULL(), 'POST',
            'media_id=' + this.currentProgram_.media.id);
      }
    }
	  this.updateStagecover_();
	}
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerReady_ = function(event) {
  // Do a health check
  goog.Timer.callOnce(goog.bind(function() {
    if (this.player_ && !this.player_.getPlayerState()) {
      this.playProgram(this.currentProgram_);
    }
  }, this), 1000);
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerError_ = function(event) {
  window.console.log(event);
};


/**
 * @private
 */
brkn.Player.prototype.updateStagecover_ = function() {
  var stagecover = goog.dom.getElement('stagecover');
  var seek = this.currentProgram_ ? (goog.now() - this.currentProgram_.time.getTime())/1000 : 0;
  if (!this.currentProgram_ || (this.currentProgram_ && seek > this.currentProgram_.media.duration)) {
    this.resize();
    goog.style.showElement(stagecover, true);
  } else {
    goog.style.showElement(stagecover, false);
  }
};
