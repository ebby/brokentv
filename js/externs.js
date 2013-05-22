var HOST_URL;

var IPHONE;

var IPAD;

var DESKTOP;

var HTML5;

var EMBED;

var appengine = {};

/** 
  * @param {string} token 
  * @constructor 
  */
appengine.Channel = function(token) {};

/** 
 * @param {Object=} opt_handler 
 */ 
appengine.Channel.prototype.open = function(opt_handler) {};


var YT = {};

/** 
 * @param {string} id 
 * @constructor 
 */
YT.Player = function(id, params) {};

/** 
 * @param {string} id 
 * @param {?number=} opt_seek
 */
YT.Player.prototype.loadVideoById = function(id, opt_seek) {};

/**
 * @return {number}
 */
YT.Player.prototype.getPlayerState;

/**
 * @return {number}
 */
YT.Player.prototype.getCurrentTime;

YT.Player.prototype.cueVideoById;
YT.Player.prototype.loadVideoById;
YT.Player.prototype.playVideo;
YT.Player.prototype.pauseVideo;
YT.Player.prototype.seekTo;
YT.Player.prototype.setPlaybackQuality;
YT.Player.prototype.mute;
YT.Player.prototype.unMute;
YT.Player.prototype.isMuted;

/** 
 * enum {string} 
 */
YT.PlayerState = {};

YT.PlayerState.ENDED;
YT.PlayerState.PLAYING;
YT.PlayerState.PAUSED;
YT.PlayerState.CUED;
YT.PlayerState.BUFFERING;

var Raphael;

/**
 * @param {?number=} opt_brightness
 */
Raphael.getColor = function(opt_brightness) {};
