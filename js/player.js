goog.provide('brkn.Player');

goog.require('brkn.model.Channels');

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


/** @inheritDoc */
brkn.Player.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var currentChannel = brkn.model.Channels.getInstance().currentChannel;
  this.currentProgram_ = currentChannel && currentChannel.getCurrentProgram();
  var seek = this.currentProgram_ ? (goog.now() - this.currentProgram_.time.getTime())/1000 : 0;
  this.player_ = new YT.Player('ytplayer', {
    height: goog.dom.getViewportSize().height - 40,
    width: goog.dom.getViewportSize().width,
    videoId: this.currentProgram_ ? this.currentProgram_.media.hostId : '',
    playerVars: {
  	  'autoplay': 1,
  	  'controls': 0,
  	  'showinfo': 0,
  	  'iv_load_policy': 3,
  	  'start': seek,
  	  'modestbranding': 1
  	},
    events: {
        'onStateChange': goog.bind(this.playerStateChange_, this)
      }
	  });
  
  this.getHandler()
      .listen(window, 'resize', this.resize);
  
  brkn.model.Channels.getInstance().subscribe(brkn.model.Channels.Action.CHANGE_CHANNEL,
			this.changeChannel, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_SIDEBAR,
      function(show) {
        this.resize(show);
      }, this);
  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_GUIDE,
      function(show) {
        this.resize(undefined, show);
      }, this);
};


/**
 * Resize
 */
brkn.Player.prototype.resize = function(opt_showSidebar, opt_showGuide) {
  var playerEl = goog.dom.getElement('ytplayer');
  var guideHeight = goog.dom.classes.has(goog.dom.getElement('guide'), 'toggled') ? 230 : 0;
  var sidebarWidth = goog.dom.classes.has(goog.dom.getElement('sidebar'), 'toggled')  ? 300 : 0;
  goog.style.setHeight(playerEl, goog.dom.getViewportSize().height - guideHeight - 40);
  goog.style.setWidth(playerEl, goog.dom.getViewportSize().width - sidebarWidth); 
};


/**
 * @param {brkn.model.Channel} channel
 */
brkn.Player.prototype.changeChannel = function(channel) {
	var program = channel.getCurrentProgram();
	if (program) {
	  this.currentProgram_ = program;
		var seek = (goog.now() - program.time.getTime())/1000;
		this.player_.loadVideoById(program.media.hostId, seek);
	}
};


/**
 * @param {Event} event
 */
brkn.Player.prototype.playerStateChange_ = function(event) {
	if (event.data == YT.PlayerState.ENDED) {
//	  goog.net.XhrIo.send(
//	      '/_seen',
//	      goog.functions.NULL(),
//	      'POST',
//	      'id=' + this.currentProgram_.media.id);
		var nextProgram = brkn.model.Channels.getInstance().currentChannel.getNextProgram();
		if (nextProgram) {
			this.player_.loadVideoById(nextProgram.media.hostId);
		}
	}
};
