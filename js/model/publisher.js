goog.provide('brkn.model.Publisher');


/**
 * @param {Object} publisher Publisher object
 * @constructor
 */
brkn.model.Publisher = function(publisher) {
  /**
   * @type {number}
   * @private
   */
  this.id = publisher['id'];

  /**
   * @type {string}
   * @private
   */
  this.picture = publisher['picture'];
  
  /**
   * @type {string}
   * @private
   */
  this.name = publisher['name'];
  
  /**
   * @type {string}
   * @private
   */
  this.description = publisher['description'];
  
  /**
   * @type {string}
   * @private
   */
  this.link = publisher['link'];
};