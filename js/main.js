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
goog.require('goog.fx.dom.Scroll');
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
  
  var mainEl = soy.renderAsElement(brkn.main.main, {
    user: brkn.model.Users.getInstance().currentUser,
    admin: brkn.model.Users.getInstance().currentUser.isAdmin()
  });
  goog.dom.insertChildAt(element, mainEl, 0);
};


/** @inheritDoc */
brkn.Main.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.controller_.decorate(goog.dom.getElement('controller'));
  this.guide_.decorate(goog.dom.getElement('guide'));
  this.sidebar_.decorate(goog.dom.getElement('sidebar'));
  this.player_.decorate(goog.dom.getElement('stage'));

  // this.popup_ = new brkn.Popup();
  
  // iPad
  this.getHandler().listen(document.body, 'touchmove', function(e) {
    var scrollEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'div', 'ios-scroll');
    if (!scrollEl) {
      e.preventDefault(); 
    }
  });
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

brkn.Main.staticInit = function() {
  var login = goog.dom.getElement('login');
  var scrollable = goog.dom.getElement('static-scrollable');
  var content = goog.dom.getElement('static-content');
  var pages = goog.dom.getElement('pages');
  var footer = goog.dom.getElement('footer');
  var expand = false;
  var resize = function(expand) {
    if (expand) {
      content.style.top = Math.max(10,
          goog.dom.getViewportSize().height - 190) + 'px';
      var scrollAnim = new goog.fx.dom.Scroll(login,
          [login.scrollLeft, login.scrollTop],
          [login.scrollLeft, Math.min(goog.dom.getViewportSize().height - 435, content.scrollHeight + 190)],
          300);
      scrollAnim.play();
    } else {
      content.style.top = ''
      content.style.height = ''
      goog.dom.classes.set(content, '');
    }
  }
  
  
  goog.events.listen(login, goog.events.EventType.CLICK, function(e) {
    if (e.target.id == 'static-scrollable') {
      var scrollAnim = new goog.fx.dom.Scroll(login,
          [login.scrollLeft, login.scrollTop],
          [login.scrollLeft, 0], 300);
      scrollAnim.play();
      expand = false;
      goog.events.listen(scrollAnim, goog.fx.Animation.EventType.END, goog.partial(resize, expand));
    }
  });
  goog.events.listen(login, goog.events.EventType.SCROLL, function(e) {
    if (login.scrollTop < 10) {
      expand = false;
      resize(expand);
    }
  });
  goog.events.listen(footer, goog.events.EventType.CLICK, function(e) {
    var section = goog.dom.getAncestorByClass(e.target, 'section');
    if (section) {
      expand = true;
      goog.dom.classes.set(content, section.id);
      content.style.height = goog.style.getSize(pages).height + 220 + 'px';
      resize(expand);
    }
  });
  goog.events.listen(window, goog.events.EventType.RESIZE, goog.partial(resize, true));
};


brkn.Main.auth = function() {  
  FB.getLoginStatus(function(response) {
    if (response['status'] === 'connected') {
      brkn.Main.getSessionAndInit(response);
    } else {
      // not_logged_in
      brkn.Main.login();
    }
  });
};


brkn.Main.login = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');
  
  goog.Timer.callOnce(function() {
    goog.style.showElement(fbLogin, true);
    goog.Timer.callOnce(goog.partial(goog.dom.classes.add, fbLogin, 'show'), 400);
  }, 100);
  
  goog.events.listen(fbLogin, goog.events.EventType.CLICK, function() {
    goog.dom.classes.add(fbLogin, 'disabled');
    FB.login(function(response) {
      if (response['authResponse']) {
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
  var staticContent = goog.dom.getElement('static-content');
  
  goog.dom.classes.add(fbLogin, 'disabled');
  goog.dom.classes.add(fbLogin, 'spin');
  goog.net.XhrIo.send('/_session',
      function(e) {
        if (e.target.getStatus() == 200) {
          var data = e.target.getResponseJson();
          brkn.Main.init(response, data['token'], data['channels'], data['programs'],
              data['current_user'], data['viewer_sessions']);
          
          goog.Timer.callOnce(function() {
            goog.dom.classes.add(staticContent, 'hide');
            goog.dom.classes.add(goog.dom.getElement('login'), 'hide');
            goog.dom.classes.remove(fbLogin, 'spin');
            goog.Timer.callOnce(function() {
              goog.style.showElement(goog.dom.getElement('login'), false);
            }, 600);
          }, 600);
        } else {
          brkn.Main.notAuthorized();
        }
      }, 'POST');
};

brkn.Main.notAuthorized = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');

  goog.dom.classes.add(fbLogin, 'disabled');
  goog.style.showElement(fbLogin, true);
  goog.dom.classes.add(fbLogin, 'show');
  goog.dom.classes.add(fbLogin, 'waitlist');
};

goog.exportSymbol('brkn.Main.staticInit', brkn.Main.staticInit);
goog.exportSymbol('brkn.Main.auth', brkn.Main.auth);
