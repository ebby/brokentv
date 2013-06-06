goog.provide('brkn.Main');

goog.require('brkn.Guide');
goog.require('brkn.Controller');
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
  
  var mainEl = soy.renderAsElement(brkn.main.main, {
    user: brkn.model.Users.getInstance().currentUser,
    admin: brkn.model.Users.getInstance().currentUser.isAdmin(),
    guide: brkn.model.Users.getInstance().currentUser.showGuide &&
        !brkn.model.Channels.getInstance().currentChannel.myChannel && !IPAD,
    sidebar: brkn.model.Users.getInstance().currentUser.showSidebar
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

  if (!brkn.model.Users.getInstance().currentUser.welcomed) {
    this.welcome_(brkn.model.Users.getInstance().currentUser);
  }
  
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
  
  window.onload = function() {
    window.onbeforeunload = function(e) {
      return 'Leaving so soon?'
    };
  };
  
  goog.net.XhrIo.send('/_presence', goog.bind(function(e) {
    var data = e.target.getResponseJson();
    this.browserChannel_ = brkn.model.BrowserChannel.getInstance().init(data['token']);
    brkn.model.Channels.getInstance().loadViewersFromJson(data['viewer_sessions']);
  }, this));
  
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
  this.getHandler().listen(welcome, goog.events.EventType.CLICK, function() {
    goog.style.showElement(welcome, false);
    goog.net.XhrIo.send('/_welcomed', goog.functions.NULL(), 'POST');
  })
};


/**
 * @param {Object} response Facebook response data.
 * @param {Object} channels Channels json object.
 * @param {Object} programs Programs json object.
 * @param {Object} currentUser The curernt user json object.
 */
brkn.Main.init = function(response, channels, programs, currentUser) {

	if (!goog.object.isEmpty(currentUser)) {
	  brkn.model.Users.getInstance().setCurrentUser(currentUser);
	}

	brkn.model.Channels.getInstance().loadFromJson(channels);
	brkn.model.Programs.getInstance().loadFromJson(programs);
	brkn.model.Channels.getInstance().setCurrentChannel(currentUser['current_channel']);
	brkn.model.Clock.getInstance().init();
	
	var main = new brkn.Main();
	main.decorate(document.body);
	
	brkn.model.Analytics.getInstance().login();
	
	// UserVoice
	//  var uvOptions = {};
	//  (function() {
	//    var uv = document.createElement('script'); uv.type = 'text/javascript'; uv.async = true;
	//    uv.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'widget.uservoice.com/WGHjF5nSR8jL1GxXyQNxWA.js';
	//    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(uv, s);
	//  })();
};

brkn.Main.staticInit = function() {
  var fbLogin = goog.dom.getElement('fb-login');
  var homepage = goog.dom.getElement('homepage');
  var login = goog.dom.getElement('login');
  var scrollable = goog.dom.getElement('static-scrollable');
  var content = goog.dom.getElement('static-content');
  var pages = goog.dom.getElement('pages');
  var footer = goog.dom.getElement('footer');
  var expand = false;
  
  // Hide in JS so background shows if JS doesn't load.
  goog.dom.classes.add(homepage, 'hide');
  var img = goog.dom.createDom('img');
  img.src = '/static/img/homepage.jpg';
  goog.events.listen(img, goog.events.EventType.LOAD, function() {
    goog.dom.classes.remove(homepage, 'hide');
    goog.dom.classes.add(homepage, 'show');
  });
  
  goog.Timer.callOnce(function() {
    goog.style.showElement(fbLogin, true);
    goog.Timer.callOnce(goog.partial(goog.dom.classes.add, fbLogin, 'show'), 400);
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
  
  brkn.Main.makeMusic();
};


brkn.Main.makeMusic = function() {
  brkn.Main.chord1_ = goog.dom.getElement('chord-1');
  brkn.Main.chord2_ = goog.dom.getElement('chord-2');
  brkn.Main.chord3_ = goog.dom.getElement('chord-3');
  brkn.Main.chord4_ = goog.dom.getElement('chord-4');
  brkn.Main.mp31_ = goog.dom.getElement('mp3-1');
  brkn.Main.mp32_ = goog.dom.getElement('mp3-2');
  brkn.Main.mp33_ = goog.dom.getElement('mp3-3');
  brkn.Main.mp34_ = goog.dom.getElement('mp3-4');
  brkn.Main.mp31_.volume = .5;
  brkn.Main.mp32_.volume = .5;
  brkn.Main.mp33_.volume = .5;
  brkn.Main.mp34_.volume = .5;
  brkn.Main.mp31_.load();
  brkn.Main.mp32_.load();
  brkn.Main.mp33_.load();
  brkn.Main.mp34_.load();
  
  goog.events.listen(brkn.Main.chord1_, goog.events.EventType.CLICK, function(e) {
    brkn.Main.mp31_.load();
    brkn.Main.mp31_.play();
  });
  goog.events.listen(brkn.Main.chord2_, goog.events.EventType.CLICK, function(e) {
    brkn.Main.mp32_.load();
    brkn.Main.mp32_.play();
  });
  goog.events.listen(brkn.Main.chord3_, goog.events.EventType.CLICK, function(e) {
    brkn.Main.mp33_.load();
    brkn.Main.mp33_.play();
  });
  goog.events.listen(brkn.Main.chord4_, goog.events.EventType.CLICK, function(e) {
    brkn.Main.mp34_.load();
    brkn.Main.mp34_.play();
  });
};


brkn.Main.playJingle = function() {
  goog.Timer.callOnce(function() {
    goog.dom.classes.add(brkn.Main.chord1_, 'strike');
    brkn.Main.mp31_.play();
  }, 500);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord1_, 'strike');
    goog.dom.classes.add(brkn.Main.chord2_, 'strike');
    brkn.Main.mp32_.play();
  }, 800);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord2_, 'strike');
    goog.dom.classes.add(brkn.Main.chord3_, 'strike');
    brkn.Main.mp33_.play();
  }, 1100);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord3_, 'strike');
    goog.dom.classes.add(brkn.Main.chord4_, 'strike');
    brkn.Main.mp34_.play();
  }, 1400);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord4_, 'strike');
    goog.dom.classes.add(brkn.Main.chord3_, 'strike');
    brkn.Main.mp33_.load();
    brkn.Main.mp33_.play();
  }, 1700);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord3_, 'strike');
    goog.dom.classes.add(brkn.Main.chord2_, 'strike');
    brkn.Main.mp32_.load();
    brkn.Main.mp32_.play();
  }, 2000);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord2_, 'strike');
    goog.dom.classes.add(brkn.Main.chord1_, 'strike');
    brkn.Main.mp31_.load();
    brkn.Main.mp31_.play();
  }, 2300);
  goog.Timer.callOnce(function() {
    goog.dom.classes.remove(brkn.Main.chord1_, 'strike');
  }, 2600);
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
    if (IPAD) {
      var permissionUrl = "https://m.facebook.com/dialog/oauth?client_id=" + FB_APP_ID +
          "&response_type=code&redirect_uri=" + HOST_URL + "&scope=email";
      window.location.href = permissionUrl;
      return false;
    } else {
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
    }
  });
};


