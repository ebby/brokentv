goog.provide('brkn.sidebar.Info');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Notify');
goog.require('brkn.model.Tweet');
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
  this.commentInput_ = new brkn.sidebar.CommentInput(true);
  
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
  this.plusButton_ = new goog.ui.CustomButton('Plus');
  this.plusButton_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);

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
    lastMediaId: this.lastMedia_ ? this.lastMedia_.id : null
  });
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.viewersEl_ = goog.dom.getElementByClass('viewers', this.getElement());
  var picEl = goog.dom.getElementByClass('picture', this.getElement());
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
  this.plusButton_.decorate(goog.dom.getElementByClass('plus', this.getElement()));
  this.tweetTimer_ = new goog.Timer(5000);
  this.watchWith_ = goog.dom.getElementByClass('watch-with', this.getElement());
  
  goog.dom.classes.enable(this.getElement(), 'mini', this.mini_);

  if (!this.fetch_ || this.media_.fetched) {
    this.renderInfo(false, this.media_.description, this.media_.seen, this.media_.tweets,
        this.media_.comments);
  } else if (this.fetch_) {
    goog.net.XhrIo.send('/_info/' + this.media_.id, goog.bind(function(e) {
      var response = goog.json.parse(e.target.getResponse());
      var description = response['description'];
      var seen = /** @type {Array.<Object>} */ response['seen'];
      var tweets = /** @type {Array.<Object>} */ response['tweets'];
      var comments = /** @type {Array.<Object>} */ response['comments'];
      this.renderInfo(true, description, seen, tweets, comments);
    }, this));
  }

  if (this.media_.publisher.id == 'youtubeUCAMPco9PqjBbI_MLsDOO4Jw' ||
      this.media_.publisher.id == 'youtubeAMPco9PqjBbI_MLsDOO4Jw') {
    this.setupUserPoll_(); 
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
      .listen(this.plusButton_, goog.ui.Component.EventType.ACTION,
          goog.bind(this.onPlusButton_, this))
      .listen(goog.dom.getElementByClass('local', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(function(e) {
            goog.style.showElement(goog.dom.getElementByClass('link-select', this.getElement()),
                true);
            goog.dom.getElementByClass('link-input', this.getElement()).select();
          }, this))
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
            this.resize(e.target.height_ - brkn.sidebar.CommentInput.INPUT_HEIGHT)
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
              if (this.commentInput_.collapse()) {
                this.resize(0);
              }
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
                var opacity = ((this.mini_ ? 100 : 120)-scrollable.scrollTop)/100;
                goog.style.setOpacity(publisherEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(titleEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(linksEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(img, Math.min(.5, Math.max(opacity, .1)));
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
  brkn.model.Users.getInstance().currentUser.subscribe(
      brkn.model.User.Actions.SET_STARRED, function() {
        this.starToggle_.setChecked(brkn.model.Users.getInstance().currentUser.isStarred(this.media_));
      }, this);
  brkn.model.Channels.getInstance().getMyChannel().subscribe(brkn.model.Channel.Action.ADD_QUEUE,
      function(media, add) {
        this.plusButton_.setChecked(add);
      }, this); 
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
 * @param {Array.<Object>} seen
 * @param {Array.<Object>} tweets
 * @param {Array.<Object>} comments
 */
brkn.sidebar.Info.prototype.renderInfo = function(fetched, description, seen, tweets, comments) {
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
  this.viewers_ = goog.array.map(seen, function(viewer) {
    var user = fetched ? brkn.model.Users.getInstance().get_or_add(viewer) :
        /** @type {brkn.model.User} */ viewer;
    if (user.id != brkn.model.Users.getInstance().currentUser.id) {
      goog.style.showElement(this.viewersEl_, true);
      this.hasSeen_ = true;
      this.addViewer_(user, false);
    }
    return user;
  }, this);

  goog.object.forEach(this.media_.onlineViewers, function(viewer) {
    this.addViewer_(viewer, true);
  }, this);
  
  // Tweets
  this.tweets_ = goog.array.map(tweets, function(tweet) {
    var t = fetched ? new brkn.model.Tweet(tweet) : /** @type {brkn.model.Tweet} */ tweet;
    this.addTweet_(t);
    this.currentDotEl_ = /** @type {Element} */ this.dotNavEl_.firstChild;
    goog.dom.classes.add(this.currentDotEl_, 'selected');
    return t;
  }, this);
  tweets.length && this.tweetTimer_.start();
  
  // Comments
  this.commentsEl_ && goog.style.showElement(this.commentsEl_.parentElement, true);
  goog.style.showElement(this.noCommentsEl_, !comments.length);
  comments = goog.array.map(comments, function(comment, i) {
    var c = fetched ? new brkn.model.Comment(comment) : /** @type {brkn.model.Comment} */ comment;
    if (!c.parentId) {
      this.addComment_(c);
    }
    return c;
  }, this);
  goog.style.showElement(this.spinner_, false);
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
brkn.sidebar.Info.prototype.setupUserPoll_ = function() {
  var question = goog.dom.getElementByClass('status', this.userPollEl_);
  var options = goog.dom.getElementByClass('poll-options', this.userPollEl_);
  
  goog.dom.setTextContent(question, 'WHO\'S YOUR FAVORITE FINALIST?');
  goog.dom.appendChild(options, soy.renderAsElement(brkn.sidebar.pollOption, {
    name: 'Kree Harrison',
    percent: '31%'
  }));
  goog.dom.appendChild(options, soy.renderAsElement(brkn.sidebar.pollOption, {
    name: 'Angie Miller',
    percent: '52%'
  }));
  goog.dom.appendChild(options, soy.renderAsElement(brkn.sidebar.pollOption, {
    name: 'Candice Glover',
    percent: '17%'
  }));
  
  goog.style.showElement(this.userPollEl_, true);
  
  this.getHandler().listen(options, goog.events.EventType.CLICK, goog.bind(function(e) {
    if (!goog.dom.classes.has(this.userPollEl_, 'voted')) {
      goog.dom.classes.add(this.userPollEl_, 'voted');
      var selected = goog.dom.getAncestorByClass(e.target, 'option');
      var name = goog.dom.getTextContent(goog.dom.getElementByClass('name', selected));
      goog.dom.classes.add(selected, 'selected');
      this.commentInput_.setValue('@americanidol I just voted for ' + name, true, true);
      this.commentInput_.setFocused(true);
      goog.array.forEach(goog.dom.getChildren(options), function(op) {
        var percentage = goog.dom.getTextContent(goog.dom.getElementByClass('percent-number', op));
        goog.dom.getElementByClass('percent', op).style.width = percentage;
      }, this);
    }
  }, this));
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
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    prefix: 'infocomment',
    comment: comment,
    text: goog.string.linkify.linkifyPlainText(comment.text),
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
  goog.array.forEach(comment.replies, function(reply) {
    this.addComment_(reply, opt_last);
  }, this);
  if (!comment.parentId && opt_last) {
    this.commentsEl_.scrollTop = this.commentsEl_.scrollHeight;
    this.contentsEl_.firstChild.scrollTop = this.contentsEl_.firstChild.scrollHeight;
  }
  if (comment.id) {
    this.activateComment_(comment, commentEl);
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
  if (!comment.parentId) {
    this.lastCommentEl_[comment.id] = commentEl;
    // Handle reply input
    var replyInput = goog.dom.getElementByClass('reply-textarea', commentEl);
    var keyHandler = new goog.events.KeyHandler(replyInput);
    this.getHandler().listen(keyHandler,
        goog.events.KeyHandler.EventType.KEY,
        goog.bind(function(e) {
          e.stopPropagation();
          if (e.keyCode == '13' && replyInput.value) {
            e.preventDefault();
            var reply = brkn.model.Comment.add(brkn.model.Users.getInstance().currentUser, 
                this.media_.id, replyInput.value, false, false, comment.id, comment.user.id);
            this.addComment_(reply);
            replyInput.value = '';
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
          })
          .listen(viewerEl, goog.events.EventType.MOUSEOVER, function() {
            var pos = goog.style.getPosition(viewerEl);
            var containerPos = goog.style.getPosition(this.viewersEl_);
            var hovercard = goog.dom.getElement('hovercard');
            goog.dom.setTextContent(hovercard, user.firstName() +
                (goog.dom.classes.has(viewerEl, 'online') ? ' is watching' : ' saw this'));
            var cardSize = goog.style.getSize(hovercard);
            hovercard.style.right = 320 - containerPos.x - pos.x - cardSize.width/2 - 12 + 'px';
            hovercard.style.top = containerPos.y + pos.y + 13 + 'px';
            goog.style.showElement(hovercard, true);
          })
          .listen(viewerEl, goog.events.EventType.MOUSEOUT, function(e) {
            var hovercard = goog.dom.getElement('hovercard');
            goog.style.showElement(hovercard, false);
          });
    }
    goog.style.showElement(this.viewersEl_, true);
//    goog.dom.setTextContent(goog.dom.getElementByClass('status', this.viewersEl_),
//        'WATCHING' + (this.hasSeen_ ? ' + SEEN' : ''));
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
      this.media_.publish(brkn.model.Media.Actions.REMOVE_COMMENT, commentId);
    }
  }
};


/**
 * @param {string} commentId
 * @private
 */
brkn.sidebar.Info.prototype.removeComment_ = function(commentId) {
  var commentEl = goog.dom.getElement('infocomment-' + commentId);
  var nextSibling = commentEl.nextSibling;
  goog.dom.removeNode(commentEl);
  goog.array.removeIf(this.comments_, function(c) {return c.id == commentId});
  while (nextSibling && goog.dom.classes.has(nextSibling, 'reply')) {
    nextSibling = nextSibling.nextSibling;
    goog.dom.removeNode(nextSibling);
  }
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

  goog.style.setHeight(this.contentsEl_, viewHeight - (this.mini_ ? 183 : 283) -
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
  
  if (opt_scrollComments) {
    // Give the comment div a second/2 to resize, then scroll to bottom.
    goog.Timer.callOnce(goog.bind(function() {
      var scrollAnim = new goog.fx.dom.Scroll(this.commentsEl_,
          [this.commentsEl_.scrollLeft, this.commentsEl_.scrollTop],
          [this.commentsEl_.scrollLeft, this.commentsEl_.scrollHeight], 400);
      scrollAnim.play();
    }, this), 0);
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
  var newWindow = window.open(url,'Tweet','height=320,width=550');
  newWindow.moveTo(screen.width/2-225,
      screen.height/2-150)
  newWindow.focus();
  brkn.model.Analytics.getInstance().share(this.media_.id, false, true);
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onPlayButton_ = function() {
  var program = brkn.model.Program.async((/** @type {brkn.model.Media} */ this.getModel()));
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onPlusButton_ = function() {
  brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
      (/** @type {brkn.model.Media} */ this.getModel()), this.plusButton_.isChecked());
};
