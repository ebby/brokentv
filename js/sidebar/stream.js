goog.provide('brkn.sidebar.Stream');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.model.Users');
goog.require('brkn.sidebar');
goog.require('brkn.sidebar.FriendList');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {Array.<Object>} activities
 * @param {?string=} opt_uid
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Stream = function(activities, opt_uid) {
  goog.base(this);
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.activities_ = activities;
  
  /**
   * @type {?string}
   * @private
   */
  this.uid_ = opt_uid || null;
  
  /**
   * @type {number}
   * @private
   */
  this.count_ = 0;
  
  /**
   * @type {boolean}
   * @private
   */
  this.showFriendList_ = !opt_uid;
  
  /**
   * @type {boolean}
   * @private
   */
  this.finished_ = false;
  
  /**
   * @type {Object}
   */
  this.fetched_ = {};
  
  /**
   * @type {Object}
   */
  this.channelDigest_ = {};
  
  /**
   * @type {Object}
   */
  this.mediaDigest_ = {};
  
  /**
   * @type {Object}
   */
  this.likeDigest_ = {};
  
  /**
   * @type {Object}
   */
  this.userLikes_ = {};
  
  /**
   * @type {Object}
   */
  this.renderedLikes_ = {};
  
  /**
   * Activity elements, sorted by timestamp
   * [{time, element}]
   * @type {Array.<Object>}
   */
  this.activityTimes_ = [];
};
goog.inherits(brkn.sidebar.Stream, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Stream.prototype.friendlistEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Stream.prototype.activitiesEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Stream.prototype.noActivitiesEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Stream.prototype.spinner_;


/** @inheritDoc */
brkn.sidebar.Stream.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;

  goog.dom.classes.add(el, 'stream');
  goog.dom.classes.add(el, 'ios-scroll');
  
  if (this.showFriendList_) {
    this.friendlistEl_ = goog.dom.createDom('div', 'friendlist');
    goog.dom.appendChild(this.getElement(), this.friendlistEl_);
    var activitiesLabel = goog.dom.createDom('div', 'label', 'ACTIVITY');
    goog.dom.appendChild(this.getElement(), activitiesLabel);
  }

  this.activitiesEl_ = goog.dom.createDom('div', 'activities');
  goog.dom.appendChild(this.getElement(), this.activitiesEl_);

  this.spinner_ = goog.dom.createDom('div', 'spinner');
  goog.dom.appendChild(this.getElement(), this.spinner_);
  goog.style.showElement(this.spinner_, false);
  
  this.noActivitiesEl_ = goog.dom.createDom('div', 'no-comments', this.uid_ ?
      'Your activity will appear here.': 'Friends\' activity will appear here.');
  goog.dom.appendChild(this.getElement(), this.noActivitiesEl_);

  this.digest_(this.activities_);

  if (this.showFriendList_) {
    this.friendList_ = new brkn.sidebar.FriendList(undefined, false);
    this.friendList_.decorate(this.friendlistEl_);
  }

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_ACTIVITY, function(activity) {
    if (this.uid_ == activity['user']['id'] ||
        (!this.uid_ && activity['user']['id'] != brkn.model.Users.getInstance().currentUser.id)) {
      this.addActivity_(activity, undefined, undefined, true);
    }
  }, this);
  
  this.getHandler()
      .listen(this.getElement(), goog.events.EventType.SCROLL, goog.bind(function(e) {
        if (!this.finished_ && this.getElement().scrollTop + goog.dom.getViewportSize().height >
            this.getElement().scrollHeight - 60) {
          this.fetchMore_();
        }
      }, this))
     .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)));
  this.resize();
};


/**
 * @private
 */
brkn.sidebar.Stream.prototype.fetchMore_ = function() {
  goog.style.showElement(this.spinner_, true);
  goog.net.XhrIo.send(
      '/_activity' + (this.uid_ ? '/' + this.uid_ : '') + '?offset=' + this.count_,
      goog.bind(function(e) {
        if (this.fetched_[e.target.getLastUri()]) {
          // Prevents multiple responses, which happens for some reason unknown.
          return;
        }
        this.fetched_[e.target.getLastUri()] = true;
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson()['activities'];
        this.finished_ = !activities.length;
        goog.dom.classes.enable(this.spinner_, 'finished', this.finished_);
        goog.style.showElement(this.spinner_, this.finished_);
        this.digest_(activities);
      }, this));
};


