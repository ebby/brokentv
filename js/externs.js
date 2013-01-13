var RTMP_HOST;


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

YT.Player.prototype.playVideo;

/** 
 * enum {string} 
 */
YT.PlayerState = {};

YT.PlayerState.ENDED;

var Raphael;

/**
 * @param {?number=} opt_brightness
 */
Raphael.getColor = function(opt_brightness) {};

