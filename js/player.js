goog.provide('brkn.Player');

goog.require('brkn.model.Channels');
goog.require('brkn.model.Notify');
goog.require('brkn.model.Player');
goog.require('brkn.player');

goog.require('goog.fx.AnimationSerialQueue');
goog.require('goog.fx.dom');
goog.require('goog.fx.easing');
goog.require('goog.net.Jsonp');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');


/**
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Player = function() {
	goog.base(this);
	
	/**
	 * @type {boolean}
	 * @private
	 */
	this.nexted_ = false;
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
 * @type {Element}
 * @private
 */
brkn.Player.prototype.restart_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.vote_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.likeEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.dislikeEl_;


/**
 * @type {Element}
 * @private
 */
brkn.Player.prototype.sendSuggestionsEl_;


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

/**
 * @type {string}
 * @private
 */
brkn.Player.prototype.lastNote_;


/**
 * @type {?string}
 * @private
 */
brkn.Player.prototype.redditId_;

/**
 * @type {string}
 * @private
 */
brkn.Player.prototype.redditModhash_;


/** @inheritDoc */
brkn.Player.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.currentChannel_ = brkn.model.Channels.getInstance().currentChannel;
  brkn.model.Player.getInstance().setCurrentProgram(this.currentChannel_ && this.currentChannel_.getCurrentProgram());
  var seek = brkn.model.Player.getInstance().getCurrentProgram() ?
      (goog.now() - brkn.model.Player.getInstance().getCurrentProgram().time.getTime())/1000 : 0;
  this.fullscreenEl_ = goog.dom.getElementByClass('fullscreen', this.getElement());
  var expandEl = goog.dom.getElementByClass('expand', this.getElement());
  goog.style.showElement(this.fullscreenEl_, this.supportsFullScreen_());
  this.stagecover_ = goog.dom.getElement('stagecover');
  this.message_ = goog.dom.getElementByClass('message', this.stagecover_);
  this.spinner_ = goog.dom.getElementByClass('spinner', this.stagecover_);
  this.restart_ = goog.dom.getElementByClass('restart', this.stagecover_);
  this.vote_ = goog.dom.getElementByClass('vote', this.getElement());
  this.likeEl_ = goog.dom.getElementByClass('like', this.getElement());
  this.dislikeEl_ = goog.dom.getElementByClass('dislike', this.getElement());
  this.sendSuggestionsEl_ = goog.dom.getElementByClass('send-suggestions', this.getElement());
  var keyHandler = new goog.events.KeyHandler(document);
  
  this.updateStagecover_();

  if (brkn.model.Player.getInstance().getCurrentProgram()) {
    if (DESKTOP || this.currentChannel_.myChannel) {
      this.playProgram(brkn.model.Player.getInstance().getCurrentProgram());
    }
  } else  {
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
  }
  
  this.getHandler()
      .listen(window, 'resize', goog.bind(this.resize, this))
      .listen(document, 'webkitfullscreenchange', goog.bind(function(e) {
        goog.dom.classes.toggle(this.fullscreenEl_, 'full');
      }, this))
      .listen(document, 'mozfullscreenchange', goog.bind(function(e) {
        goog.dom.classes.toggle(this.fullscreenEl_, 'full');
      }, this))
      .listen(document, 'fullscreenchange', goog.bind(function(e) {
        goog.dom.classes.toggle(this.fullscreenEl_, 'full');
      }, this))
      .listen(this.fullscreenEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        if (!goog.dom.classes.has(this.fullscreenEl_, 'full')) {
          var mainEl = goog.dom.getElementByClass('main');
          mainEl.requestFullScreen && mainEl.requestFullScreen();
          mainEl.webkitRequestFullScreen && mainEl.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
          mainEl.mozRequestFullScreen && mainEl.mozRequestFullScreen();
        } else {
          document.cancelFullScreen && document.cancelFullScreen();
          document.webkitCancelFullScreen && document.webkitCancelFullScreen();
          document.mozCancelFullScreen && document.mozCancelFullScreen();
        }
        e.stopPropagation();
        e.preventDefault();
      }, this))
      .listen(expandEl, goog.events.EventType.CLICK, goog.bind(this.toggleExpand_, this))
      .listen(this.getElement(), goog.events.EventType.MOUSEMOVE, goog.bind(function(e) {
        var xPer = e.offsetX/this.height_;
        var yPer = e.offsetY/this.width_;
        if (xPer > .6 && xPer < 1 && yPer > .7 && yPer < 1 &&
            (this.playerState_ == YT.PlayerState.PLAYING ||
             this.playerState_ == YT.PlayerState.PAUSED)) {
          // Pass click through to flash to kill possible advertisement
          goog.dom.classes.add(this.stagecover_, 'click-through');
          goog.Timer.callOnce(goog.bind(function() {
            // Re-enable after period, can't detect mousemove or clicks on flash
            goog.dom.classes.remove(this.stagecover_, 'click-through');
          }, this), 500);
        }
      }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            if (e.keyCode == '32' && e.target.tagName != 'INPUT' && e.target.tagName != 'TEXTAREA') {
              this.togglePlayback_();
            }
          }, this))
      .listen(this.stagecover_, goog.events.EventType.CLICK, goog.bind(function(e) {
        if (goog.dom.classes.has(goog.dom.getElement('queue'), 'show') ||
            goog.dom.classes.has(goog.dom.getElement('search'), 'show') ||
            goog.dom.getAncestorByClass(e.target, 'queue') ||
            goog.dom.getAncestorByClass(e.target, 'search')) {
          return;
        }
        this.togglePlayback_();
      }, this));
  
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.CHANGE_CHANNEL,
			this.changeChannel, this);
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Actions.NEXT_PROGRAM,
      function(program) {
        this.playProgram(program);
        this.updateStagecover_();
        
        if (brkn.model.Users.getInstance().currentUser.loggedIn) {
          goog.net.XhrIo.send('/_play', goog.functions.NULL(), 'POST',
              'media_id=' + program.media.id +
              '&channel_id=' + brkn.model.Channels.getInstance().currentChannel.id);
        }
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAY_ASYNC,
      this.playAsync_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.SEEK,
      this.seek_, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.TEN_SECONDS,
      function() {
        if (brkn.model.Users.getInstance().currentUser.loggedIn) {
          this.sendSuggestions_();
        }
      }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.BEFORE_END,
      function() {
        // TODO: fade in
        this.updateStagecover_(undefined, true);
        if (brkn.model.Users.getInstance().currentUser.loggedIn &&
            brkn.model.Users.getInstance().currentUser.currentSession &&
            brkn.model.Player.getInstance().getCurrentProgram()) {
          brkn.model.Users.getInstance().currentUser.currentSession.seen(
              brkn.model.Player.getInstance().getCurrentProgram().media);
        }
        this.resetLike_();
        brkn.model.Player.getInstance().getCurrentProgram().ended = true;
        this.next_();
      }, this);
  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.LOGGED_IN, function() {
    this.fetchLike_(brkn.model.Player.getInstance().getCurrentProgram().media);
  }, this);
  
  if (DESKTOP) {
    this.getHandler()
        .listen(this.restart_, goog.events.EventType.CLICK, goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation()
          if (brkn.model.Player.getInstance().getCurrentProgram()) {
            this.playProgram(brkn.model.Player.getInstance().getCurrentProgram());
          }
        }, this))
        .listen(this.likeEl_, goog.events.EventType.CLICK,
            goog.bind(this.onLike_, this, this.likeEl_, true))
        .listen(this.dislikeEl_, goog.events.EventType.CLICK,
            goog.bind(this.onLike_, this, this.dislikeEl_, false));
    
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
  }
  
  this.resize();
};


