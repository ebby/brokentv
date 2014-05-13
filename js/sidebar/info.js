goog.provide('brkn.sidebar.Info');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Notify');
goog.require('brkn.model.Tweet');
goog.require('brkn.popup');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.CommentInput');

goog.require('goog.date.relative');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.string.linkify');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {brkn.model.Media} media
 * @param {?boolean=} opt_noFetch
 * @param {?brkn.model.Media=} opt_lastMedia
 * @param {?string=} opt_lastInput
 * @param {?boolean=} opt_mini
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Info = function(media, opt_noFetch, opt_lastMedia, opt_lastInput, opt_mini) {
  goog.base(this);

  media.updateChannels();
  this.setModel(media);

  /**
   * @type {brkn.model.Media}
   * @private
   */
  this.media_ = media;

  /**
   * @type {?brkn.model.Media}
   * @private
   */
  this.lastMedia_ = opt_lastMedia || null;

  /**
   * @type {?string}
   * @private
   */
  this.lastInput_ = opt_lastInput || null;

  /**
   * @type {boolean}
   * @private
   */
  this.hasSeen_ = false;

  /**
   * @type {boolean}
   * @private
   */
  this.fetch_ = !opt_noFetch;

  /**
   * @type {boolean}
   * @private
   */
  this.mini_ = EMBED || !!opt_mini;

  /**
   * @type {Array.<brkn.model.User>}
   * @private
   */
  this.viewers_ = [];

  /**
   * @type {Object.<string, Element>}
   * @private
   */
  this.viewerEls_ = {};

  /**
   * @type {Array.<brkn.model.Comment>}
   * @private
   */
  this.comments_ = [];

  /**
   * @type {Object.<string, brkn.model.Comment>}
   * @private
   */
  this.commentsMap_ = {};

  /**
   * The parent comment element for a comment thread
   * @type {Object.<string, Element>}
   * @private
   */
  this.lastCommentEl_ = {};

  /**
   * Comment el's waiting for their IDs
   * @type {Object.<string, Element>}
   * @private
   */
  this.tempCommentEl_ = {};

  /**
   * @type {Array.<brkn.model.Tweet>}
   * @private
   */
  this.tweets_ = [];

  /**
   * @type {Object.<string, brkn.model.Tweet>}
   * @private
   */
  this.tweetsMap_ = {};

  /**
   * @type {brkn.sidebar.CommentInput}
   * @private
   */
  this.commentInput_ = new brkn.sidebar.CommentInput(true, true, false, false, false, true);

  /**
   * @type {goog.ui.CustomButton}
   */
  this.starToggle_ = new goog.ui.CustomButton('Star');
  this.starToggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);

  /**
   * @type {goog.ui.CustomButton}
   */
  this.fbButton_ = new goog.ui.CustomButton('Facebook');

  /**
   * @type {goog.ui.CustomButton}
   */
  this.twitterButton_ = new goog.ui.CustomButton('Twitter');

  /**
   * @type {goog.ui.CustomButton}
   */
  this.playButton_ = new goog.ui.CustomButton('Play');

  /**
   * @type {goog.ui.CustomButton}
   */
  this.sendButton_ = new goog.ui.CustomButton('Send');
  this.sendButton_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);

  /**
   * @type {goog.ui.CustomButton}
   */
  this.createPollButton_ = new goog.ui.CustomButton('Create Poll');

  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;

};
goog.inherits(brkn.sidebar.Info, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.userPollEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.tweetHolderEl_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.tweetsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.dotNavEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.currentDotEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.contentsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.commentsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.noCommentsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.spinner_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.viewersEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.loginPromo_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.createPoll_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.sendPopup_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Info.prototype.fbLogin_;


/**
 * @type {goog.Timer}
 * @private
 */
brkn.sidebar.Info.prototype.tweetTimer_;


/** @inheritDoc */
brkn.sidebar.Info.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.info, {
    media: this.media_
  });
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  var contentEl = soy.renderAsElement(brkn.sidebar.info, {
    media: this.media_,
    description: this.media_.description ? goog.string.linkify.linkifyPlainText(this.media_.description) : '',
    published: this.media_.getPublishDate(),
    lastMediaId: this.lastMedia_ ? this.lastMedia_.id : null,
    loggedOut: !brkn.model.Users.getInstance().currentUser.loggedIn
  });
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.viewersEl_ = goog.dom.getElementByClass('viewers', this.getElement());
  var picEl = goog.dom.getElementByClass('picture', this.getElement());
  var ytvideo = goog.dom.getElementByClass('ytvideo', this.getElement());
  var scrollable = goog.dom.getElementByClass('scrollable', this.getElement());
  var publisherEl = goog.dom.getElementByClass('publisher', this.getElement());
  var titleEl = goog.dom.getElementByClass('title', this.getElement());
  var linksEl = goog.dom.getElementByClass('links', this.getElement());
  this.spinner_ = goog.dom.getElementByClass('loading', this.getElement())
  var img = /** @type {Element} */ picEl.firstChild;
  this.contentsEl_ = goog.dom.getElementByClass('info-contents', this.getElement());
  this.userPollEl_ = goog.dom.getElementByClass('user-poll', this.getElement());
  this.tweetHolderEl_ = goog.dom.getElementByClass('tweet-holder', this.getElement());
  this.tweetsEl_ = goog.dom.getElementByClass('tweets', this.getElement());
  this.dotNavEl_ = goog.dom.getElementByClass('dot-nav', this.getElement());
  this.commentsEl_ = goog.dom.getElementByClass('comments', this.getElement());
  this.noCommentsEl_ = goog.dom.getElementByClass('no-comments', this.getElement());
  this.commentInput_.render(this.getElement());
  this.starToggle_.decorate(goog.dom.getElementByClass('star', this.getElement()));
  this.starToggle_.setChecked(brkn.model.Users.getInstance().currentUser.isStarred(this.media_));
  this.fbButton_.decorate(goog.dom.getElementByClass('facebook', this.getElement()));
  this.twitterButton_.decorate(goog.dom.getElementByClass('twitter', this.getElement()));
  this.playButton_.decorate(goog.dom.getElementByClass('play', this.getElement()));
  this.sendButton_.decorate(goog.dom.getElementByClass('send', this.getElement()));
  this.createPollButton_.decorate(goog.dom.getElementByClass('create-poll-button', this.getElement()));
  this.tweetTimer_ = new goog.Timer(5000);
  this.watchWith_ = goog.dom.getElementByClass('watch-with', this.getElement());
  this.createPoll_ = goog.dom.getElementByClass('create-poll', this.getElement());
  this.sendPopup_ = goog.dom.getElementByClass('send-media', this.getElement());
  this.fbLogin_ = goog.dom.getElementByClass('fb-login', this.getElement());
  this.loginPromo_ = goog.dom.getElementByClass('login-promo', this.getElement());

  goog.dom.classes.enable(this.getElement(), 'mini', this.mini_);

  goog.style.showElement(this.spinner_, brkn.model.Users.getInstance().currentUser.loggedIn);


  if (!this.fetch_ || this.media_.fetched) {
    this.renderInfo(false, this.media_.description, this.media_.tweets, this.media_.seen,
        this.media_.comments, this.media_.poll);
  } else if (this.fetch_) {
    goog.net.XhrIo.send('/_info/' + this.media_.id, goog.bind(function(e) {
      var response = goog.json.parse(e.target.getResponse());
      var description = response['description'];
      var seen = /** @type {Array.<Object>} */ response['seen'];
      var tweets = /** @type {Array.<Object>} */ response['tweets'];
      var comments = /** @type {Array.<Object>} */ response['comments'];
      var poll = /** @type {Array.<Object>} */ response['poll'];
      this.renderInfo(true, description, tweets, seen, comments, poll);
    }, this));
  }

 if (!brkn.model.Users.getInstance().currentUser.loggedIn) {
   goog.style.showElement(this.commentInput_.getElement(), false);
   goog.style.showElement(this.commentsEl_.parentElement, false);
   goog.dom.classes.add(this.fbLogin_, 'show');
   goog.dom.classes.add(this.fbLogin_, 'spin');
   goog.dom.classes.add(this.loginPromo_, 'show');
   goog.dom.classes.add(this.getElement(), 'logged-out');
   this.getHandler().listen(this.fbLogin_, goog.events.EventType.CLICK,
       goog.bind(this.login, this));
   FB.XFBML.parse();

   if (!CHECKED_LOGIN) {
     CHECKED_LOGIN = true;
     var fbLogin = this.fbLogin_;
     FB.getLoginStatus(function(response) {
       if (response['status'] === 'connected') {
           // connected
           goog.net.XhrIo.send('/_login',
               goog.bind(function(e) {
                 if (e.target.getStatus() == 200) {
                   var data = e.target.getResponseJson();
                   brkn.model.Users.getInstance().setCurrentUser(data['current_user']);
                   goog.dom.classes.remove(fbLogin, 'show');
                   goog.dom.classes.remove(fbLogin, 'spin');
                   brkn.model.Users.getInstance().publish(brkn.model.Users.Action.LOGGED_IN);
                 }
               }, this), 'POST');
       } else {
         goog.dom.classes.remove(fbLogin, 'spin');
       }
     });
   }
 }

  this.getHandler()
      .listen(window,
          'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(publisherEl,
          goog.events.EventType.CLICK,
          goog.bind(function() {
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_LIST,
                this.media_.publisher.name, undefined,
                '/admin/_media/publisher/' + this.media_.publisher.id,
                this.media_.publisher.picture,
                this.media_.publisher.description,
                this.media_.publisher.link,
                '/_publisher/' + this.media_.publisher.id);
          }, this))
      .listen(this.starToggle_, goog.ui.Component.EventType.ACTION, goog.bind(function() {
            brkn.model.Medias.getInstance().publish(brkn.model.Medias.Action.STAR, this.media_,
                this.starToggle_.isChecked());
            goog.net.XhrIo.send('/_star', undefined, 'POST', 'media_id=' + this.media_.id +
                (!this.starToggle_.isChecked() ? '&delete=1' : ''));
          }, this))
      .listen(this.fbButton_, goog.ui.Component.EventType.ACTION,
          goog.bind(this.onFacebookButton_, this))
      .listen(this.twitterButton_, goog.ui.Component.EventType.ACTION,
          goog.bind(this.onTwitterButton_, this))
      .listen(this.playButton_, goog.ui.Component.EventType.ACTION,
          goog.bind(this.onPlayButton_, this))
      .listen(this.sendButton_, goog.ui.Component.EventType.ACTION,
          goog.bind(this.onSendButton_, this))
      .listen(goog.dom.getElementByClass('local', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            goog.style.showElement(goog.dom.getElementByClass('link-select', this.getElement()),
                true);
            goog.dom.getElementByClass('link-input', this.getElement()).select();
          }, this))
      .listen(this.createPollButton_,
          goog.ui.Component.EventType.ACTION,
          goog.bind(this.setupCreatePoll_, this))
      .listen(this.commentInput_,
          'add',
          goog.bind(this.onAddComment_, this))
      .listen(this.noCommentsEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.commentInput_.setFocused(true);
          }, this))
      .listen(goog.dom.getElementByClass('conv-link', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            e.preventDefault();
            e.stopPropagation();
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.CONVERSATION,
                this.media_, this.comments_, this.tweets_);
          }, this))
      .listen(goog.dom.getElementByClass('tweets-link', this.getElement()),
        goog.events.EventType.CLICK,
        goog.bind(function(e) {
          e.preventDefault();
          e.stopPropagation();
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.CONVERSATION,
              this.media_, this.comments_, this.tweets_, true);
        }, this))
      .listen(this.commentInput_,
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            this.resize(0, true);
          }, this))
      .listen(this.commentInput_,
          'resize',
          goog.bind(function(e) {
            this.resize()
          }, this))
      .listen(this.dotNavEl_,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (goog.dom.classes.has(e.target, 'dot')) {
              this.toDot_(e.target);
              this.tweetTimer_.stop();
            }
          }, this))
      .listen(this.tweetTimer_,
          goog.Timer.TICK,
          goog.bind(function() {
            var dotEl = this.currentDotEl_ && goog.dom.getNextElementSibling(this.currentDotEl_) ||
                goog.dom.getElementByClass('dot', this.getElement());
            goog.Timer.callOnce(goog.bind(function() {
              this.toDot_(dotEl);
            }, this));
          }, this))
      .listen(window,
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
                !this.commentInput_.getValue()) {
              this.commentInput_.setFocused(false);
              this.resize(0);
            }
          }, this))
      .listen(img,
          goog.events.EventType.LOAD,
          function() {
            goog.style.showElement(img, true);
            goog.Timer.callOnce(function() {
              if (goog.style.getSize(img).height < goog.style.getSize(picEl).height + 50) {
                goog.dom.classes.add(img, 'fix-height');
              }

              if (goog.style.getSize(img).width > 2*goog.style.getSize(picEl).width) {
                goog.dom.classes.add(img, 'pan-left');
              } else if (goog.style.getSize(img).height > 2*goog.style.getSize(picEl).height) {
                goog.dom.classes.add(img, 'pan-top');
              }

              // Center the cropped picture.
              img.style.marginTop = -goog.style.getSize(img).height/2 + 'px';
              img.style.marginLeft = -goog.style.getSize(img).width/2 + 'px';
              goog.dom.classes.add(img, 'show');
            });
          })
      .listen(scrollable,
              goog.events.EventType.SCROLL,
              goog.bind(function() {
                var video = goog.dom.getElementByClass('ytvideo', this.getElement());
                var opacity = IPHONE && scrollable.scrollTop > 10 ? 0 :
                    ((this.mini_ ? 100 : 120)-scrollable.scrollTop)/100;
                goog.style.setOpacity(publisherEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(titleEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(linksEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(img, Math.min(.5, Math.max(opacity, .1)));
                video && goog.style.setOpacity(video, Math.min(.5, Math.max(opacity, .1)));
                goog.style.setOpacity(ytvideo, Math.min(.5, Math.max(opacity, .1)));
                goog.dom.classes.enable(picEl, 'scrolled', scrollable.scrollTop > 10);
              }, this))
      .listen(this.commentsEl_,
              goog.events.EventType.SCROLL,
              goog.bind(this.scrollGrad_, this))
      .listen(this.commentsEl_,
              goog.events.EventType.CLICK,
              goog.bind(this.commentClick_, this))
      .listen(this.tweetsEl_,
              goog.events.EventType.CLICK,
              goog.bind(this.tweetClick_, this))
      .listen(goog.dom.getElementByClass('desc-link', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(function() {
            var scrolled = goog.dom.classes.toggle(picEl, 'scrolled');
            var scrollAnim = new goog.fx.dom.Scroll(scrollable,
                [scrollable.scrollLeft, scrollable.scrollTop],
                [scrollable.scrollLeft, (scrolled ? (this.mini_ ? 70 : 170) : 0)], 300);
            scrollAnim.play();
          }, this));

  if (this.lastMedia_) {
    this.getHandler().listen(goog.dom.getElementByClass('prev-link', this.getElement()),
        goog.events.EventType.CLICK,
        goog.bind(function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO,
              this.lastMedia_, true, undefined, this.getInput());
        }, this));
  }

  if (this.lastInput_) {
    this.setInput(this.lastInput_);
  }

  if (DESKTOP && !IPAD) {
    brkn.Popup.getInstance().hovercard(this.sendButton_.getElement(), brkn.model.Popup.Position.LEFT,
        brkn.model.Popup.Action.TOOLTIP, {'text': 'Send'});
    brkn.Popup.getInstance().hovercard(this.fbButton_.getElement(), brkn.model.Popup.Position.LEFT,
        brkn.model.Popup.Action.TOOLTIP, {'text': 'Post to Facebook'});
    brkn.Popup.getInstance().hovercard(this.twitterButton_.getElement(), brkn.model.Popup.Position.LEFT,
        brkn.model.Popup.Action.TOOLTIP, {'text': 'Tweet'});
    brkn.Popup.getInstance().hovercard(this.starToggle_.getElement(), brkn.model.Popup.Position.LEFT,
        brkn.model.Popup.Action.TOOLTIP, {'text': 'Save'});
    brkn.Popup.getInstance().hovercard(goog.dom.getElementByClass('eye-icon', this.getElement()),
        brkn.model.Popup.Position.LEFT, brkn.model.Popup.Action.TOOLTIP, {'text': 'Seen by'});
    brkn.Popup.getInstance().hovercard(goog.dom.getElementByClass('friends-icon', this.getElement()),
        brkn.model.Popup.Position.RIGHT, brkn.model.Popup.Action.TOOLTIP, {'text': 'Visible by anybody'});
  }

  if (IPHONE) {

    var player = new YT.Player(ytvideo, {
      'height': '100%',
      'width': '100%',
      'videoId': this.media_.hostId,
      'playerVars': {
          'controls': 0,
          'showinfo': 0
        }
      });
  }

  this.media_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, function(comment) {
    this.addComment_(comment, true);
  }, this);
  this.media_.subscribe(brkn.model.Media.Actions.REMOVE_COMMENT, this.removeComment_, this);
  this.media_.subscribe(brkn.model.Media.Actions.ADD_TWEET, function(tweet) {
    this.addTweet_(tweet, true);
  }, this);
  this.media_.subscribe(brkn.model.Media.Actions.WATCHING, function(user, channel, offline) {
    this.addViewer_(user, !offline);
  }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.PLAYING, function() {
    goog.dom.classes.remove(this.playButton_.getElement(), 'play-loading');
  }, this);
  brkn.model.Player.getInstance().subscribe(brkn.model.Player.Actions.NO_MEDIA, function() {
    goog.dom.classes.remove(this.playButton_.getElement(), 'play-loading');
  }, this);
  brkn.model.Users.getInstance().currentUser.subscribe(
      brkn.model.User.Actions.SET_STARRED, function() {
        this.starToggle_.setChecked(brkn.model.Users.getInstance().currentUser.isStarred(this.media_));
      }, this);
  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.LOGGED_IN, function() {
    goog.dom.classes.remove(this.loginPromo_, 'show');
    goog.Timer.callOnce(goog.bind(function() {
     goog.style.showElement(this.loginPromo_, false);
    }, this), 600);
    goog.style.showElement(this.commentInput_.getElement(), true);
    goog.dom.classes.remove(this.getElement(), 'logged-out');

//    goog.net.XhrIo.send('/_info/' + this.media_.id, goog.bind(function(e) {
//      var response = goog.json.parse(e.target.getResponse());
//      var description = response['description'];
//      var seen = /** @type {Array.<Object>} */ response['seen'];
//      var tweets = /** @type {Array.<Object>} */ response['tweets'];
//      var comments = /** @type {Array.<Object>} */ response['comments'];
//      var poll = /** @type {Array.<Object>} */ response['poll'];
//      this.renderInfo(true, description, tweets, seen, comments, poll);
//    }, this));
  }, this);

  this.resize();
};


