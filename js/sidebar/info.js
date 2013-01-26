goog.provide('brkn.sidebar.Info');

goog.require('soy');
goog.require('brkn.model.Comment');
goog.require('brkn.model.Tweet');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.CommentInput');

goog.require('goog.date.relative');
goog.require('goog.fx.dom.Scroll');
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
    published: this.media_.getPublishDate()
  });
  el.innerHTML = contentEl.innerHTML;
};


/** @inheritDoc */
brkn.sidebar.Info.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.media_.subscribe(brkn.model.Media.Actions.ADD_COMMENT, this.addComment_, this);
  
  var viewersEl = goog.dom.getElementByClass('viewers', this.getElement());
  var picEl = goog.dom.getElementByClass('picture', this.getElement());
  var scrollable = goog.dom.getElementByClass('scrollable', this.getElement());
  var publisherEl = goog.dom.getElementByClass('publisher', this.getElement());
  var titleEl = goog.dom.getElementByClass('title', this.getElement());
  var img = /** @type {Element} */ picEl.firstChild;
  this.tweetHolderEl_ = goog.dom.getElementByClass('tweet-holder', this.getElement());
  this.tweetsEl_ = goog.dom.getElementByClass('tweets', this.getElement());
  this.dotNavEl_ = goog.dom.getElementByClass('dot-nav', this.getElement());
  this.commentsEl_ = goog.dom.getElementByClass('comments', this.getElement());
  this.commentInput_.render(this.getElement());
  this.starToggle_.decorate(goog.dom.getElementByClass('star', this.getElement()));
  this.fbButton_.decorate(goog.dom.getElementByClass('facebook', this.getElement()));
  this.twitterButton_.decorate(goog.dom.getElementByClass('twitter', this.getElement()));
  this.playButton_.decorate(goog.dom.getElementByClass('play', this.getElement()));
  this.plusButton_.decorate(goog.dom.getElementByClass('plus', this.getElement()));
  var tweetTimer = new goog.Timer(5000);

  goog.net.XhrIo.send('/_info/' + this.media_.id, goog.bind(function(e) {
    var response = goog.json.parse(e.target.getResponse());
    
    // Viewers
    var seen = /** @type {Array.<Object>} */ response['seen'];
    goog.style.showElement(viewersEl, seen.length);
    goog.array.forEach(seen, function(viewer) {
      var viewerEl = soy.renderAsElement(brkn.sidebar.viewer, {
        user: brkn.model.Users.getInstance().get_or_add(viewer)
      });
      goog.dom.appendChild(viewersEl, viewerEl);
      this.getHandler().listen(viewerEl, goog.events.EventType.CLICK, function() {
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, viewer)
      });
    }, this);
    
    // Tweets
    var tweets = /** @type {Array.<Object>} */ response['tweets'];
    goog.array.forEach(tweets, function(tweet) {
      var t = new brkn.model.Tweet(tweet);
      this.addTweet_(t);
      this.currentDotEl_ = /** @type {Element} */ this.dotNavEl_.firstChild;
      goog.dom.classes.add(this.currentDotEl_, 'selected');
    }, this);
    tweets.length && tweetTimer.start();
    
    // Comments
    var comments = /** @type {Array.<Object>} */ response['comments'];
    goog.style.showElement(goog.dom.getParentElement(this.commentsEl_), comments.length);
    goog.array.forEach(comments, function(comment) {
      var c = new brkn.model.Comment(comment);
      this.addComment_(c);
    }, this);
    
    this.resize();
  }, this));
  
  this.getHandler()
      .listen(window,
          'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(publisherEl,
          goog.events.EventType.CLICK,
          goog.bind(function() {
            goog.net.XhrIo.send(
                '/admin/_media/publisher/' + this.media_.publisher.id,
                goog.bind(function(e) {
                  var medias = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
                  medias = goog.array.map(medias, function(m) {
                    return new brkn.model.Media(m);
                  });
                  brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_LIST,
                      medias, this.media_.publisher.name, this.media_.publisher.picture,
                      this.media_.publisher.description);
                }, this));
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
      .listen(this.commentInput_,
          'add',
          goog.bind(this.onAddComment_, this))
      .listen(this.commentInput_,
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            this.resize(brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT);
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
              this.commentInput_.collapse();
              this.resize();
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
      .listen(goog.dom.getElementByClass('desc-link'),
          goog.events.EventType.CLICK,
          goog.bind(function() {
            var scrolled = goog.dom.classes.toggle(picEl, 'scrolled');
            var scrollAnim = new goog.fx.dom.Scroll(scrollable,
                [scrollable.scrollLeft, scrollable.scrollTop],
                [scrollable.scrollLeft, (scrolled ? 180 : 0)], 300);
            scrollAnim.play();
          }, this));
};


/**
 * @param {Element} dotEl
 * @private
 */
brkn.sidebar.Info.prototype.toDot_ = function(dotEl) {
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
      'media_id=' + this.media_.id + '&text=' + e.text + '&tweet=' + e.twitter);
  
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
};


/**
 * @param {brkn.model.Tweet} tweet
 * @private
 */
brkn.sidebar.Info.prototype.addTweet_ = function(tweet) {
  var tweetEl = soy.renderAsElement(brkn.sidebar.tweet, {
    tweet: tweet,
    timestamp: goog.date.relative.format(tweet.time.getTime())
  });
  brkn.model.Clock.getInstance().addTimestamp(tweet.time,
      goog.dom.getElementByClass('timestamp', tweetEl));
  goog.dom.appendChild(this.tweetsEl_, tweetEl);
  goog.dom.appendChild(this.dotNavEl_, goog.dom.createDom('div', 'dot'));
  this.resize();
  goog.style.showElement(goog.dom.getParentElement(this.tweetsEl_), true);
};


/**
 * @param {brkn.model.Comment} comment
 * @private
 */
brkn.sidebar.Info.prototype.addComment_ = function(comment) {
  var commentEl = soy.renderAsElement(brkn.sidebar.comment, {
    comment: comment,
    timestamp: goog.date.relative.format(comment.time.getTime())
  });
  brkn.model.Clock.getInstance().addTimestamp(comment.time,
      goog.dom.getElementByClass('timestamp', commentEl));
  goog.dom.appendChild(this.commentsEl_, commentEl);
  this.resize(this.commentInput_.isFocused()
      ? brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT : 0);
  goog.style.showElement(goog.dom.getParentElement(this.commentsEl_), true);
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 */
brkn.sidebar.Info.prototype.resize = function(opt_extra) {
  var extra = opt_extra + 10 || 10;
  if (this.commentsEl_) {
    goog.style.setHeight(this.commentsEl_, goog.dom.getViewportSize().height -
        goog.style.getPosition(this.commentsEl_.parentElement).y - 100 - extra);
  }

  // Give the comment div a second/2 to resize, then scroll to bottom.
  goog.Timer.callOnce(goog.bind(function() {
    var scrollAnim = new goog.fx.dom.Scroll(this.commentsEl_,
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollTop],
        [this.commentsEl_.scrollLeft, this.commentsEl_.scrollHeight], 400);
    scrollAnim.play();
  }, this), opt_extra ? 0 : 100);
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
        link: 'http://www.broken.tv',
        picture: this.media_.thumbnail,
        caption: 'on Broken.TV',
        description: this.media_.description
      },
      function(response) {
        goog.style.showElement(goog.dom.getElement('overlay'), false);
      }
    );
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onTwitterButton_ = function() {
  var url = 'https://twitter.com/share?url=www.broken.tv&text=I\'m watching ' + this.media_.name;
  var newWindow = window.open(url,'Tweet','height=300,width=550');
  newWindow.moveTo(screen.width/2-225,
      screen.height/2-150)
  newWindow.focus();
};


/**
 * @private
 */
brkn.sidebar.Info.prototype.onPlayButton_ = function() {
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC,
      this.getModel());
};