/**
 * @private
 */
brkn.Player.prototype.togglePlayback_ = function() {
  if (this.player_ && this.player_.getPlayerState && DESKTOP) {
    switch (this.player_.getPlayerState()) {
      case YT.PlayerState.PLAYING:
        brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, false);
        break;
      case YT.PlayerState.PAUSED:
        brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, true);
        break;
    }
  }
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
  if (DESKTOP) {
    brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_SIDEBAR, show);
    brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.TOGGLE_GUIDE, show);
  }
};


/**
 * Play a program
 * @param {brkn.model.Program} program
 */
brkn.Player.prototype.playProgram = function(program) {
  brkn.model.Player.getInstance().setCurrentProgram(program);
  if (this.lastNote_ != program.id) {
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'Now playing', program.media.name, undefined, program.media.thumbnail1,
        '#info:' + program.media.id);
    this.lastNote_ = program.id;
  }
  this.play(program.media);
  if (DESKTOP && brkn.model.Users.getInstance().currentUser.loggedIn) {
    this.fetchLike_(program.media);
    goog.style.showElement(this.sendSuggestionsEl_, false);
  } else {
    goog.style.showElement(this.likeEl_, false);
    goog.style.showElement(this.dislikeEl_, false);
  }
  
  if (brkn.model.Channels.getInstance().currentChannel.id == 'reddit' ||
      program.media.redditId) {
    this.fetchReddit_(program);
  } else {
    this.redditId_ = null;
    goog.style.showElement(goog.dom.getElementByClass('reddit', this.vote_), false);
  }
};