/**
 * @return {brkn.model.Media}
 */
brkn.sidebar.Info.prototype.getMedia = function() {
  return this.media_;
};


/**
 * @param {boolean} fetched
 * @param {string} description
 * @param {?Array.<Object>=} opt_tweets
 * * @param {?Array.<Object>=} opt_seen
 * @param {?Array.<Object>=} opt_comments
 * @param {?Object=} opt_poll
 */
brkn.sidebar.Info.prototype.renderInfo = function(fetched, description, opt_tweets, opt_seen,
    opt_comments, opt_poll) {

  goog.style.showElement(this.spinner_, false);

  // Description
  if (description) {
    this.media_.description = description;
    goog.dom.getElementByClass('description', this.getElement()).innerHTML =
        goog.string.linkify.linkifyPlainText(description);
    goog.style.showElement(goog.dom.getElementByClass('scrollable', this.getElement()),
        true);
  } else {
    goog.style.showElement(goog.dom.getElementByClass('desc-link', this.getElement()),
        false);
    goog.style.showElement(goog.dom.getElementByClass('scrollable', this.getElement()),
        false);
  }

  // Viewers
  if (opt_seen) {
    this.viewers_ = goog.array.map(opt_seen, function(viewer) {
      var user = fetched ? brkn.model.Users.getInstance().get_or_add(viewer) :
          /** @type {brkn.model.User} */ viewer;
      if (user.id != brkn.model.Users.getInstance().currentUser.id) {
        goog.style.showElement(this.viewersEl_, true);
        this.hasSeen_ = true;
        this.addViewer_(user, false);
      }
      return user;
    }, this);
  }

  goog.object.forEach(this.media_.onlineViewers, function(viewer) {
    this.addViewer_(viewer, true);
  }, this);

  // Tweets
  if (opt_tweets) {
    this.tweets_ = goog.array.map(opt_tweets, function(tweet) {
      var t = fetched ? new brkn.model.Tweet(tweet) : /** @type {brkn.model.Tweet} */ tweet;
      this.addTweet_(t);
      this.currentDotEl_ = /** @type {Element} */ this.dotNavEl_.firstChild;
      goog.dom.classes.add(this.currentDotEl_, 'selected');
      return t;
    }, this);
    opt_tweets.length && this.tweetTimer_.start();
  }

  // Comments
  var comments = [];
  if (opt_comments) {
    this.commentsEl_ && goog.style.showElement(this.commentsEl_.parentElement, true);
    goog.style.showElement(this.noCommentsEl_, !opt_comments.length);
    comments = goog.array.map(opt_comments, function(comment, i) {
      var c = fetched ? new brkn.model.Comment(comment) : /** @type {brkn.model.Comment} */ comment;
      if (!c.parentId) {
        this.addComment_(c);
      }
      return c;
    }, this);
  }

  if (opt_poll) {
    this.setupUserPoll_(opt_poll);
    this.media_.poll = opt_poll;
  } else if (brkn.model.Users.getInstance().currentUser.loggedIn) {
    goog.style.showElement(this.createPollButton_.getElement(), true);
  }
  this.resize();

  if (fetched) {
    this.media_.tweets = this.tweets_;
    this.media_.comments = comments;
    this.media_.seen = this.viewers_;
    this.media_.fetched = true;
  }
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.setupCreatePoll_ = function() {
  goog.style.showElement(this.createPoll_, true);
  if (this.pollSetup_) {
    return;
  }
  var submit = new goog.ui.CustomButton('CREATE');
  submit.decorate(goog.dom.getElementByClass('submit-poll', this.getElement()));
  submit.setEnabled(false);
  var title = goog.dom.getElementByClass('poll-title', this.createPoll_);
  var option1 = goog.dom.getElementByClass('option-input-1', this.createPoll_);
  var option2 = goog.dom.getElementByClass('option-input-2', this.createPoll_);
  var options = goog.dom.getElementByClass('option-inputs', this.createPoll_);
  this.getHandler()
    .listen(submit,
        goog.ui.Component.EventType.ACTION, goog.bind(function() {
          goog.style.showElement(this.createPoll_, false);
          var optionsStr = goog.array.reduce((/** @type {Array.<Element>} */ options.children), function(prev, el) {
            var toReturn = prev + (el.value ? el.value + '|' : '');
            el.value = '';
            return toReturn;
          }, '', this);
          if (title.value && optionsStr) {
            goog.net.XhrIo.send('/_poll', goog.bind(function(e) {
                  var pollObj = e.target.getResponseJson();
                  this.setupUserPoll_(pollObj);
                }, this), 'POST', 'media_id=' + this.media_.id +
                '&title=' + title.value + '&options=' + optionsStr);
            title.value = '';
            goog.style.showElement(this.createPollButton_.getElement(), false);
          }
        }, this))
    .listen(new goog.events.KeyHandler(title),
        goog.events.KeyHandler.EventType.KEY, goog.bind(function() {
          goog.Timer.callOnce(goog.bind(function() {
            submit.setEnabled(title.value && option1.value && option2.value)
          }, this));
        }, this))
    .listen(new goog.events.KeyHandler(option1),
        goog.events.KeyHandler.EventType.KEY, goog.bind(function() {
          goog.Timer.callOnce(goog.bind(function() {
            submit.setEnabled(title.value && option1.value && option2.value)
          }, this));
        }, this))
    .listen(new goog.events.KeyHandler(option2),
        goog.events.KeyHandler.EventType.KEY, goog.bind(function() {
          goog.Timer.callOnce(goog.bind(function() {
            submit.setEnabled(title.value && option1.value && option2.value)
          }, this));
        }, this))
    .listen(goog.dom.getElementByClass('add-option', this.createPoll_),
      goog.events.EventType.CLICK, goog.bind(function() {
        goog.dom.appendChild(options,
            goog.dom.createDom('input', {
              'type': 'text',
              'placeholder': 'Option ' + (options.children.length + 1)
            }));
      }, this))
    .listen(goog.dom.getElementByClass('close', this.createPoll_),
      goog.events.EventType.CLICK, goog.bind(function() {
        goog.style.showElement(this.createPoll_, false);
      }, this));
  this.pollSetup_ = true;
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.login = function() {
  goog.dom.classes.add(this.fbLogin_, 'disabled');
  if (IPAD) {
    var permissionUrl = "https://m.facebook.com/dialog/oauth?client_id=" + FB_APP_ID +
        "&response_type=code&redirect_uri=" + HOST_URL + "&scope=email";
    window.location.href = permissionUrl;
    return false;
  } else {
    var message = goog.dom.getElementByClass('message', this.fbLogin_);
    FB.login(goog.bind(function(response) {
      if (response['authResponse']) {
        // connected
        goog.dom.classes.remove(message, 'show');
        goog.dom.classes.add(this.fbLogin_, 'disabled');
        goog.dom.classes.add(this.fbLogin_, 'spin');
        goog.net.XhrIo.send('/_login',
            goog.bind(function(e) {
              if (e.target.getStatus() == 200) {
                var data = e.target.getResponseJson();
                brkn.model.Users.getInstance().setCurrentUser(data['current_user']);
                goog.dom.classes.remove(this.fbLogin_, 'show');
                goog.dom.classes.remove(this.fbLogin_, 'spin');
                brkn.model.Users.getInstance().publish(brkn.model.Users.Action.LOGGED_IN);
              }
            }, this), 'POST');
      } else {
        // not_authorized
        //brkn.Main.notAuthorized();
        goog.dom.classes.remove(this.fbLogin_, 'disabled');
      }
    }, this), {scope: 'email'});

    var noPopup = goog.dom.createDom('a', {'href': "https://www.facebook.com/dialog/oauth?client_id=" + FB_APP_ID +
      "&response_type=code&redirect_uri=" + HOST_URL + "&scope=email"}, 'Click here if you have a popup blocker');
    message.innerHTML = '';
    goog.dom.appendChild(message, noPopup);
    goog.dom.classes.add(message, 'show');
    this.getHandler().listen(message, goog.events.EventType.CLICK, function(e) {
      e.stopPropagation();
      window.onbeforeunload = goog.functions.NULL();
    });
  }
};


/**
 * @param {Object} poll
 * @private
 */
brkn.sidebar.Info.prototype.setupUserPoll_ = function(poll) {

  goog.style.showElement(this.createPollButton_.getElement(), false);
  var question = goog.dom.getElementByClass('status', this.userPollEl_);
  var options = goog.dom.getElementByClass('poll-options', this.userPollEl_);
  this.userPollEl_.id = poll['id']
  goog.dom.setTextContent(question, poll['title'].toUpperCase() + ' (' + poll['vote_count'] + ' VOTES)');


  goog.array.forEach(poll['options'], function(op) {
    var optionEl = soy.renderAsElement(brkn.sidebar.pollOption, {
      name: op['name'],
      percent: op['percent'] + '%'
    });
    goog.dom.appendChild(options, optionEl);
    if (op['voted']) {
      this.voteForOption_(poll, op, optionEl);
    } else {
      this.getHandler().listen(optionEl, goog.events.EventType.CLICK, goog.bind(function(e) {
        if (!goog.dom.classes.has(this.userPollEl_, 'voted')) {
          op['vote_count'] += 1
          poll['vote_count'] += 1
          this.voteForOption_(poll, op, optionEl);
          goog.dom.setTextContent(question, poll['title'].toUpperCase() + ' (' + poll['vote_count'] + ' VOTES)');
          goog.net.XhrIo.send('/_poll', undefined, 'POST', 'id=' + op['id']);
          this.commentInput_.setValue('I voted: ' + op['name'] + ' (on ' + poll['title'] + ')', true, true);
          this.commentInput_.setFocused(true);
        }
      }, this));
    }
  }, this);

  goog.style.showElement(this.userPollEl_, true);
};


/**
 * @param {Object} poll
 * @param {Object} op
 * @param {Element} optionEl
 * @private
 */
brkn.sidebar.Info.prototype.voteForOption_ = function(poll, op, optionEl) {
  var question = goog.dom.getElementByClass('status', this.userPollEl_);
  var options = goog.dom.getElementByClass('poll-options', this.userPollEl_);
  goog.dom.classes.add(this.userPollEl_, 'voted');
  var name = goog.dom.getTextContent(goog.dom.getElementByClass('name', optionEl));
  goog.dom.classes.add(optionEl, 'selected');
  goog.array.forEach(goog.dom.getChildren(options), function(opEl, i) {
    var percentage = parseInt(poll['options'][i]['vote_count']/poll['vote_count'] * 100, 10) + '%'
    goog.dom.setTextContent(goog.dom.getElementByClass('percent-number', opEl), percentage);
    goog.dom.getElementByClass('percent', opEl).style.width = percentage;
  }, this);
};


/**
 * @return {boolean}
 */
brkn.sidebar.Info.prototype.isActive = function() {
  return this.commentInput_.isFocused() || this.commentInput_.hasReply() ||
      !!this.commentInput_.getValue();
};


/**
 * @return {string}
 */
brkn.sidebar.Info.prototype.getInput = function() {
  return this.commentInput_.getValue();
};


/**
 * @param {string} text
 */
brkn.sidebar.Info.prototype.setInput = function(text) {
  this.commentInput_.setValue(text);
};


/**
 * @param {Function} callback
 */
brkn.sidebar.Info.prototype.confirmLeave = function(callback) {
  var overlay = goog.dom.getElementByClass('overlay', this.getElement());
  goog.style.showElement(overlay, true);
  this.getHandler().listen(goog.dom.getElementByClass('yes', overlay), goog.events.EventType.CLICK,
      callback);
  this.getHandler().listen(goog.dom.getElementByClass('no', overlay), goog.events.EventType.CLICK,
      goog.bind(function() {
        callback();
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO,
            this.media_, true);
      }, this));

};


/**
 * @param {Element} dotEl
 * @private
 */
brkn.sidebar.Info.prototype.toDot_ = function(dotEl) {
  if (!dotEl) {
    return;
  }
  goog.array.forEach(goog.dom.getChildren(this.dotNavEl_),
      function(el) {return goog.dom.classes.remove(el, 'selected')});
  this.currentDotEl_ = dotEl;
  goog.dom.classes.add(this.currentDotEl_, 'selected');
  var index = goog.array.findIndex(goog.dom.getChildren(this.dotNavEl_),
      function(element) {return element == dotEl});
  var scrollAnim = new goog.fx.dom.Scroll(this.tweetsEl_,
      [this.tweetsEl_.scrollLeft, this.tweetsEl_.scrollTop],
      [index * 320, this.tweetsEl_.scrollTop], 200);
  scrollAnim.play();
  this.resize();
};


/**
 * @param {Object} e
 * @private
 */
brkn.sidebar.Info.prototype.onAddComment_ = function(e) {
  var comment = brkn.model.Comment.add(brkn.model.Users.getInstance().currentUser,
      this.media_.id, e.text, e.facebook, e.twitter, e.parentId, e.toUserId,
      goog.bind(function(comment) {
        var el = this.tempCommentEl_[comment.time.getTime()];
        el.id = 'infocomment-' + comment.id;
        this.activateComment_(comment, el);
      }, this));
  var commentEl = this.addComment_(comment);
  this.tempCommentEl_[comment.time.getTime()] = commentEl;

  if (e.facebook && !e.parentId) {
    FB.api('/me/feed', 'POST', {
      'message': e.text,
      'name': this.media_.name,
      'link': this.media_.link,
      'picture': this.media_.thumbnail,
      'caption': 'on XYLO',
      'description': this.media_.description
    }, function(response) {});
  }

  brkn.model.Analytics.getInstance().comment(this.media_.id, e.facebook, e.twitter);
};


/**
 * @param {brkn.model.Tweet} tweet
 * @param {?boolean=} opt_first
 * @private
 */
brkn.sidebar.Info.prototype.addTweet_ = function(tweet, opt_first) {
  this.tweetsMap_[tweet.id] = tweet;

  var linkedText = goog.string.linkify.linkifyPlainText(tweet.text);
  linkedText = linkedText.replace(/#(\S+)/g, function(hashtag, query) {
    return '<a target="_blank" href="http://twitter.com/search?q=%23' + query + '">' + hashtag + '</a>';
  });
  linkedText = linkedText.replace(/@(\S+)/g, function(handle, name) {
    return '<a target="_blank" href="http://twitter.com/' + name + '">' + handle + '</a>';
  });
  var tweetEl = soy.renderAsElement(brkn.sidebar.tweet, {
    tweet: tweet,
    text: linkedText,
    timestamp: goog.date.relative.format(tweet.time.getTime()),
    prefix: 'infotweet'
  });
  var dotEl = goog.dom.createDom('div', 'dot');
  brkn.model.Clock.getInstance().addTimestamp(tweet.time,
      goog.dom.getElementByClass('timestamp', tweetEl));
  if (opt_first) {
    goog.dom.insertChildAt(this.tweetsEl_, tweetEl, 0);
    goog.dom.insertChildAt(this.dotNavEl_, dotEl, 0);
    if (goog.dom.getChildren(this.tweetsEl_).length > 10) {
      goog.dom.removeNode(this.tweetsEl_.lastChild);
      goog.dom.removeNode(this.dotNavEl_.lastChild);
      this.toDot_(dotEl);
    }
  } else {
    goog.dom.appendChild(this.tweetsEl_, tweetEl);
    goog.dom.appendChild(this.dotNavEl_, dotEl);
  }
  this.resize();
  goog.style.showElement(goog.dom.getParentElement(this.tweetsEl_), true);
};


