goog.provide('brkn.Player');

goog.require('brkn.model.Channels');
goog.require('brkn.model.Notify');
goog.require('brkn.model.Player');

goog.require('goog.fx.AnimationSerialQueue');
goog.require('goog.fx.dom');
goog.require('goog.fx.easing');
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
 * @type {string}
 * @private
 */
brkn.Player.prototype.playerState_;


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


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.stagecover_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.message_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.spinner_;


/**
 * @type {number}
 * @private
 */
brkn.Player.prototype.width_;


/**
 * @type {number}
 * @private
 */
brkn.Player.prototype.height_;


/** @inheritDoc */
brkn.Player.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.currentChannel_ = brkn.model.Channels.getInstance().currentChannel;
  this.currentProgram_ = this.currentChannel_ && this.currentChannel_.getCurrentProgram();
  var seek = this.currentProgram_ ? (goog.now() - this.currentProgram_.time.getTime())/1000 : 0;
  this.fullscreenEl_ = goog.dom.getElementByClass('fullscreen', this.getElement());
  var expandEl = goog.dom.getElementByClass('expand', this.getElement());
  goog.style.showElement(this.fullscreenEl_, this.supportsFullScreen_());
  this.stagecover_ = goog.dom.getElement('stagecover');
  this.message_ = goog.dom.getElementByClass('message', this.stagecover_);
  this.spinner_ = goog.dom.getElementByClass('spinner', this.stagecover_);
  
  this.updateStagecover_();

  if (this.currentProgram_) {
    this.playProgram(this.currentProgram_);
  } else  {
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
  }
  
  this.getHandler()
      .listen(window, 'resize', goog.bind(this.resize, this))
      .listen(this.fullscreenEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        if (goog.dom.classes.toggle(this.fullscreenEl_, 'full')) {
          var mainEl = goog.dom.getElementByClass('main');
          mainEl.requestFullScreen && mainEl.requestFullScreen();
          mainEl.webkitRequestFullScreen && mainEl.webkitRequestFullScreen();
          mainEl.mozRequestFullScreen && mainEl.mozRequestFullScreen();
        } else {
          document.cancelFullScreen && document.cancelFullScreen();
          document.webkitCancelFullScreen && document.webkitCancelFullScreen();
          document.mozCancelFullScreen && document.mozCancelFullScreen();
        }
        e.stopPropagation();
        e.preventDefault();
      }, this))
      .listen(this.getElement(), goog.events.EventType.DBLCLICK, goog.bind(this.toggleExpand_, this))
      .listen(expandEl, goog.events.EventType.CLICK, goog.bind(this.toggleExpand_, this))
      .listen(this.getElement(), goog.events.EventType.MOUSEMOVE, goog.bind(function(e) {
        var xPer = e.offsetX/this.height_;
        var yPer = e.offsetY/this.width_;
        if (xPer > .7 && xPer < .9 && yPer > .7 && yPer < .9 &&
            (this.playerState_ == YT.PlayerState.PLAYING ||
             this.playerState_ == YT.PlayerState.PAUSED)) {
          // Pass click through to flash to kill possible advertisement
          goog.style.showElement(this.stagecover_, false);
          goog.Timer.callOnce(goog.bind(function() {
            // Re-enable after period, can't detect mousemove or clicks on flash
            goog.style.showElement(this.stagecover_, true);
          }, this), 500);
        }
      }, this))
      .listen(this.getElement(), goog.events.EventType.CLICK, goog.bind(function(e) {
        if (e.offsetX > goog.style.getSize(this.getElement()).width/2 &&
            e.offsetY > goog.style.getSize(this.getElement()).height/2) {
          
          return; 
        }
        if (this.player_ && this.player_.getPlayerState) {
          switch (this.player_.getPlayerState()) {
            case YT.PlayerState.PLAYING:
              brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, false);
              break;
            case YT.PlayerState.PAUSED:
              brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, true);
              break;
          }
        }
      }, this));
  
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
			this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      function(program) {
        this.currentProgram_ = program;
        this.playProgram(program);
        this.updateStagecover_();
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.SEEK,
      this.seek_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.BEFORE_END,
      function() {
        this.updateStagecover_(undefined, true);
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.resize(show);
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      function(show) {
        goog.Timer.callOnce(goog.bind(this.resize, this));
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.PLAY,
      function(play) {
        play ? this.player_.playVideo() : this.player_.pauseVideo();
        var el = goog.dom.getElementByClass(play ? 'play' : 'pause', this.getElement());
        var queue = new goog.fx.AnimationSerialQueue();
        queue.add(new goog.fx.dom.FadeInAndShow(el, 250, goog.fx.easing.easeOut));
        queue.add(new goog.fx.dom.FadeOutAndHide(el, 250, goog.fx.easing.easeIn));
        queue.play();
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.MUTE,
      function(mute) {
        this.player_ && (mute ? this.player_.mute() : this.player_.unMute());
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.RESTART,
      function() {
        this.player_.seekTo(0);
      }, this);
  
  this.resize();
};


/**
 * Supports full screen
 * @return {boolean}
 * @private
 * @suppress {checkTypes}
 */
brkn.Player.prototype.supportsFullScreen_ = function() {
  var mainEl = goog.dom.getElementByClass('main');
  return !!(mainEl.requestFullScreen || mainEl.webkitRequestFullScreen ||
      mainEl.mozRequestFullScreen);
};


/**
 * @return {boolean}
 * @private
 * @suppress {checkTypes}
 */
brkn.Player.prototype.isFullScreen_ = function() {
  return this.supportsFullScreen_ &&
      (document.fullScreen || document.webkitIsFullScreen || document.mozfullScreen);
};


/**
 * Toggle UI expansion
 * @param {Event} e
 * @private
 */
brkn.Player.prototype.toggleExpand_ = function(e) {
  e.preventDefault();
  e.stopPropagation();
  var show = !brkn.model.Sidebar.getInstance().toggled();
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, show);
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_GUIDE, show);
};


/**
 * Play a program
 * @param {brkn.model.Program} program
 */
brkn.Player.prototype.playProgram = function(program) {
  brkn.model.Player.getInstance().setCurrentProgram(program);
  brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
      'Now Playing', program.media.name, undefined, program.media.thumbnail1,
      '#info:' + program.media.id);
  this.play(program.media);
};


