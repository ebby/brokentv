goog.provide('brkn.Main');

goog.require('brkn.Guide');
goog.require('brkn.Controller');
goog.require('brkn.Player');
goog.require('brkn.Popup');
goog.require('brkn.Sidebar');
goog.require('brkn.main');
goog.require('brkn.model.BrowserChannel');
goog.require('brkn.model.Channels');
goog.require('brkn.model.Clock');
goog.require('brkn.model.Programs');

goog.require('goog.fx.easing');
goog.require('goog.fx.dom.FadeOutAndHide');
goog.require('goog.ui.Component');
goog.require('goog.ui.media.YoutubeModel');


/**
 * @param {string} channelToken
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Main = function(channelToken) {
	goog.base(this);

	/**
	 * @type {brkn.model.BrowserChannel}
	 * @private
	 */
	this.BrowserChannel_ = brkn.model.BrowserChannel.getInstance().init(channelToken);
	
	/**
	 * @type {brkn.Controller}
	 */
	this.controller_ = new brkn.Controller();
	
	/**
	 * @type {brkn.Guide}
	 */
	this.guide_ = new brkn.Guide();
	
	/**
   * @type {brkn.Sidebar}
   */
  this.sidebar_ = new brkn.Sidebar();
	
	/**
	 * @type {brkn.Player}
	 */
	this.player_ = new brkn.Player();
};
goog.inherits(brkn.Main, goog.ui.Component);


/**
 * @type {brkn.Popup}
 * @private
 */
brkn.Main.prototype.popup_;


/** @inheritDoc */
brkn.Main.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
  
  var mainEl = soy.renderAsElement(brkn.main.main,
      { admin: brkn.model.Users.getInstance().currentUser.isAdmin() });
  goog.dom.insertChildAt(element, mainEl, 0);
};


/** @inheritDoc */
brkn.Main.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.controller_.decorate(goog.dom.getElement('controller'));
  this.guide_.decorate(goog.dom.getElement('guide'));
  this.sidebar_.decorate(goog.dom.getElement('sidebar'));
  this.player_.decorate(goog.dom.getElement('stage'));

  this.popup_ = new brkn.Popup();
  
  // iPad
//  this.getHandler().listen(document, 'touchmove', function(e) {
//    e.preventDefault();
//  });
};


/**
 * @param {Object} response Facebook response data.
 * @param {string} channelToken Channel token.
 * @param {Object} channels Channels json object.
 * @param {Object} programs Programs json object.
 * @param {Object} currentUser The curernt user json object.
 * @param {Object} viewerSessions Viewers json object.
 */
brkn.Main.init = function(response, channelToken, channels, programs,
		currentUser, viewerSessions) {
  
  var fadeOut = new goog.fx.dom.FadeOutAndHide(goog.dom.getElement('login'), 2000, goog.fx.easing.easeIn);
  fadeOut.play();
  
	if (!goog.object.isEmpty(currentUser)) {
	  brkn.model.Users.getInstance().setCurrentUser(currentUser);
	}
	brkn.model.Channels.getInstance().loadFromJson(channels, currentUser['current_channel']);
	brkn.model.Programs.getInstance().loadFromJson(programs);
	brkn.model.Channels.getInstance().loadViewersFromJson(viewerSessions);
	brkn.model.Clock.getInstance().init();
	
	var main = new brkn.Main(channelToken);
	main.decorate(document.body);
};


brkn.Main.auth = function() {  
  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      brkn.Main.getSessionAndInit(response);
    } else {
      // not_logged_in
      brkn.Main.login();
    }
  });
};


brkn.Main.login = function() {
  var oken = goog.dom.getElement('oken');
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');
  
  goog.Timer.callOnce(function() {
    goog.dom.classes.add(oken, 'animate');
    goog.style.showElement(fbLogin, true);
    goog.Timer.callOnce(goog.partial(goog.dom.classes.add, fbLogin, 'show'), 400);
  }, 100);
  
  goog.events.listen(fbLogin, goog.events.EventType.CLICK, function() {
    goog.dom.classes.add(fbLogin, 'disabled');
    FB.login(function(response) {
      if (response.authResponse) {
        // connected
        brkn.Main.getSessionAndInit(response);
      } else {
        // not_authorized
        //brkn.Main.notAuthorized();
        goog.dom.classes.remove(fbLogin, 'disabled');
      }
    }, {scope: 'email'});
  });
};


brkn.Main.getSessionAndInit = function(response) {
  var fbLogin = goog.dom.getElement('fb-login');
  
  goog.net.XhrIo.send('/_session',
      function(e) {
        if (e.target.getStatus() == 200) {
          var oken = goog.dom.getElement('oken');
          goog.dom.classes.add(oken, 'swing');
          goog.dom.classes.remove(fbLogin, 'show');

          var data = e.target.getResponseJson();
          brkn.Main.init(response, data['token'], data['channels'], data['programs'],
              data['current_user'], data['viewer_sessions']);
        } else {
          brkn.Main.notAuthorized();
        }
      }, 'POST');
}

brkn.Main.notAuthorized = function() {
  var oken = goog.dom.getElement('oken');
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');

  goog.dom.classes.add(oken, 'animate');
  goog.dom.classes.add(fbLogin, 'disabled');
  goog.style.showElement(fbLogin, true);
  goog.dom.classes.add(fbLogin, 'show');
  goog.dom.setTextContent(fbLogin, 'We\'ll keep you posted');
};

goog.exportSymbol('brkn.Main.auth', brkn.Main.auth);