/**
 * @param {brkn.model.Comment} comment
 * @param {?boolean=} opt_last
 * @return {Element}
 * @private
 */
brkn.sidebar.Info.prototype.addComment_ = function(comment, opt_last) {
  this.comments_.push(comment);

  goog.style.showElement(this.noCommentsEl_, false);
  var textHtml = goog.string.linkify.linkifyPlainText(comment.text);
  textHtml = textHtml.replace(/@\[(\d+):([a-zA-z\s]+)\]/g, function(str, id, name) {
    return '<a href="#user:' + id + '">' + name + '</a>';
  });
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    prefix: 'infocomment',
    comment: comment,
    text: textHtml,
    owner: (comment.user.id == brkn.model.Users.getInstance().currentUser.id)
  });
  brkn.model.Clock.getInstance().addTimestamp(comment.time,
      goog.dom.getElementByClass('timestamp', commentEl));
  if (comment.parentId) {
    goog.dom.appendChild(goog.dom.getElementByClass('replies', this.lastCommentEl_[comment.parentId]),
        commentEl);
  } else {
    goog.dom.appendChild(this.commentsEl_, commentEl);
  }
  if (comment.id) {
    this.activateComment_(comment, commentEl);
  }
  goog.array.forEach(comment.replies, function(reply) {
    this.addComment_(reply, opt_last);
  }, this);
  if (!comment.parentId && opt_last) {
    this.commentsEl_.scrollTop = this.commentsEl_.scrollHeight;
    this.contentsEl_.firstChild.scrollTop = this.contentsEl_.firstChild.scrollHeight;
  }
  return commentEl;
};