brkn.Main.getSessionAndInit = function(response) {
  var fbLogin = goog.dom.getElement('fb-login');
  var staticContent = goog.dom.getElement('static-content');
  var login = goog.dom.getElement('login');
  
  goog.dom.classes.add(fbLogin, 'disabled');
  goog.dom.classes.add(fbLogin, 'spin');
  goog.net.XhrIo.send('/_session',
      function(e) {
        if (e.target.getStatus() == 200) {
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
            return;
          }
          var reveal = function() {
            goog.Timer.callOnce(function() {
              goog.dom.classes.add(login, 'hide');
              goog.Timer.callOnce(function() {
                goog.style.showElement(goog.dom.getElement('homepage'), false);
                goog.dom.classes.add(login, 'app');
                goog.dom.classes.add(staticContent, 'faq');
              }, 600);
            }, 600);
          };
          
          goog.dom.classes.remove(document.body, 'login');
          goog.Timer.callOnce(reveal);
          brkn.Main.init(response, data['channels'], data['programs'], data['current_user']);
        } else if (e.target.getStatus() == 500) {
          brkn.Main.noLogin('error', 'Oops, check back later');
          brkn.Main.playJingle();
        } else {
          brkn.Main.noLogin('wait');
          brkn.Main.playJingle();
        }
      }, 'POST');
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
  goog.dom.classes.remove(fbLogin, 'spin');
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

