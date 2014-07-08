goog.provide('brkn.Main');

goog.require('brkn.Guide');
goog.require('brkn.Controller');
goog.require('brkn.Notifications');
goog.require('brkn.Notify');
goog.require('brkn.Player');
goog.require('brkn.Popup');
goog.require('brkn.Search');
goog.require('brkn.Sidebar');
goog.require('brkn.Queue');
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
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.Main = function() {
	goog.base(this);

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

  /**
   * @type {brkn.Queue}
   */
  this.queue_ = new brkn.Queue();

  /**
   * @type {brkn.Search}
   */
  this.search_ = new brkn.Search();

  /**
   * @type {brkn.Notifications}
   */
  this.notifications_;

  /**
   * @type {brkn.sidebar.Messages}
   */
  this.inbox_;
};
goog.inherits(brkn.Main, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.Main.mp31_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.mp32_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.mp33_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.mp34_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.chord1_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.chord2_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.chord3_;


/**
 * @type {Element}
 * @private
 */
brkn.Main.chord4_;


/**
 * @type {brkn.Popup}
 * @private
 */
brkn.Main.prototype.popup_;


/**
 * @type {brkn.model.BrowserChannel}
 * @private
 */
brkn.Main.prototype.browserChannel_;


/** @inheritDoc */
brkn.Main.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
  var currentUser = brkn.model.Users.getInstance().currentUser;
  var mainEl = soy.renderAsElement(brkn.main.main, {
    user: currentUser,
    admin: currentUser ? currentUser.isAdmin() : false,
    guide: !EMBED && (currentUser ? currentUser.showGuide &&
        !brkn.model.Channels.getInstance().currentChannel.myChannel && !IPAD : true),
    sidebar: !EMBED && (currentUser ? currentUser.showSidebar : true),
    embed: EMBED
  });
  goog.dom.insertChildAt(element, mainEl, 0);
};


/** @inheritDoc */
brkn.Main.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.controller_.decorate(goog.dom.getElement('controller'));

  if (!IPAD) {
    this.guide_.decorate(goog.dom.getElement('guide'));
  }
  this.sidebar_.decorate(goog.dom.getElement('sidebar'));
  this.player_.decorate(goog.dom.getElement('stage'));
  this.notify_.decorate(goog.dom.getElement('notify'));
  this.queue_.decorate(goog.dom.getElement('queue'));
  this.search_.decorate(goog.dom.getElement('search'));
  this.popup_ = new brkn.Popup();


  // iPad
  this.getHandler().listen(document.body, 'touchmove', function(e) {
    var scrollEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'div', 'ios-scroll');
    if (!scrollEl) {
      e.preventDefault();
    }
  });

  this.getHandler()
      .listen(window, goog.events.EventType.CLICK, function(e) {
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
              case 'friendlist':
                brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.FRIEND_LIST);
                break;
            }
          }
        }
      });

  if (brkn.model.Users.getInstance().currentUser.loggedIn) {
    goog.net.XhrIo.send('/_presence', goog.bind(function(e) {
      var data = e.target.getResponseJson();
      this.browserChannel_ = brkn.model.BrowserChannel.getInstance().init(data['token']);
      brkn.model.Channels.getInstance().loadViewersFromJson(data['viewer_sessions']);
    }, this));
  } else {
    goog.net.XhrIo.send('/_token', goog.bind(function(e) {
      var data = e.target.getResponseJson();
      this.browserChannel_ = brkn.model.BrowserChannel.getInstance().init(data['token']);
    }, this));
  }

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.LOGGED_IN, function() {
    this.notifications_ = new brkn.Notifications();
    this.notifications_.decorate(goog.dom.getElement('notifications'));
    goog.style.showElement(goog.dom.getElement('notifications'), true);

    if (!EMBED) {
        this.inbox_ = new brkn.sidebar.Messages(brkn.model.Users.getInstance().currentUser);
        this.inbox_.decorate(goog.dom.getElement('inbox'));
        goog.style.showElement(goog.dom.getElement('inbox'), true);
    }

    goog.net.XhrIo.send('/_presence', goog.bind(function(e) {
      var data = e.target.getResponseJson();
      goog.dispose(this.browserChannel_);
      this.browserChannel_ = brkn.model.BrowserChannel.getInstance().init(data['token']);
      brkn.model.Channels.getInstance().loadViewersFromJson(data['viewer_sessions']);
    }, this));

  }, this);

  brkn.model.Controller.getInstance().subscribe(brkn.model.Controller.Actions.TOGGLE_INFO, function() {
    var login = goog.dom.getElement('login');
    var content = goog.dom.getElement('static-content');
    var pages = goog.dom.getElement('pages');

    goog.dom.classes.remove(login, 'hide');
    goog.dom.classes.add(login, 'show');
    content.style.height = goog.style.getSize(pages).height + 80 + 'px';
    brkn.Main.resizeStatic(true);
  }, this);
};