/**
 * @param {brkn.model.Comment} comment
 * @param {Element} commentEl
 * @private
 */
brkn.sidebar.Info.prototype.activateComment_ = function(comment, commentEl) {
  this.commentsMap_[comment.id] = comment;
  commentEl.id = 'infocomment-' + comment.id;
  if (!comment.parentId) {
    this.lastCommentEl_[comment.id] = commentEl;
    // Handle reply input
    var replyInput = goog.dom.getElementByClass('reply-input', commentEl);
    var replyTextarea = goog.dom.getElementByClass('reply-textarea', commentEl);
    this.getHandler().listen(replyTextarea, goog.events.EventType.CLICK, goog.bind(function() {
      if (!goog.dom.classes.has(replyInput, 'decorated')) {
        brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, false);
        var commentInput = new brkn.sidebar.CommentInput(false, true, true, false, false, true);
        commentInput.decorate(replyInput);
        commentInput.reply(comment, comment.user);
        this.getHandler().listen(commentInput, 'add', goog.bind(function(e) {
          this.onAddComment_(e);
        }, this));
      }
    }, this));
  }
};


/**
 * @param {brkn.model.User} user
 * @param {boolean} online
 * @private
 */
brkn.sidebar.Info.prototype.addViewer_ = function(user, online) {
  if (!online && this.viewerEls_[user.id]) {
    goog.dom.classes.remove(this.viewerEls_[user.id], 'online');
    return;
  }
  if (user.id != brkn.model.Users.getInstance().currentUser.id || goog.DEBUG) {
    if (!this.viewerEls_[user.id]) {
      var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
        user: user
      });
      this.viewerEls_[user.id] = viewerEl;
      goog.dom.insertChildAt(this.viewersEl_, viewerEl, 1);
      this.getHandler()
          .listen(viewerEl, goog.events.EventType.CLICK, function() {
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user);
          });
      if (DESKTOP && !IPAD) {
        brkn.Popup.getInstance().hovercard(viewerEl, brkn.model.Popup.Position.TOP,
            brkn.model.Popup.Action.TOOLTIP, {'text': goog.bind(function() {
              return user.firstName() + (goog.dom.classes.has(viewerEl, 'online') ? ' is watching' : ' saw this')
            }, this)});
      }
    }

    goog.style.showElement(this.viewersEl_, true);
    goog.dom.classes.enable(this.viewerEls_[user.id], 'online', online);
  }
};


