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
 * @param  {brkn.model.Media} media
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Info = function(media) {
  goog.base(this);

  this.setModel(media);

  /**
   * @type {brkn.model.Media}
   * @private
   */
  this.media_ = media;
  
  /**
   * @type {boolean}
   * @private
   */
  this.hasSeen_ = false;
  
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
   * @type {Object.<number, brkn.model.Comment>}
   * @private
   */
  this.commentsMap_ = {};

  /**
   * The last comment/reply element for a comment thread
   * @type {Object.<number, Element>}
   * @private
   */
  this.lastCommentEl_ = {};

  /**
   * @type {Array.<brkn.model.Tweet>}
   * @private
   */
  this.tweets_ = [];

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
    published: this.media_.getPublishDate()
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
  this.spinner_ = goog.dom.getElementByClass('loading', this.getElement())
  var img = /** @type {Element} */ picEl.firstChild;
  this.tweetHolderEl_ = goog.dom.getElementByClass('tweet-holder', this.getElement());
  this.tweetsEl_ = goog.dom.getElementByClass('tweets', this.getElement());
  this.dotNavEl_ = goog.dom.getElementByClass('dot-nav', this.getElement());
  this.commentsEl_ = goog.dom.getElementByClass('comments', this.getElement());
  this.noCommentsEl_ = goog.dom.getElementByClass('no-comments', this.getElement());
  this.commentInput_.render(this.getElement());
  this.starToggle_.decorate(goog.dom.getElementByClass('star', this.getElement()));
  this.fbButton_.decorate(goog.dom.getElementByClass('facebook', this.getElement()));
  this.twitterButton_.decorate(goog.dom.getElementByClass('twitter', this.getElement()));
  this.playButton_.decorate(goog.dom.getElementByClass('play', this.getElement()));
  this.plusButton_.decorate(goog.dom.getElementByClass('plus', this.getElement()));
  var tweetTimer = new goog.Timer(5000);

  goog.net.XhrIo.send('/_info/' + this.media_.id, goog.bind(function(e) {
    var response = goog.json.parse(e.target.getResponse());
    
    // Description
    if (response['description']) {
      goog.dom.getElementByClass('description', this.getElement()).innerHTML =
          goog.string.linkify.linkifyPlainText(response['description']);
    } else {
      goog.style.showElement(goog.dom.getElementByClass('desc-link', this.getElement()),
          false);
      goog.style.showElement(goog.dom.getElementByClass('scrollable', this.getElement()),
          false);
    }
    
    // Viewers
    var seen = /** @type {Array.<Object>} */ response['seen'];
 
    goog.array.forEach(seen, function(viewer) {
      var user = brkn.model.Users.getInstance().get_or_add(viewer);
      if (user.id != brkn.model.Users.getInstance().currentUser.id) {
        goog.style.showElement(this.viewersEl_, true);
        this.hasSeen_ = true;
        var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
          user: user
        });
        goog.dom.appendChild(this.viewersEl_, viewerEl);
        this.viewerEls_[viewer.id] = viewerEl;
        this.getHandler().listen(viewerEl, goog.events.EventType.CLICK, function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, viewer);
        });
      }
    }, this);
    
    goog.array.forEach(this.media_.onlineViewers, this.addViewer_, this);
    
    // Tweets
    var tweets = /** @type {Array.<Object>} */ response['tweets'];
    this.tweets_ = goog.array.map(tweets, function(tweet) {
      var t = new brkn.model.Tweet(tweet);
      this.addTweet_(t);
      this.currentDotEl_ = /** @type {Element} */ this.dotNavEl_.firstChild;
      goog.dom.classes.add(this.currentDotEl_, 'selected');
      return t;
    }, this);
    tweets.length && tweetTimer.start();
    
    // Comments
    var comments = /** @type {Array.<Object>} */ response['comments'];
    goog.style.showElement(this.commentsEl_.parentElement, true);
    goog.style.showElement(this.noCommentsEl_, !comments.length);
    comments = goog.array.map(comments, function(comment) {
      var c = new brkn.model.Comment(comment);
      this.addComment_(c);
      return c;
    }, this);
    goog.style.showElement(this.spinner_, false);
    this.resize();
  }, this));
  
  this.getHandler()
      .listen(window,
          'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(publisherEl,
          goog.events.EventType.CLICK,
          goog.bind(function() {
            brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_LIST,
                this.media_.publisher.name, undefined,
                '/admin/_media/publisher/' + this.media_.publisher['id'],
                this.media_.publisher.picture,
                this.media_.publisher.description,
                this.media_.publisher.link);
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
              tweetTimer.stop();
            }
          }, this))
      .listen(tweetTimer,
          goog.Timer.TICK,
          goog.bind(function() {
            var dotEl = this.currentDotEl_ && goog.dom.getNextElementSibling(this.currentDotEl_) ||
                goog.dom.getElementByClass('dot', this.getElement());
            this.toDot_(dotEl);
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
            });
          })
      .listen(scrollable,
              goog.events.EventType.SCROLL,
              goog.bind(function() {
                var opacity = (120-scrollable.scrollTop)/100;
                goog.style.setOpacity(publisherEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(titleEl, Math.min(1, Math.max(opacity, 0)));
                goog.style.setOpacity(img, Math.min(.5, Math.max(opacity, .1)));
                goog.dom.classes.enable(picEl, 'scrolled', scrollable.scrollTop > 10);
              }, this))
      .listen(this.commentsEl_,
              goog.events.EventType.SCROLL,
              goog.bind(this.scrollGrad_, this))
      .listen(this.commentsEl_,
              goog.events.EventType.CLICK,
              goog.bind(this.commentClick_, this))
      .listen(goog.dom.getElementByClass('desc-link', this.getElement()),
          goog.events.EventType.CLICK,
          goog.bind(function() {
            var scrolled = goog.dom.classes.toggle(picEl, 'scrolled');
            var scrollAnim = new goog.fx.dom.Scroll(scrollable,
                [scrollable.scrollLeft, scrollable.scrollTop],
                [scrollable.scrollLeft, (scrolled ? 170 : 0)], 300);
            scrollAnim.play();
          }, this));
  
  this.media_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment_, this);
  this.media_.subscribe(brkn.model.Media.Actions.ADD_TWEET, function(tweet) {
    this.addTweet_(tweet, true);
  }, this);
  this.media_.subscribe(brkn.model.Media.Actions.WATCHING, this.addViewer_, this);
};


