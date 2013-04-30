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
  this.channelResults_ = [];
  
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
brkn.model.Search.prototype.searchChannels = function(query, opt_callback) {
  goog.net.XhrIo.send('https://www.googleapis.com/youtube/v3/search?q=' + query + '&type=channel,playlist' +
      '&part=snippet&maxResults=3&key=AIzaSyAUF3ESL0wYUuSWmOezgZclQFpNGZNBePw',
      goog.bind(function(e) {
        var response = e.target.getResponseJson();
        this.channelResults_ = goog.array.map(response['items'], function(item) {
          return {
            'playlist_id': item['id']['playlistId'],
            'channel_id': item['id']['channelId'],
            'name': item['snippet']['title'],
            'thumbnail': item['snippet']['thumbnails']['default']['url']
          };
        }, this);
        opt_callback && opt_callback(this.channelResults_);
      }, this));
};


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