/**
 * @param {brkn.model.User} user
 * @private
 */
brkn.Main.prototype.welcome_ = function(user) {
  var welcome = goog.dom.getElement('welcome');
  goog.style.showElement(welcome, true);
  if (!brkn.model.Users.getInstance().currentUser.loggedIn) {
    goog.Timer.callOnce(function() {
      goog.dom.classes.add(welcome, 'fade');
    }, 3000);
  }
  this.getHandler().listen(welcome, goog.events.EventType.CLICK, function() {
    goog.style.showElement(welcome, false);
    if (brkn.model.Users.getInstance().currentUser.loggedIn) {
      goog.net.XhrIo.send('/_welcomed', goog.functions.NULL(), 'POST');
    }
  })
};


/**
 * @param {Object} channels Channels json object.
 * @param {Object} programs Programs json object.
 * @param {?Object=} opt_currentUser The curernt user json object.
 * @param {?string=} opt_currentChannel
 * @suppress {checkTypes}
 */
brkn.Main.init = function(channels, programs, opt_currentUser, opt_currentChannel) {
	brkn.model.Users.getInstance().setCurrentUser(opt_currentUser || null);
	brkn.model.Channels.getInstance().loadFromJson(channels);
	brkn.model.Programs.getInstance().loadFromJson(programs);
	brkn.model.Channels.getInstance().setCurrentChannel(opt_currentChannel ||
	    brkn.model.Channels.getInstance().findOnline());
	brkn.model.Clock.getInstance().init();

	var main = new brkn.Main();
	main.decorate(document.body);
	LOADED = true;
	brkn.model.Analytics.getInstance().login();
};

brkn.Main.staticInit = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var homepage = goog.dom.getElement('homepage');
  var telepathVideo = goog.dom.getElement('telepath-video');
  var login = goog.dom.getElement('login');
  var scrollable = goog.dom.getElement('static-scrollable');
  var content = goog.dom.getElement('static-content');
  var pages = goog.dom.getElement('pages');
  var footer = goog.dom.getElement('footer');
  var expand = false;
  LOADED = false;
  if (LOGIN_REQUIRED && fbLogin) {
    goog.dom.setTextContent(goog.dom.getElementByClass('with-fb', fbLogin), 'with facebook');
    goog.dom.setTextContent(goog.dom.getElementByClass('label', fbLogin), 'LOGIN');
  }

  if (!POWER_ON && !LOGIN_REQUIRED && fbLogin) {
    goog.dom.classes.add(fbLogin, 'disabled');
    goog.dom.classes.add(fbLogin, 'spin');
  }


  if (!telepathVideo) {
      // Hide in JS so background shows if JS doesn't load.
      goog.dom.classes.add(homepage, 'hide');
      var img = goog.dom.createDom('img');
      img.src = '/static/img/homepage.jpg';
      goog.events.listen(img, goog.events.EventType.LOAD, function() {
        goog.dom.classes.remove(homepage, 'hide');
        goog.dom.classes.add(homepage, 'show');
      });
  }

  goog.Timer.callOnce(function() {
    if (fbLogin) {
      goog.style.showElement(fbLogin, true);
      goog.Timer.callOnce(goog.partial(goog.dom.classes.add, fbLogin, 'show'), 400);
    }
  }, 100);

  goog.events.listen(login, goog.events.EventType.CLICK, function(e) {
    if (e.target.id == 'static-scrollable') {
      var app = goog.dom.classes.has(login, 'app');
      expand = false;
      if (app) {
        brkn.Main.resizeStatic(expand);
      } else {
        var scrollAnim = new goog.fx.dom.Scroll(login,
            [login.scrollLeft, login.scrollTop],
            [login.scrollLeft, 0], 300);
        scrollAnim.play();
        goog.events.listen(scrollAnim, goog.fx.Animation.EventType.END, goog.partial(brkn.Main.resizeStatic, expand));
      }
    }
  });
  goog.events.listen(login, goog.events.EventType.SCROLL, function(e) {
    if (!goog.dom.classes.has(login, 'scrolling') && login.scrollTop < 1) {
      expand = false;
      brkn.Main.resizeStatic(expand);
    }
  });
  goog.events.listen(footer, goog.events.EventType.CLICK, function(e) {
    var section = goog.dom.getAncestorByClass(e.target, 'section');
    var app = goog.dom.classes.has(login, 'app');
    if (section) {
      expand = true;
      goog.dom.classes.set(content, section.id);
      content.style.height = goog.style.getSize(pages).height + (app ? 80 : 220) + 'px';
      brkn.Main.resizeStatic(expand);
    }
  });
  goog.events.listen(window, goog.events.EventType.RESIZE, goog.partial(brkn.Main.resizeStatic, expand));

  brkn.model.Analytics.getInstance().init();

  if (IPHONE) {
    goog.dom.classes.add(document.body, 'iphone');
    goog.dom.classes.add(document.body, 'login');
    window.onload = function() {
      goog.Timer.callOnce(function() {
        window.scrollTo(0, 1);
      }, 1000);
    }
  }
};