/**
 * @param {brkn.model.Program} program
 * @private
 */
brkn.Player.prototype.fetchReddit_ = function(program) {
  goog.style.showElement(goog.dom.getElementByClass('reddit', this.vote_), false);
  var jsonp = new goog.net.Jsonp('http://www.reddit.com/api/info.json', 'jsonp');
  jsonp.send((program.media.redditId ? {'id': program.media.redditId} :
      {'url' : 'www.youtube.com/watch?v=' + program.media.hostId}), goog.bind(function(response) {
    if (response['data'] && response['data']['children'].length) {
      goog.style.showElement(goog.dom.getElementByClass('reddit', this.vote_), true);
      this.redditId_ = response['data']['children'][0]['kind'] + '_' + response['data']['children'][0]['data']['id'];
      this.redditModhash = response['data']['modhash'];
      var score = response['data']['children'][0]['data']['score'];
      goog.dom.setTextContent(goog.dom.getElementByClass('score', this.vote_), score);
      goog.dom.getElementByClass('reddit-link', this.vote_).href =
          'http://www.reddit.com' + response['data']['children'][0]['data']['permalink'];
      
    }
  }, this));
};


/**
 * Play a program
 * @param {brkn.model.Channel} channel
 */
brkn.Player.prototype.playChannel = function(channel) {
  var program = channel.getCurrentProgram();
  brkn.model.Player.getInstance().setCurrentProgram(program);
  if (this.lastNote_ != program.id) {
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'Now playing', program.media.name, undefined, program.media.thumbnail1,
        '#info:' + program.media.id);
    this.lastNote_ = program.id;
  }
  this.play(undefined, channel);
  if (DESKTOP) {
    this.fetchLike_(program.media);
  }
};


/**
 * Play
 * @param {?brkn.model.Media=} opt_media
 * @param {?brkn.model.Channel=} opt_channel
 * @param {?number=} opt_tries
 */
brkn.Player.prototype.play = function(opt_media, opt_channel, opt_tries) {
  var retry = 1000;
  var seek = brkn.model.Player.getInstance().getCurrentProgram().async ?
      brkn.model.Player.getInstance().getCurrentProgram().seek :
      (goog.now() - brkn.model.Player.getInstance().getCurrentProgram().time.getTime())/1000;

  if (!this.player_ || !this.player_.loadVideoById) {
    var playerVars = {
      'controls': 0,
      'showinfo': 0,
      'iv_load_policy': 3,
      'modestbranding': 1,
      'wmode': 'opaque',
      'origin': HOST_URL,
      'enablejsapi': 1,
      'rel': 0,
      'html5': HTML5 ? 1 : 0
    };
    this.player_ = new YT.Player('ytplayer', {
      'height': goog.dom.getViewportSize().height - 40,
      'width': goog.dom.getViewportSize().width,
      'videoId': opt_media ? opt_media.hostId : null,
      'playerVars': playerVars,
      'events': {
          'onStateChange': goog.bind(this.playerStateChange_, this),
          'onReady': goog.bind(this.onPlayerReady_, this),
          'onError': goog.bind(this.onPlayerError_, this)
        }
      });
    brkn.model.Player.getInstance().setPlayer(this.player_);
  } else {
    if (opt_media) {
      this.player_.cueVideoById(opt_media.hostId, undefined, 'large');
    } else if (opt_channel) {
      this.player_.cuePlaylist(opt_channel.asPlaylist(), opt_channel.currentProgramIndex);
    }
  }
};


/**
 * Resize
 */