/**
 * @param {Event} e
 * @private
 */
brkn.sidebar.Info.prototype.tweetClick_ = function(e) {
  var targetEl = /** @type {Element} */ e.target;
  var tweetEl = goog.dom.getAncestorByClass(targetEl, 'tweet');
  if (tweetEl) {
    var tweetId = tweetEl.id.split('-')[1];
    var tweet = this.tweetsMap_[tweetId];
    if (goog.dom.classes.has(targetEl, 'reply')) {
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.REPLY_TWEET, tweet);
    }
  }
};


/**
 * @param {Event} e
 * @private
 */
brkn.sidebar.Info.prototype.commentClick_ = function(e) {
  var targetEl = /** @type {Element} */ e.target;
  var commentEl = goog.dom.getAncestorByClass(targetEl, 'comment');
  if (commentEl) {
    var commentId = commentEl.id.split('-')[1];
    var comment = this.commentsMap_[commentId];
    if (goog.dom.classes.has(targetEl, 'reply')) {
      var parentCommentEl = this.lastCommentEl_[(comment.parentId ? comment.parentId : comment.id)];
      goog.dom.getElementByClass('reply-textarea', parentCommentEl).focus();
    } else if (goog.dom.classes.has(targetEl, 'remove')) {
      this.media_.publish(brkn.model.Media.Actions.REMOVE_COMMENT, comment);
    }
  }
};