/**
 * @param {boolean} expand
 */
brkn.Main.resizeStatic = function(expand) {
  var login = goog.dom.getElement('login');
  var content = goog.dom.getElement('static-content');
  var pages = goog.dom.getElement('pages');

  var app = goog.dom.classes.has(login, 'app');
  goog.dom.classes.enable(login, 'expanded', expand);
  if (goog.dom.getElement('uvTab')) {
    goog.dom.classes.enable(goog.dom.getElement('uvTab'), 'show', app && expand);
  }
  if (expand) {
    if (app) {
      content.style.bottom = -goog.style.getSize(pages).height - 80 + 'px';
    } else {
      content.style.top = Math.max(10, goog.dom.getViewportSize().height - 280) + 'px';
    }

    var scrollTo = app ? Math.min(goog.dom.getViewportSize().height - 100, content.scrollHeight + 80) :
          Math.min(goog.dom.getViewportSize().height - 435, content.scrollHeight + 190);

    if (!app || (app && !login.scrollTop)) {
      var scrollAnim = new goog.fx.dom.Scroll(login,
          [login.scrollLeft, login.scrollTop],
          [login.scrollLeft, scrollTo],
          300);
      goog.dom.classes.add(login, 'scrolling');
      scrollAnim.play();
      goog.events.listen(scrollAnim, goog.fx.Animation.EventType.END, function() {
        goog.dom.classes.remove(login, 'scrolling');
      });
    } else {
      login.scrollTop = scrollTo;
    }
  } else {
    content.style.top = ''
    content.style.height = ''
    if (app) {
      goog.Timer.callOnce(function() {
        goog.dom.classes.remove(login, 'show');
      }, 200);
    } else {
      goog.dom.classes.set(content, '');
    }
  }
};


brkn.Main.auth = function() {
  if (!LOGIN_REQUIRED || EMBED) {
    brkn.Main.getSessionAndInit();
  } else {
    FB.getLoginStatus(function(response) {
      if (response['status'] === 'connected') {
        brkn.Main.getSessionAndInit();
      } else if (LOGIN_REQUIRED) {
        // not_logged_in
        brkn.Main.login();
      } else {
        brkn.Main.getSessionAndInit();
      }
    });
  }
};


brkn.Main.login = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');
  brkn.Main.getSessionAndInit();
  fbLogin && goog.events.listen(fbLogin, goog.events.EventType.CLICK, function() {
    goog.dom.classes.add(fbLogin, 'disabled');

      if (IPAD) {
        var permissionUrl = "https://m.facebook.com/dialog/oauth?client_id=" + FB_APP_ID +
            "&response_type=code&redirect_uri=" + HOST_URL + "&scope=email";
        window.location.href = permissionUrl;
        return false;
      } else {
        FB.login(function(response) {
          if (response['authResponse']) {
            // connected
            brkn.Main.getSessionAndInit();
          } else {
            // not_authorized
            //brkn.Main.notAuthorized();
            goog.dom.classes.remove(fbLogin, 'disabled');
          }
        }, {scope: 'email'});
      }
  });
};