brkn.Player.prototype.resize = function() {
  if (IPHONE) {
    goog.style.setWidth(this.getElement(), goog.dom.getViewportSize().width - 320); 
    return;
  }
  var stagecover = goog.dom.getElement('stagecover');
  var message = goog.dom.getElementByClass('message', stagecover)
  var guideHeight = goog.dom.getElement('guide').style.height;
  guideHeight = guideHeight.substring(0, guideHeight.length - 2);
  guideHeight = brkn.model.Controller.getInstance().guideToggled ? guideHeight : 40;
  var sidebarWidth = brkn.model.Controller.getInstance().sidebarToggled ? 320 : 0;
  this.width_ = goog.dom.getViewportSize().height - guideHeight;
  this.height_ = goog.dom.getViewportSize().width - sidebarWidth;
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - guideHeight);
  goog.style.setWidth(this.getElement(), goog.dom.getViewportSize().width - sidebarWidth); 
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
	  this.playProgram(program);
	  
	  if (brkn.model.Users.getInstance().currentUser.loggedIn) {
  	  goog.net.XhrIo.send('/_play', goog.functions.NULL(), 'POST',
  	      'media_id=' + program.media.id +
  	      '&channel_id=' + brkn.model.Channels.getInstance().currentChannel.id);
	  }
	}
	this.updateStagecover_();
};



/**
 * @private
 */
brkn.Player.prototype.resetLike_ = function() {
  goog.dom.classes.enable(this.likeEl_, 'checked', false);
  goog.dom.classes.enable(this.dislikeEl_, 'checked', false);
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.Player.prototype.fetchLike_ = function(media) {
  goog.style.showElement(this.likeEl_, true);
  goog.style.showElement(this.dislikeEl_, true);
  goog.net.XhrIo.send('/_like/' + media.id, goog.bind(function(e) {
    var response = e.target.getResponseJson();
    goog.dom.classes.enable(this.likeEl_, 'checked', response['liked'] ||
        goog.dom.classes.has(this.likeEl_, 'checked'));
    goog.dom.classes.enable(this.dislikeEl_, 'checked', response['disliked'] ||
        goog.dom.classes.has(this.dislikeEl_, 'checked'));
  }, this));
};


/**
 * @param {Element} el
 * @param {boolean} like
 * @param {Event} e
 * @private
 */
brkn.Player.prototype.onLike_ = function(el, like, e) {
  e.preventDefault();
  e.stopPropagation();
  if (brkn.model.Player.getInstance().getCurrentProgram()) {
    var checked = goog.dom.classes.toggle(el, 'checked');
    var flip = (like && goog.dom.classes.has(this.dislikeEl_, 'checked')) ||
        (!like && goog.dom.classes.has(this.likeEl_, 'checked'));
    if (flip) {
      goog.dom.classes.remove((like ? this.dislikeEl_ : this.likeEl_), 'checked');
    }
    goog.net.XhrIo.send((like ? '/_like' : '/_dislike'), undefined, 'POST',
        'media_id=' + brkn.model.Player.getInstance().getCurrentProgram().media.id +
        (!checked ? '&delete=1' : '') +
        (flip ? '&flip=1' : '') +
        (this.redditId_ ? '&reddit_id=' + this.redditId_ + '&modhash=' + this.redditModhash_ : ''));
    
//    var scoreEl = goog.dom.getElementByClass('score', this.vote_);
//    if (goog.dom.getTextContent(scoreEl)) {
//      var weight = flip ? 2 : 1;
//      weight = checked ? weight : -weight;
//      var score = parseInt(goog.dom.getTextContent(scoreEl)) + (like ? weight : -weight);
//      goog.dom.setTextContent(scoreEl, score);
//    }
  }
};


/**
 * @param {brkn.model.Program} program
 * @private
 */
brkn.Player.prototype.playAsync_ = function(program) {
  this.playProgram(program);
  this.updateStagecover_();

  if (brkn.model.Users.getInstance().currentUser.loggedIn) {
    goog.net.XhrIo.send('/_play', goog.functions.NULL(), 'POST',
        'media_id=' + program.media.id +
        '&channel_id=' + brkn.model.Channels.getInstance().currentChannel.id);
    goog.net.XhrIo.send('/_optin', goog.functions.NULL(), 'POST',
        'media_id=' + program.media.id);
  }
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
      var seek = brkn.model.Player.getInstance().getCurrentProgram().async ?
          brkn.model.Player.getInstance().getCurrentProgram().seek :
            brkn.model.Controller.getInstance().timeless ? 0 :
              (goog.now() - brkn.model.Player.getInstance().getCurrentProgram().time.getTime())/1000;
      DESKTOP && this.player_.seekTo(seek);
      this.player_.playVideo();
      brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, true);
      
      break;
    case YT.PlayerState.PLAYING:
      this.nexted_ = false;
      brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAYING,
          brkn.model.Player.getInstance().getCurrentProgram().media);
      break;
    case YT.PlayerState.ENDED:
      if (brkn.model.Users.getInstance().currentUser.loggedIn &&
          brkn.model.Users.getInstance().currentUser.currentSession &&
          brkn.model.Player.getInstance().getCurrentProgram()) {
        brkn.model.Users.getInstance().currentUser.currentSession.seen(
            brkn.model.Player.getInstance().getCurrentProgram().media);
      }
  	  this.resetLike_();
  	  brkn.model.Player.getInstance().getCurrentProgram().ended = true;
  	  this.next_();
  	  break;
	}
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerReady_ = function(event) {
  this.player_.setPlaybackQuality('large');
  var seek = brkn.model.Player.getInstance().getCurrentProgram().async ?
      brkn.model.Player.getInstance().getCurrentProgram().seek :
        brkn.model.Controller.getInstance().timeless ? 0 :
          (goog.now() - brkn.model.Player.getInstance().getCurrentProgram().time.getTime())/1000;
  this.player_.seekTo(seek);
  this.player_.playVideo();
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.MUTE,
      this.player_.isMuted());
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.onPlayerError_ = function(event) {
  goog.DEBUG && window.console.log(event);
  if (event == 100) {
    this.next_();
  } else {
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
    this.updateStagecover_(undefined, undefined, true);
  }
};