/**
 * Play
 * @param {brkn.model.Media} media
 * @param {?number=} opt_tries
 */
brkn.Player.prototype.play = function(media, opt_tries) {
  var retry = 1000;

  if (!this.player_ || !this.player_.loadVideoById) {
    this.player_ = new YT.Player('ytplayer', {
      'height': goog.dom.getViewportSize().height - 40,
      'width': goog.dom.getViewportSize().width,
      'videoId': media.hostId,
      'playerVars': {
        'controls': 0,
        'showinfo': 0,
        'iv_load_policy': 3,
        'modestbranding': 1,
        'wmode': 'opaque'
      },
      'events': {
          'onStateChange': goog.bind(this.playerStateChange_, this),
          'onReady': goog.bind(this.onPlayerReady_, this),
          'onError': goog.bind(this.onPlayerError_, this)
        }
      });
    brkn.model.Player.getInstance().setPlayer(this.player_);
  } else {
    this.player_.cueVideoById(media.hostId);
    goog.Timer.callOnce(goog.bind(function() {
      var tries = opt_tries || 0;
      if (!this.player_.getPlayerState() && tries < 4) {
        this.play(media, ++tries);
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
  var guideHeight = goog.dom.getElement('guide').style.height;
  guideHeight = guideHeight.substring(0, guideHeight.length - 2);
  var sidebarWidth = goog.dom.classes.has(goog.dom.getElement('sidebar'), 'toggled')  ? 300 : 0;
  this.width_ = goog.dom.getViewportSize().height - guideHeight;
  this.height_ = goog.dom.getViewportSize().width - sidebarWidth;
  goog.style.setHeight(playerEl, goog.dom.getViewportSize().height - guideHeight);
  goog.style.setWidth(playerEl, goog.dom.getViewportSize().width - sidebarWidth); 
  goog.style.setHeight(stagecover, goog.dom.getViewportSize().height - guideHeight);
  goog.style.setWidth(stagecover, goog.dom.getViewportSize().width - sidebarWidth);
  var messageSize = goog.style.getSize(message);
  goog.style.setStyle(message, {
    'margin-left': -messageSize.width/2 + 'px',
    'margin-top': -messageSize.height/2 + 'px'
  });
  goog.dom.classes.enable(this.fullscreenEl_, 'full', this.isFullScreen_());
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
 * @param {brkn.model.Program} program
 * @private
 */
brkn.Player.prototype.playAsync_ = function(program) {
  this.currentProgram_ = program;
  this.playProgram(program);
  this.updateStagecover_();

  goog.net.XhrIo.send('/_optin', goog.functions.NULL(), 'POST',
      'media_id=' + this.currentProgram_.media.id);
};


/**
 * @param {number} seek
 * @private
 */
brkn.Player.prototype.seek_ = function(seek) {
  this.player_.seekTo && this.player_.seekTo(seek, true);
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.playerStateChange_ = function(event) {
  this.playerState_ = event.data;
  this.updateStagecover_();
  switch (event.data) {
    case YT.PlayerState.CUED:
      window.console.log()
      var seek = this.currentProgram_.async ? this.currentProgram_.seek :
          (goog.now() - this.currentProgram_.time.getTime())/1000;
      this.player_.seekTo(seek);
      this.player_.playVideo();
      brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, true);
      break;
    case YT.PlayerState.PLAYING:
      brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAYING,
          this.currentProgram_.media);
      break;
    case YT.PlayerState.ENDED:
  	  brkn.model.Users.getInstance().currentUser.currentSession.seen(this.currentProgram_.media);
  	  
  	  var nextProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
  	  if (nextProgram) {
        brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.NEXT_PROGRAM,
            nextProgram);
      } else {
        brkn.model.Player.getInstance().setCurrentProgram(null);
        window.console.log(brkn.model.Channels.getInstance().findOnline());
        brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
            brkn.model.Channels.getInstance().findOnline(), true);
      }
  	  break;
	}
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerReady_ = function(event) {
  // Do a health check
  goog.Timer.callOnce(goog.bind(function() {
    if (this.player_ && (!this.player_.getPlayerState || !this.player_.getPlayerState())) {
      // In case we didn't load
      this.playProgram(this.currentProgram_);
    } else if (this.player_.getPlayerState()) {
      // If we did and cued the video
      var seek = this.currentProgram_.async ? this.currentProgram_.seek :
          (goog.now() - this.currentProgram_.time.getTime())/1000;
      this.player_.seekTo(seek);
      this.player_.playVideo();
    }
  }, this), 1000);
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerError_ = function(event) {
  goog.DEBUG && window.console.log(event);
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
};


/**
 * @param {?string=} opt_message
 * @param {?boolean=} opt_beforeEnd
 * @private
 */
brkn.Player.prototype.updateStagecover_ = function(opt_message, opt_beforeEnd) {
  var stagecover = goog.dom.getElement('stagecover');
//  var seek = this.currentProgram_ ? (goog.now() - this.currentProgram_.time.getTime())/1000 : 0;
  var seek = this.currentProgram_ ? brkn.model.Player.getInstance().getCurrentTime() : 0;
  if (!this.currentProgram_ || (this.currentProgram_ && seek > this.currentProgram_.media.duration)) {
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
    goog.dom.setTextContent((/** @type {Element} */ this.message_.firstChild),
        brkn.Player.Messages.OFFLINE);
    goog.style.showElement(this.spinner_, false);
    goog.dom.classes.add(stagecover, 'covered');
  } else if ((this.playerState_ != YT.PlayerState.PLAYING &&
      this.playerState_ != YT.PlayerState.PAUSED) || opt_beforeEnd) {
    goog.dom.setTextContent((/** @type {Element} */ this.message_.firstChild),
        brkn.Player.Messages.LOADING);
    goog.style.showElement(this.spinner_, true);
    goog.dom.classes.add(stagecover, 'covered');
  } else {
    goog.style.showElement(this.spinner_, false);
    goog.dom.classes.remove(stagecover, 'covered');
  }
  goog.style.setOpacity(stagecover, this.playerState_ == YT.PlayerState.BUFFERING ? .9 : 1);
  this.resize();
};


brkn.Player.Messages = {
  OFFLINE: 'THIS CHANNEL IS CURRENTLY OFFLINE',
  LOADING: 'LOADING STORY'
};
