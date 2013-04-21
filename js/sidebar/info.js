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
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Info = function(media, opt_noFetch, opt_lastMedia, opt_lastInput) {
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
   * The last comment/reply element for a comment thread
   * @type {Object.<string, Element>}
   * @private
   */
  this.lastCommentEl_ = {};

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
  this.commentInput_ = new brkn.sidebar.CommentInput();
  
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
      .listen(this.plusButton_.getElement(), goog.events.EventType.MOUSEDOWN,
          goog.bind(this.onPlusMouseDown_, this))
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
            this.resize(brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT, true);
          }, this))
      .listen(this.commentInput_,
          'resize',
          goog.bind(function(e) {
            this.resize(brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT +
                (e.target.height_ - brkn.sidebar.CommentInput.INPUT_HEIGHT))
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
                var opacity = (120-scrollable.scrollTop)/100;
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
                [scrollable.scrollLeft, (scrolled ? 170 : 0)], 300);
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
    this.addViewer_(user, offline);
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
  var viewers = goog.array.map(seen, function(viewer) {
    var user = fetched ? brkn.model.Users.getInstance().get_or_add(viewer) : viewer;
    if (user.id != brkn.model.Users.getInstance().currentUser.id) {
      goog.style.showElement(this.viewersEl_, true);
      this.hasSeen_ = true;
      var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
        user: user,
        firstName: user.firstName
      });
      goog.dom.appendChild(this.viewersEl_, viewerEl);
      this.viewerEls_[viewer.id] = viewerEl;
      this.getHandler().listen(viewerEl, goog.events.EventType.CLICK, function() {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, viewer);
      });
    }
    return user;
  }, this);

  goog.object.forEach(this.media_.onlineViewers, function(viewer) {
    this.addViewer_(viewer);
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
      this.addComment_(c, i == comments.length - 1);
    }
    return c;
  }, this);
  goog.style.showElement(this.spinner_, false);
  this.resize();
  
  if (fetched) {
    this.media_.tweets = this.tweets_;
    this.media_.comments = comments;
    this.media_.seen = viewers;
    this.media_.fetched = true;
  }
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
  goog.net.XhrIo.send(
      '/_comment',
      e.callback,
      'POST',
      'media_id=' + this.media_.id + '&text=' + e.text +
      '&tweet=' + e.twitter + '&facebook=' + e.facebook +
      (e.parentId ? '&parent_id=' + e.parentId : '') +
      (e.toUserId ? '&to_user_id=' + e.toUserId : ''));

  if (e.facebook && !e.parentId) {
    FB.api('/me/feed', 'POST', {
      'message': e.text,
      'name': this.media_.name,
      'link': this.media_.link,
      'picture': this.media_.thumbnail,
      'caption': 'on XYLO',
      'description': this.media_.description
    }, function(response) {});

    // Disable facebook posting after first post
    this.commentInput_.setFacebook(false);
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
 * @private
 */
brkn.sidebar.Info.prototype.addComment_ = function(comment, opt_last) {
  this.comments_.push(comment);
  this.commentsMap_[comment.id] = comment;

  goog.style.showElement(this.noCommentsEl_, false);
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    prefix: 'infocomment',
    comment: comment,
    text: goog.string.linkify.linkifyPlainText(comment.text),
    timestamp: goog.date.relative.format(comment.time.getTime()),
    owner: (comment.user.id == brkn.model.Users.getInstance().currentUser.id)
  });
  brkn.model.Clock.getInstance().addTimestamp(comment.time,
      goog.dom.getElementByClass('timestamp', commentEl));
  if (comment.parentId) {
    goog.dom.insertSiblingAfter(commentEl, this.lastCommentEl_[comment.parentId]);
  } else {
    goog.dom.appendChild(this.commentsEl_, commentEl);
  }
  this.lastCommentEl_[(comment.parentId || comment.id)] = commentEl;
  this.resize(this.commentInput_.isFocused()
      ? brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT : 0, true);
  goog.array.forEach(comment.replies, function(reply) {
    this.addComment_(reply, opt_last);
  }, this);
  
  if (opt_last && this.media_.onlineViewers[comment.user.id]) {
    this.commentInput_.reply((comment.parentId || comment.id), comment.user);
  }
};


/**
 * @param {brkn.model.User} user
 * @param {?boolean=} opt_offline
 * @private
 */
brkn.sidebar.Info.prototype.addViewer_ = function(user, opt_offline) {
  if (opt_offline && this.viewerEls_[user.id]) {
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
            hovercard.style.top = containerPos.y + pos.y + 210 + 'px';
            goog.style.showElement(hovercard, true);
          })
          .listen(viewerEl, goog.events.EventType.MOUSEOUT, function(e) {
            var hovercard = goog.dom.getElement('hovercard');
            goog.style.showElement(hovercard, false);
          });
    }
    goog.style.showElement(this.viewersEl_, true);
    goog.dom.setTextContent(goog.dom.getElementByClass('status', this.viewersEl_),
        'WATCHING' + (this.hasSeen_ ? ' + SEEN' : ''));
    goog.dom.classes.add(this.viewerEls_[user.id], 'online');
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
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.REPLY_COMMENT,
          comment.parentId ? this.commentsMap_[comment.parentId] : comment, comment.user);
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
  goog.style.setHeight(this.contentsEl_, viewHeight - 283);
  if (viewHeight > 640 && this.commentsEl_ && this.commentsEl_.parentElement) {
    goog.style.setStyle(this.commentsEl_, 'max-height', viewHeight -
        goog.style.getPosition(this.commentsEl_.parentElement).y - 313 - this.resizeExtra_ + 'px'); 
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
brkn.sidebar.Info.prototype.onPlusMouseDown_ = function() {
  if (!(brkn.model.Player.getInstance().getCurrentProgram() &&
      brkn.model.Player.getInstance().getCurrentProgram().async)) {
    this.playButton_.setActive(true); 
    goog.Timer.callOnce(goog.bind(function() {
      // Just in case we don't complete click.
      this.playButton_.setActive(false); 
    }, this), 2000)
  }
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onPlusButton_ = function() {
//  if (!(brkn.model.Player.getInstance().getCurrentProgram() &&
//      brkn.model.Player.getInstance().getCurrentProgram().async)) {
//    var program = brkn.model.Program.async((/** @type {brkn.model.Media} */ this.getModel()));
//    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
//    this.playButton_.setActive(false);
//    this.plusButton_.setChecked(false);
//  } else {
    brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
        (/** @type {brkn.model.Media} */ this.getModel()), this.plusButton_.isChecked()); 
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'Added to queue', this.media_.name, undefined, this.media_.thumbnail);
//  }
};