/**
 * @param {?string=} opt_message
 * @param {?boolean=} opt_beforeEnd
 * @param {?boolean=} opt_restart
 * @private
 */
brkn.Player.prototype.updateStagecover_ = function(opt_message, opt_beforeEnd, opt_restart) {
  if (IPHONE) {
    return;
  }
  
  var stagecover = goog.dom.getElement('stagecover');
  var seek = brkn.model.Player.getInstance().getCurrentProgram() ?
      brkn.model.Player.getInstance().getCurrentTime() : 0;
  
  if (opt_restart) {
    goog.style.showElement(this.spinner_, false);
    goog.style.showElement(this.restart_, true);
    goog.dom.classes.add(stagecover, 'covered');
    return;
  }
  
  if (!brkn.model.Player.getInstance().getCurrentProgram() || (brkn.model.Player.getInstance().getCurrentProgram() &&
      seek > brkn.model.Player.getInstance().getCurrentProgram().media.duration)) {
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.NO_MEDIA);
    goog.dom.setTextContent((/** @type {Element} */ this.message_.firstChild),
        brkn.Player.Messages.OFFLINE);
    goog.style.showElement(this.spinner_, false);
    goog.style.showElement(this.restart_, false);
    goog.style.showElement(this.vote_, false);
    goog.dom.classes.add(stagecover, 'covered');
  } else if (((this.playerState_ == YT.PlayerState.PLAYING && this.player_.getCurrentTime() > 0) ||
      this.playerState_ == YT.PlayerState.PAUSED && this.player_.getCurrentTime() > 0) && !opt_beforeEnd) {
    goog.style.showElement(this.spinner_, false);
    goog.style.showElement(this.restart_, false);
    goog.dom.classes.remove(stagecover, 'covered');
    goog.style.showElement(this.vote_, brkn.model.Users.getInstance().currentUser.loggedIn ||
        brkn.model.Channels.getInstance().currentChannel.id == 'reddit' ||
        brkn.model.Player.getInstance().getCurrentProgram().media.redditId);
  } else {
    goog.dom.setTextContent((/** @type {Element} */ this.message_.firstChild),
        brkn.Player.Messages.LOADING);
    goog.style.showElement(this.spinner_, true);
    goog.style.showElement(this.restart_, false);
    goog.style.showElement(this.vote_, brkn.model.Users.getInstance().currentUser.loggedIn ||
        brkn.model.Channels.getInstance().currentChannel.id == 'reddit' ||
        brkn.model.Player.getInstance().getCurrentProgram().media.redditId);
    goog.dom.classes.add(stagecover, 'covered');
    
    if (this.playerState_ == YT.PlayerState.PLAYING) {
      goog.Timer.callOnce(goog.bind(function() {
        this.updateStagecover_();
      }, this), 500);
    }
  }
  goog.style.setOpacity(stagecover, this.playerState_ == YT.PlayerState.BUFFERING ? .9 : 1);
  this.resize();
};


