goog.provide('brkn.model.Medias');

goog.require('brkn.model.Media');



/**
 * @constructor
 */
brkn.model.Medias = function() {

  /**
   * @type {Object.<string, brkn.model.Media>}
   */
  this.mediaMap_ = {};
};
goog.addSingletonGetter(brkn.model.Medias);


/**
 * @param {Object} media Media object
 */
brkn.model.Medias.prototype.getOrAdd = function(media) {
  var m = this.get(media.id);
  if (!m) {
    m = new brkn.model.Media(media);
    this.add(m);
  }
  return m;
};


/**
 * @param {string} id Media id
 */
brkn.model.Medias.prototype.get = function(id) {
  return goog.object.get(this.mediaMap_, id);
};


/**
 * @param {brkn.model.Media} media
 */
brkn.model.Medias.prototype.add = function(media) {
  return goog.object.set(this.mediaMap_, media.id, media);
};