/**
 * @param {Array.<Object>} activities
 * @private
 */
brkn.sidebar.Stream.prototype.digest_ = function(activities) {
  this.channelDigest_ = [];
  this.mediaDigest_ = [];
  this.likeDigest_ = [];
  goog.array.forEach(activities, function(activity) {
    this.count_++;
    // Group sessions by channel and comments by media
    switch(activity['type']) {
      case 'session':
        var session = activity['session'];
        var sessions = goog.object.get(this.channelDigest_, session['channel_id'], []);
        sessions.push(session);
        this.channelDigest_[session['channel_id']] = sessions;
        break;
      case 'liked':
        if (!this.mediaDigest_[activity['media']['id']]) {
          var likes = goog.object.get(this.likeDigest_, activity['media']['id'], []);
          likes.push(activity)
          this.likeDigest_[activity['media']['id']] = likes;

          var userLikes = goog.object.get(this.userLikes_, activity['user']['id'], []);
          userLikes.push(activity)
          this.userLikes_[activity['user']['id']] = userLikes
        }
        break;
      case 'comment':
        var comment = activity['comment']
        var comments = goog.object.get(this.mediaDigest_, comment['media']['id'], []);
        comments.push(comment);
        this.mediaDigest_[comment['media']['id']] = comments;
        if (this.likeDigest_[comment['media']['id']]) {
          goog.object.remove(this.likeDigest_, comment['media']['id']);
        }
        break;
    };
  }, this);

  // Render sessions
  goog.object.forEach(this.channelDigest_, function(sessions) {
    this.addActivity_(undefined, sessions, 'session');
  }, this);
  
  // Render medias
  goog.object.forEach(this.mediaDigest_, function(activities) {
    this.addActivity_(undefined, activities, 'comment');
  }, this);
  
  // Render likes
  goog.object.forEach(this.likeDigest_, function(activities) {
    if (activities.length > 1) {
      this.addActivity_(undefined, activities, 'liked');
    }
  }, this);
  
  // Render likes
  goog.object.forEach(this.userLikes_, function(activities) {
    this.addActivity_(undefined, activities, 'liked');
  }, this);
};


/**
 * @param {?Object=} opt_activity
 * @param {?Array=} opt_digest
 * @param {?string=} opt_type
 * @param {?boolean=} opt_insertTop
 * @private
 */