brkn.Player.prototype.next_ = function() {
  if (!this.nexted_) {
    var nextProgram = brkn.model.Channels.getInstance().currentChannel.getCurrentProgram();
    if (nextProgram) {
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.NEXT_PROGRAM,
          nextProgram);
    } else {
      brkn.model.Player.getInstance().setCurrentProgram(null);
      brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
          brkn.model.Channels.getInstance().findOnline(), true);
    }
    this.nexted_ = true;
  }
};


brkn.Player.prototype.sendSuggestions_ = function() {
  if (goog.style.isElementShown(this.sendSuggestionsEl_)) {
    return;
  }
  var users = goog.object.getKeys(brkn.model.Users.getInstance().userMap);
  var index1 = Math.floor(Math.random() * (users.length - 1));
  var index2 = Math.floor(Math.random() * (users.length - 1));
  var user1 = brkn.model.Users.getInstance().userMap[users[index1]];
  var user2 = brkn.model.Users.getInstance().userMap[users[index2]];

  var suggestion1 = soy.renderAsElement(brkn.player.sendSuggestion, {
    id: user1.id,
    name: user1.name
  });
  
  var suggestion2 = soy.renderAsElement(brkn.player.sendSuggestion, {
    id: user2.id,
    name: user2.name
  });
  
  var suggestionsEl = goog.dom.getElement('send-suggestions');
  suggestionsEl.innerHTML = '';
  goog.dom.appendChild(suggestionsEl, suggestion1);
  goog.dom.appendChild(suggestionsEl, suggestion2);
  goog.style.showElement(this.sendSuggestionsEl_, true);
  
  this.getHandler()
      .listen(suggestion1, goog.events.EventType.CLICK, goog.bind(function() {
        goog.dom.classes.add(suggestion1, 'sent');

        var message = new brkn.model.Message({
          'from_user': brkn.model.Users.getInstance().currentUser,
          'to_user': user1,
          'text': 'Sent you a video!',
          'media': brkn.model.Player.getInstance().getCurrentProgram().media
        });
        message.time = new goog.date.DateTime();
        message.relativeTime = goog.date.relative.format(message.time.getTime()) 
        brkn.model.Users.getInstance().publish(brkn.model.Users.Action.NEW_MESSAGE, message);
        
        goog.net.XhrIo.send(
            '/_message',
            goog.functions.NULL(),
            'POST',
            'from_id=' + brkn.model.Users.getInstance().currentUser.id + 
            '&to_id=' + message.toUser.id + '&text=' + message.text +
            '&media_id=' + message.media.id);
      }, this))
      .listen(suggestion2, goog.events.EventType.CLICK, goog.bind(function() {
        goog.dom.classes.add(suggestion2, 'sent');
        var message = new brkn.model.Message({
          'from_user': brkn.model.Users.getInstance().currentUser,
          'to_user': user2,
          'text': 'Sent you a video!',
          'media': brkn.model.Player.getInstance().getCurrentProgram().media
        });
        message.time = new goog.date.DateTime();
        message.relativeTime = goog.date.relative.format(message.time.getTime()) 
        brkn.model.Users.getInstance().publish(brkn.model.Users.Action.NEW_MESSAGE, message);
        
        goog.net.XhrIo.send(
            '/_message',
            goog.functions.NULL(),
            'POST',
            'from_id=' + brkn.model.Users.getInstance().currentUser.id + 
            '&to_id=' + message.toUser.id + '&text=' + message.text +
            '&media_id=' + message.media.id);
      }, this))
};


brkn.Player.Messages = {
  OFFLINE: 'THIS CHANNEL IS CURRENTLY OFFLINE',
  LOADING: 'LOADING STORY'
};
