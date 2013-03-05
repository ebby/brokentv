goog.provide('brkn.Main');

goog.require('brkn.Guide');
goog.require('brkn.Controller');
goog.require('brkn.Notify');
goog.require('brkn.Player');
goog.require('brkn.Popup');
goog.require('brkn.Sidebar');
goog.require('brkn.main');
goog.require('brkn.model.Analytics');
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

	/**
   * @type {brkn.Notify}
   */
  this.notify_ = new brkn.Notify();
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
    admin: brkn.model.Users.getInstance().currentUser.isAdmin(),
    guide: brkn.model.Users.getInstance().currentUser.showGuide,
    sidebar: brkn.model.Users.getInstance().currentUser.showSidebar
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
  this.notify_.decorate(goog.dom.getElement('notify'));

  
  // iPad
  this.getHandler().listen(document.body, 'touchmove', function(e) {
    var scrollEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'div', 'ios-scroll');
    if (!scrollEl) {
      e.preventDefault(); 
    }
  });
  
  this.getHandler().listen(window, goog.events.EventType.CLICK, function(e) {
    var a = goog.dom.getAncestorByTagNameAndClass(e.target, 'a')
    var href = a ? a.href : null;
    if (href) {
      var matches = href.match('#(.*):(.*)');
      if (matches && matches.length) {
        e.preventDefault();
        e.stopPropagation();
        switch(matches[1]) {
          case 'user':
            var user = brkn.model.Users.getInstance().get(matches[2]);
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user);
            break;
          case 'channel':
            var channel = brkn.model.Channels.getInstance().get(matches[2]);
            brkn.model.Channels.getInstance().publish(brkn.model.Channels.Actions.CHANGE_CHANNEL,
                channel);
            break;
          case 'info':
            var media = brkn.model.Medias.getInstance().get(matches[2]);
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
            break;
        }
      }
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
	
	brkn.model.Analytics.getInstance().login();
};

brkn.Main.staticInit = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var login = goog.dom.getElement('login');
  var scrollable = goog.dom.getElement('static-scrollable');
  var content = goog.dom.getElement('static-content');
  var pages = goog.dom.getElement('pages');
  var footer = goog.dom.getElement('footer');
  var expand = false;
  
  goog.Timer.callOnce(function() {
    goog.style.showElement(fbLogin, true);
    goog.Timer.callOnce(goog.partial(goog.dom.classes.add, fbLogin, 'show'), 400);
  }, 100);
  
  var resize = function(expand) {
    if (expand) {
      content.style.top = Math.max(10,
          goog.dom.getViewportSize().height - 280) + 'px';
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
    if (login.scrollTop < 1) {
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
  goog.events.listen(window, goog.events.EventType.RESIZE, goog.partial(resize, expand));
  
  brkn.model.Analytics.getInstance().init();
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
          var reveal = function() {
            goog.Timer.callOnce(function() {
              goog.dom.classes.add(staticContent, 'hide');
              goog.dom.classes.add(goog.dom.getElement('login'), 'hide');
              goog.Timer.callOnce(function() {
                goog.style.showElement(goog.dom.getElement('login'), false);
              }, 600);
            }, 600);
          };
          brkn.model.Player.getInstance().subscribeOnce(brkn.model.Player.Actions.NO_MEDIA, reveal);
          brkn.model.Player.getInstance().subscribeOnce(brkn.model.Player.Actions.PLAYING, reveal);
          brkn.Main.init(response, data['token'], data['channels'], data['programs'],
              data['current_user'], data['viewer_sessions']);
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


String.prototype.toHHMMSS = function () {
  var sec_numb    = parseInt(this, 10);
  var hours   = Math.floor(sec_numb / 3600);
  var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
  var seconds = sec_numb - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = hours;}
  if (minutes < 10) {minutes = (hours ? '0' : '')+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  var time    = (hours ? hours + ':' : '') + (minutes ? minutes+':' : '') + seconds;
  return time;
}


goog.exportSymbol('brkn.Main.staticInit', brkn.Main.staticInit);
goog.exportSymbol('brkn.Main.auth', brkn.Main.auth);

