goog.provide('brkn.model.Analytics');


/**
 * @constructor
 */
brkn.model.Analytics = function() {

};
goog.addSingletonGetter(brkn.model.Analytics);


/**
 * Initialize Google analytics
 */
brkn.model.Analytics.prototype.init = function() {
  // Setup Google Analytics and track page view
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-38058655-1']);
  goog.DEBUG && _gaq.push(['_setDomainName', 'none']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
};


brkn.model.Analytics.prototype.login = function() {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Users', 'Login', brkn.model.Users.getInstance().currentUser.id]);
};


brkn.model.Analytics.prototype.endSession = function(channel, time, mediaCount) {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Users', 'SessionTime',
             brkn.model.Users.getInstance().currentUser.id, time]);
  _gaq.push(['_trackEvent', 'Users', 'SessionMediaCount',
             brkn.model.Users.getInstance().currentUser.id, mediaCount]);
  _gaq.push(['_trackEvent', 'Users', channel.id + '-time',
             brkn.model.Users.getInstance().currentUser.id, time]);
  _gaq.push(['_trackEvent', 'Users', channel.id + '-medias',
             brkn.model.Users.getInstance().currentUser.id, mediaCount]);
  _gaq.push(['_trackEvent', 'Channel', 'SessionTime', channel.id, time]);
  _gaq.push(['_trackEvent', 'Channel', 'SessionMediaCount', channel.id, mediaCount]);
};


brkn.model.Analytics.prototype.playAsync = function(media) {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Media', 'Play', media.id]);
  _gaq.push(['_trackEvent', 'Users', 'Play', brkn.model.Users.getInstance().currentUser.id]);
};


brkn.model.Analytics.prototype.changeChannel = function(channel, lastChannel) {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Channel', 'OptOut', lastChannel.id]);
  _gaq.push(['_trackEvent', 'Channel', 'OptIn', channel.id]);
};

brkn.model.Analytics.prototype.comment = function(media, facebook, twitter) {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Media', 'Comment', media.id]);
  _gaq.push(['_trackEvent', 'Users', 'Comment', brkn.model.Users.getInstance().currentUser.id]);
  facebook && _gaq.push(['_trackEvent', 'Facebook', 'Comment',
                         brkn.model.Users.getInstance().currentUser.id]);
  twitter && _gaq.push(['_trackEvent', 'Twitter', 'Comment',
                        brkn.model.Users.getInstance().currentUser.id]);
};

brkn.model.Analytics.prototype.share = function(media, facebook, twitter) {
  var _gaq = _gaq || [];
  _gaq.push(['_trackEvent', 'Media', 'Share', media.id]);
  _gaq.push(['_trackEvent', 'Users', 'Share', brkn.model.Users.getInstance().currentUser.id]);
  facebook && _gaq.push(['_trackEvent', 'Facebook', 'Share',
                         brkn.model.Users.getInstance().currentUser.id]);
  twitter && _gaq.push(['_trackEvent', 'Twitter', 'Share',
                        brkn.model.Users.getInstance().currentUser.id]);
};


