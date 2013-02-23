goog.provide('brkn.model.Player');
goog.provide('brkn.model.Player.Actions');

goog.require('goog.net.XhrIo');
goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Player = function() {
  goog.base(this);

  /**
   * @type {YT.Player}
   * @private
   */
  this.player_;

  /**
   * @type {brkn.model.Program}
   * @private
   */
  this.currentProgram_;

  this.subscribe(brkn.model.Player.Actions.PLAY_ASYNC, function(media) {
    brkn.model.Analytics.getInstance().playAsync(media);
  }, this);
};
goog.inherits(brkn.model.Player, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Player);


/**
 * @param {YT.Player} player
 */
brkn.model.Player.prototype.setPlayer = function(player) {
  this.player_ = player;
};


/**
 * @param {brkn.model.Program} program
 */
brkn.model.Player.prototype.setCurrentProgram = function(program) {
  this.currentProgram_ = program;
};


/**
 * @return {brkn.model.Program}
 */
brkn.model.Player.prototype.getCurrentProgram = function() {
  return this.currentProgram_;
};


/**
 * @return {number}
 */
brkn.model.Player.prototype.getCurrentTime = function() {
  return this.player_ && this.player_.getCurrentTime ? this.player_.getCurrentTime() : 0;
};


/**
 * @return {number}
 */
brkn.model.Player.prototype.getProgress = function() {
  return this.player_ && this.player_.getCurrentTime ? this.player_.getCurrentTime() : 0;
};


/**
 * @enum {string}
 */
brkn.model.Player.Actions = {
  PLAY_ASYNC: 'play-async',
  PLAYING: 'playing',
  NO_MEDIA: 'no-media'
};