/**
 * @param {Element} dotEl
 * @private
 */
brkn.sidebar.Info.prototype.toDot_ = function(dotEl) {
  if (!dotEl) {
    return;
  }
  this.currentDotEl_ && goog.dom.classes.remove(this.currentDotEl_, 'selected');
  this.currentDotEl_ = dotEl;
  goog.dom.classes.add(this.currentDotEl_, 'selected');
  var index = goog.array.findIndex(goog.dom.getChildren(this.dotNavEl_),
      function(element) {return element == dotEl});
  var scrollAnim = new goog.fx.dom.Scroll(this.tweetsEl_,
      [this.tweetsEl_.scrollLeft, this.tweetsEl_.scrollTop],
      [index * 300, this.tweetsEl_.scrollTop], 200);
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
      (e.parentId ? '&parent_id=' + e.parentId : ''));
  
  if (e.facebook) {
    FB.api('/me/feed', 'POST', {
      'message': e.text,
      'name': this.media_.name,
      'link': 'http://www.broken.tv',
      'picture': this.media_.thumbnail,
      'caption': 'on Broken.TV',
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
    timestamp: goog.date.relative.format(tweet.time.getTime())
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
 * @private
 */
brkn.sidebar.Info.prototype.addComment_ = function(comment) {
  this.comments_.push(comment);
  this.commentsMap_[comment.id] = comment;

  goog.style.showElement(this.noCommentsEl_, false);
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
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
    this.addComment_(reply);
  }, this);
};


/**
 * @param {brkn.model.User} user
 * @param {?boolean=} opt_offline
 * @private
 */
brkn.sidebar.Info.prototype.addViewer_ = function(user, opt_offline) {
  if (opt_offline && this.viewerEls_[user.id]) {
    goog.dom.classes.remove(this.viewerEls_[user.id], 'online');
  }
  if (user.id != brkn.model.Users.getInstance().currentUser.id || goog.DEBUG) {
    if (!this.viewerEls_[user.id]) {
      var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
        user: user
      });
      this.viewerEls_[user.id] = viewerEl;
      goog.dom.insertChildAt(this.viewersEl_, viewerEl, 1);
      this.getHandler().listen(viewerEl, goog.events.EventType.CLICK, function() {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user);
      });
    }
    goog.style.showElement(this.viewersEl_, true);
    goog.dom.setTextContent((/** @type {Element} */ this.viewersEl_.firstChild),
        'WATCHING' + (this.hasSeen_ ? ' + SEEN' : ''));
    goog.dom.classes.add(this.viewerEls_[user.id], 'online');
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
    var commentId = parseInt(commentEl.id.split('-')[1], 10);
    var comment = this.commentsMap_[commentId];
    if (goog.dom.classes.has(targetEl, 'reply')) {
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.REPLY_COMMENT,
          comment.parentId ? this.commentsMap_[comment.parentId] : comment, comment.user);
    } else if (goog.dom.classes.has(targetEl, 'remove')) {
      goog.net.XhrIo.send('/_comment', goog.functions.NULL(), 'POST', 'delete=true&id=' + commentId);
      
      var nextSibling = commentEl.nextSibling;
      goog.dom.removeNode(commentEl);
      while (goog.dom.classes.has(nextSibling, 'reply')) {
        nextSibling = nextSibling.nextSibling;
        goog.dom.removeNode(nextSibling);
      }
    }
  }
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.scrollGrad_ = function() {
  goog.dom.classes.enable(this.commentsEl_.parentElement, 'top-grad',
      !!this.commentsEl_.scrollTop);
  var maxHeight = this.commentsEl_.style.maxHeight;
  maxHeight = maxHeight.substring(0, maxHeight.length-2);
  var height = goog.style.getSize(this.commentsEl_).height;
  goog.dom.classes.enable(this.commentsEl_.parentElement, 'bottom-grad',
      this.commentsEl_.scrollTop < this.commentsEl_.scrollHeight - maxHeight - 5 &&
      height >= maxHeight);
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 * @param {?boolean=} opt_scrollComments
 */
brkn.sidebar.Info.prototype.resize = function(opt_extra, opt_scrollComments) {
  this.resizeExtra_ = opt_extra != undefined ? opt_extra : this.resizeExtra_;
  if (this.commentsEl_ && this.commentsEl_.parentElement) {
    goog.style.setStyle(this.commentsEl_, 'max-height', goog.dom.getViewportSize().height -
        goog.style.getPosition(this.commentsEl_.parentElement).y - 110 - this.resizeExtra_ + 'px');
  }
  this.scrollGrad_();
  
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
        link: 'http://www.xylocast.com',
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
  var url = 'https://twitter.com/share?url=www.xylocast.com&text=I\'m watching ' + this.media_.name;
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
  if (!(brkn.model.Player.getInstance().getCurrentProgram() &&
      brkn.model.Player.getInstance().getCurrentProgram().async)) {
    var program = brkn.model.Program.async((/** @type {brkn.model.Media} */ this.getModel()));
    brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
    this.playButton_.setActive(false);
    this.plusButton_.setChecked(false);
  } else {
    brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
        (/** @type {brkn.model.Media} */ this.getModel()), this.plusButton_.isChecked()); 
    brkn.model.Notify.getInstance().publish(brkn.model.Notify.Actions.FLASH,
        'Added to queue', this.media_.name, undefined, this.media_.thumbnail);
  }
};