brkn.Main.getSessionAndInit = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var staticContent = goog.dom.getElement('static-content');
  var login = goog.dom.getElement('login');
  var telepathVideo = goog.dom.getElement('telepath-video');
  var videoStarted = !telepathVideo;
  var videoEnded = !telepathVideo;
  var sessionLoaded = false;
  var telepathSpinner = goog.dom.getElement('telepath-spinner');
  var embedSpinner = goog.dom.getElement('telepath-embed-spinner');

  fbLogin && goog.dom.classes.add(fbLogin, 'disabled');
  fbLogin && goog.dom.classes.add(fbLogin, 'spin');

  var reveal = function() {
    goog.Timer.callOnce(function() {
      goog.style.showElement(goog.dom.getElement('embed-spinner'), false);
      goog.dom.classes.add(login, 'hide');
      goog.Timer.callOnce(function() {
        goog.style.showElement(goog.dom.getElement('homepage'), false);
        goog.dom.classes.add(login, 'app');
        goog.dom.classes.add(staticContent, 'faq');
      }, 600);
    }, 600);
  };

  if (telepathSpinner) {
    goog.events.listen(telepathSpinner, 'click', function() {
      window.location = document.URL;
    });
  }
  if (embedSpinner) {
    goog.events.listen(embedSpinner, 'click', function() {
      window.location = document.URL;
    });
  }

  goog.net.XhrIo.send('/_session' + (YOUTUBE_CHANNEL ? '?ytc=' + YOUTUBE_CHANNEL : ''),
      function(e) {
        if (e.target.getStatus() == 200) {
          sessionLoaded = true;
          var data = e.target.getResponseJson();
          if (data['error']) {
            var error = goog.dom.getElement('error');
            goog.dom.setTextContent(error, data['error']);
            brkn.Main.noLogin('error', 'Yikes...');
            return;
          }
          if (data['message']) {
            var message = goog.dom.getElement('message');
            goog.dom.setTextContent(message, data['message']);
            goog.dom.classes.add(message, 'show');
            return;
          }

          if (LOADED) {
            brkn.model.Users.getInstance().setCurrentUser(data['current_user']);
            brkn.model.Users.getInstance().publish(brkn.model.Users.Action.LOGGED_IN);
          } else {
            brkn.Main.init(data['channels'], data['programs'], data['current_user'],
                data['current_channel']);
          }

          if (!LOGIN_REQUIRED || brkn.model.Users.getInstance().currentUser.loggedIn) {
            goog.dom.classes.remove(document.body, 'login');
            goog.Timer.callOnce(reveal);
            window.dispatchEvent((new Event('telepath-ready')));
            if (window.parent) {
              window.parent.dispatchEvent((new Event('telepath-ready')));
            }
          }

        } else {
          if (EMBED) {
            if (embedSpinner) {
              goog.dom.classes.add(embedSpinner, 'reload');
            }
          } else if (telepathSpinner) {
            goog.dom.classes.add(telepathSpinner, 'reload');
            goog.dom.setTextContent(goog.dom.getElement('telepath-tagline'), 'Oops, try reloading')
          } else {
            brkn.Main.noLogin('error', 'Oops, try reloading');
          }
        }
      }, 'POST');

  // if (telepathVideo) {
  //   goog.events.listen(telepathVideo, 'playing', function() {
  //     goog.Timer.callOnce(function() {
  //       videoStarted = true;
  //       if (sessionLoaded) {
  //         goog.dom.classes.remove(document.body, 'login');
  //         goog.Timer.callOnce(reveal);
  //       }
  //     }, 2500);
  //   });
  // }
};

/**
 * @param {?string=} opt_class
 * @param {?string=} opt_message
 */
brkn.Main.noLogin = function(opt_class, opt_message) {
  var fbLogin = goog.dom.getElement('fb-login');
  var loginPage = goog.dom.getElement('login');

  if (opt_class) {
    var power = goog.dom.getElementByClass('power', fbLogin);
    goog.dom.classes.add(power, opt_class);
  }

  if (opt_message) {
    var waitlist = goog.dom.getElementByClass('waitlist', fbLogin);
    goog.dom.setTextContent(waitlist, opt_message);
  }

  if (fbLogin) {
    goog.dom.classes.remove(fbLogin, 'spin');
    goog.dom.classes.add(fbLogin, 'disabled');
    goog.style.showElement(fbLogin, true);
    goog.dom.classes.add(fbLogin, 'show');
    goog.dom.classes.add(fbLogin, 'waitlist');
  }
};

brkn.Main.play = function() {
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, true);
};

brkn.Main.pause = function() {
  brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, false);
};

brkn.Main.getCurrentProgram = function() {
  return brkn.model.Player.getInstance().getCurrentProgram();
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
goog.exportSymbol('window.play', brkn.Main.play);
goog.exportSymbol('window.pause', brkn.Main.pause);
goog.exportSymbol('window.getCurrentProgram', brkn.Main.getCurrentProgram);
