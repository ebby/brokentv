goog.provide('brkn.model.Search');
goog.provide('brkn.model.Search.Actions');

goog.require('goog.pubsub.PubSub');



/**
 * @constructor
 * @extends {goog.pubsub.PubSub}
 */
brkn.model.Search = function() {
  goog.base(this);
  
  /**
   * @type {Array.<brkn.model.Media>}
   */
  this.results_ = [];
};
goog.inherits(brkn.model.Search, goog.pubsub.PubSub);
goog.addSingletonGetter(brkn.model.Search);


/**
 * @param {string} query
 */
brkn.model.Search.prototype.search = function(query, opt_callback) {
  goog.net.XhrIo.send('https://gdata.youtube.com/feeds/api/videos?q=' + query + '&max-results=10&v=2&alt=json',
      goog.bind(function(e) {
        var response = e.target.getResponseJson();
        this.results_ = goog.array.map(response['feed']['entry'], function(entry) {
          return brkn.model.Media.fromEntry(entry);
        }, this);
        opt_callback && opt_callback(this.results_);
      }, this));
};


/**
 * @enum {string}
 */
brkn.model.Search.Actions = {

};