brkn.sidebar.Stream.prototype.addActivity_ = function(opt_activity, opt_digest, opt_type,
    opt_insertTop) {
  goog.style.showElement(this.noActivitiesEl_, false);

  var activity = opt_activity || null;
  var digest = opt_digest || null;
  var type = activity ? activity['type'] : opt_type;
  var medias = [];
  var users = activity ? [brkn.model.Users.getInstance().get_or_add(activity['user'])] : [];
  var time = activity ? goog.date.fromIsoString(activity['time'] + 'Z') : null;

  if (digest) {
    goog.array.forEach(digest, function(obj) {
      if (!goog.array.find(users, function(u) {return u.id == obj['user']['id']})) {
        users.push(brkn.model.Users.getInstance().get_or_add(obj['user']));
      }
      var objTime = goog.date.fromIsoString((obj['time'] || obj['tune_in']) + 'Z');
      time = time && time.getTime() > objTime.getTime() ? time : objTime;

      if (type == 'session') {
        goog.array.forEach(obj['media'], function(media, i) {
          if (!this.mediaDigest_[media['id']] && !this.likeDigest_[media['id']] &&
              !goog.array.find(medias, function(m) {return m['id'] == media['id']})) {
            medias.push(media);
          }
        }, this);
      } else if (type == 'liked' && !this.renderedLikes_[obj['media']['id']]) {
        medias.push(obj['media']);
        this.renderedLikes_[obj['media']['id']] = true;
      }
    }, this);
  }

  var activityEl;
  switch(type) {
    case 'session':
      if (!this.uid_ && users.length < 2) {
        return;
      }
      var session = activity ? activity['session'] : digest[0];
      var channel = brkn.model.Channels.getInstance().get(session['channel_id']);
      medias = activity ? activity['session']['media'] : medias;
      if (medias.length > 3) {
        medias = medias.slice(0, 3);
      }
      activityEl = soy.renderAsElement(brkn.sidebar.sessionActivity, {
        users: users,
        channel: channel,
        time: goog.date.relative.format(time.getTime()),
        tunedOut: !!session['tune_out']
      });
      break
    case 'comment':
      medias = activity ? [activity['comment']['media']] :
          [brkn.model.Medias.getInstance().getOrAdd(digest[0]['media'])]
      var comments = goog.array.map(activity ? [activity['comment']] : digest, function(obj) {
          var c = new brkn.model.Comment(obj);
          c.text = goog.string.linkify.linkifyPlainText(c.text);
          c.text = c.text.replace(/@\[(\d+):([a-zA-z\s]+)\]/g, function(str, id, name) {
            return '<a href="#user:' + id + '">' + name + '</a>';
          });
          return c;
        });
      activityEl = soy.renderAsElement(brkn.sidebar.commentActivity, {
        comments: comments.reverse().slice(0, 3),
        users: users,
        media: medias[0]
      });
      break
    case 'liked':
      medias = activity ? [activity['media']] : medias
      activityEl = soy.renderAsElement(brkn.sidebar.likeActivity, {
        users: users,
        media_count: medias.length,
        time: goog.date.relative.format(time.getTime())
      });
      break
    default:
      return;
  }
  
  if (!medias.length) {
    return;
  }
  
  brkn.model.Clock.getInstance().addTimestamp(time,
      goog.dom.getElementByClass('timestamp', activityEl));
  
  var insertAt = goog.array.findIndex(this.activityTimes_,
      function(obj) { return obj['time'] < time.getTime() });
  goog.array.insertAt(this.activityTimes_, {
    'time': time,
    'element': activityEl
  }, insertAt);

  var mediasEl = goog.dom.getElementByClass('medias', activityEl);
  goog.array.forEach(medias, function(m) {
    var media = brkn.model.Medias.getInstance().getOrAdd(m);
    var mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, { media: media });
    var previewEl = goog.dom.getElementByClass('list-play', mediaEl);
    var plusEl = goog.dom.getElementByClass('list-plus', mediaEl);
    var img = goog.dom.getElementByClass('thumb', mediaEl);
    goog.dom.appendChild(mediasEl, mediaEl);

    this.getHandler()
        .listen(mediaEl, goog.events.EventType.CLICK, function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
        })
        .listen(previewEl, goog.events.EventType.CLICK, function(e) {
          e.preventDefault();
          e.stopPropagation();
          var program = brkn.model.Program.async(media);
          brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
        })
        .listen(plusEl, goog.events.EventType.CLICK, function(e) {
          e.preventDefault();
          e.stopPropagation();
          brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
              media, true);
        });
  }, this);

  if (opt_insertTop) {
    goog.dom.insertChildAt(this.activitiesEl_, (/** @type {Node} */ activityEl), 0);
  } else if (digest) {
    goog.dom.insertChildAt(this.activitiesEl_, (/** @type {Node} */ activityEl), insertAt);
  } else {
    goog.dom.appendChild(this.activitiesEl_, (/** @type {Node} */ activityEl));
  }
  goog.Timer.callOnce(goog.partial(goog.dom.classes.add, activityEl, 'show'));
};


brkn.sidebar.Stream.prototype.resize = function() {
  var height = goog.dom.getViewportSize().height - 40 -
      (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 40 : 10);
  
  goog.style.setHeight(this.getElement(), height);
  if (goog.style.getSize(this.activitiesEl_).height < height) {
    // Fetch to fill in the height
    this.fetchMore_();
  }
};