/**
 * @param {brkn.model.Comment} comment
 * @private
 */
brkn.sidebar.Info.prototype.removeComment_ = function(comment) {
  var commentEl = goog.dom.getElement('infocomment-' + comment.id);
  goog.dom.removeNode(commentEl);
  goog.array.removeIf(this.comments_, function(c) {return c.id == comment.id});
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.scrollGrad_ = function() {
  goog.dom.classes.enable(this.commentsEl_.parentElement, 'top-grad',
      !!this.commentsEl_.scrollTop);
  var maxHeight = this.commentsEl_.style.maxHeight;
  var viewHeight = goog.dom.getViewportSize().height;
  maxHeight = maxHeight.substring(0, maxHeight.length-2);
  var height = goog.style.getSize(this.commentsEl_).height;
  goog.dom.classes.enable(this.commentsEl_.parentElement, 'bottom-grad',
      this.commentsEl_.scrollTop < this.commentsEl_.scrollHeight - maxHeight - 5 &&
      height >= maxHeight && viewHeight > 640);
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 * @param {?boolean=} opt_scrollComments
 */
brkn.sidebar.Info.prototype.resize = function(opt_extra, opt_scrollComments) {
  this.resizeExtra_ = opt_extra != undefined ? opt_extra : this.resizeExtra_;
  var viewHeight = goog.dom.getViewportSize().height;

  if (this.getElement()) {
    var height = goog.dom.getViewportSize().height + (IPHONE && SAFARI ? 61 : 0) - 41 -
        this.resizeExtra_ - (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0);
    goog.style.setHeight(this.getElement(), height);

    goog.style.setHeight(this.contentsEl_, height - (this.mini_ ? 143 : 243) + (IPHONE ? 50 : 0) -
        (this.viewers_.length ? 38 : 0));
    if (viewHeight > 640 && this.commentsEl_ && this.commentsEl_.parentElement) {
      goog.style.setStyle(this.commentsEl_, 'max-height', viewHeight -
          goog.style.getPosition(this.commentsEl_.parentElement).y - (this.mini_ ? 213 : 313) -
          (this.viewers_.length ? 38 : 0) - this.resizeExtra_ + 'px');
      this.scrollGrad_();
    } else if (viewHeight < 640) {
      goog.style.setStyle(this.commentsEl_, 'max-height', '');
      this.scrollGrad_();
    }

    if (!brkn.model.Users.getInstance().currentUser.loggedIn) {
      var promoHeight = height - (this.mini_ ? 98 : 198) + (IPHONE ? 50 : 0);
      goog.style.setHeight(this.loginPromo_, promoHeight);
      goog.style.showElement(goog.dom.getElementByClass('promo-1', this.getElement()),
          promoHeight > 285);
      goog.style.showElement(goog.dom.getElementByClass('promo-2', this.getElement()),
          promoHeight > 365);
      goog.style.showElement(goog.dom.getElementByClass('promo-3', this.getElement()),
          promoHeight > 475);
    }

    if (opt_scrollComments) {
      // Give the comment div a second/2 to resize, then scroll to bottom.
      goog.Timer.callOnce(goog.bind(function() {
        var scrollAnim = new goog.fx.dom.Scroll(this.commentsEl_,
            [this.commentsEl_.scrollLeft, this.commentsEl_.scrollTop],
            [this.commentsEl_.scrollLeft, this.commentsEl_.scrollHeight], 400);
        scrollAnim.play();
      }, this), 0);
    }
  }
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onFacebookButton_ = function() {
  goog.style.showElement(goog.dom.getElement('overlay'), true);
  FB.ui(
      {
        method: 'feed',
        name: this.media_.name,
        link: this.media_.link,
        picture: this.media_.thumbnail,
        caption: 'on XYLO',
        description: this.media_.description
      },
      function(response) {
        goog.style.showElement(goog.dom.getElement('overlay'), false);
      }
    );

  brkn.model.Analytics.getInstance().share(this.media_.id, true, false);
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onTwitterButton_ = function() {
  var url = 'https://twitter.com/share?url=' + this.media_.link +
      '&text=I\'m watching ' + this.media_.name + ' ' + this.media_.link;
  if (IPHONE || IPAD) {
    var a = document.createElement('a');
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");

    var dispatch = document.createEvent("HTMLEvents")
    dispatch.initEvent("click", true, true);
    a.dispatchEvent(dispatch);
  } else {
    var newWindow = window.open(url,'Tweet','height=320,width=550');
    newWindow.moveTo(screen.width/2-225,
        screen.height/2-150)
    newWindow.focus();
    brkn.model.Analytics.getInstance().share(this.media_.id, false, true);
  }
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onPlayButton_ = function() {
  goog.dom.classes.add(this.playButton_.getElement(), 'play-loading');
  var program = brkn.model.Program.async((/** @type {brkn.model.Media} */ this.getModel()));
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onSendButton_ = function() {
  if (!goog.dom.classes.has(this.sendPopup_, 'decorated')) {
    var recipients = new brkn.sidebar.CommentInput(false, true, false, true, false, true);
    recipients.decorate(goog.dom.getElementByClass('recipients', this.sendPopup_));
    var messageInput = new brkn.sidebar.CommentInput(false, false, false, false, true, true);
    messageInput.decorate(goog.dom.getElementByClass('send-message', this.sendPopup_));

    this.getHandler()
        .listen(messageInput, 'add', goog.bind(function(e) {
          var tokens = recipients.getTokens();
          if (tokens.length) {
            goog.array.forEach(tokens, function(r) {
              var message = new brkn.model.Message({
                'from_user': brkn.model.Users.getInstance().currentUser,
                'to_user': r.id,
                'text': e.text || 'Sent you a video!',
                'media': this.model_
              });
              message.time = new goog.date.DateTime();
              message.relativeTime = goog.date.relative.format(message.time.getTime())
              brkn.model.Users.getInstance().publish(brkn.model.Users.Action.NEW_MESSAGE, message);

              goog.net.XhrIo.send(
                  '/_message',
                  e.callback,
                  'POST',
                  'from_id=' + brkn.model.Users.getInstance().currentUser.id +
                  '&to_id=' + r.id + '&text=' + message.text +
                  '&media_id=' + this.model_.id);
            }, this);
            recipients.clear();
            messageInput.clear();
            this.sendButton_.setChecked(false);
            goog.style.showElement(this.sendPopup_, false);
          }
      }, this))
      .listen(goog.dom.getElementByClass('close', this.sendPopup_),
          goog.events.EventType.CLICK, goog.bind(function() {
            goog.style.showElement(this.sendPopup_, false);
            this.sendButton_.setChecked(false);
          }, this));
      goog.dom.classes.add(this.sendPopup_, 'decorated');
  }
  goog.style.showElement(this.sendPopup_, this.sendButton_.isChecked());
};
