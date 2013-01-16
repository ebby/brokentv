goog.provide('brkn.model.Tweet');


/**
 * @param {Object} tweet Tweet object
 * @constructor
 */
brkn.model.Tweet = function(tweet) {
  /**
   * @type {number}
   * @private
   */
  this.id = tweet['id'];
 
  /**
   * @type {string}
   * @private
   */
  this.handle = tweet['handle'];

  /**
   * @type {string}
   * @private
   */
  this.picture = tweet['picture'];
  
  /**
   * @type {string}
   * @private
   */
  this.text = tweet['text'];
  
  /**
   * @type {goog.date.DateTime}
   */
  this.time = goog.date.fromIsoString(tweet['time'] + 'Z');
};