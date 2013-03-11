goog.provide('brkn.sidebar.Stream');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.model.Users');
goog.require('brkn.sidebar');

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
  this.finished_ = false;
  
  /**
   * @type {Object}
   */
  this.fetched_ = [];
  
  /**
   * @type {Object}
   */
  this.channelDigest_ = [];
  
  /**
   * @type {Object}
   */
  this.mediaDigest_ = [];
  
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
  this.activitiesEl_ = goog.dom.createDom('div', 'activities');
  goog.dom.appendChild(this.getElement(), this.activitiesEl_);

  this.spinner_ = goog.dom.createDom('div', 'spinner');
  goog.dom.appendChild(this.getElement(), this.spinner_);
  goog.style.showElement(this.spinner_, false);
  
  this.noActivitiesEl_ = goog.dom.createDom('div', 'no-comments', this.uid_ ?
      'Your activity will appear here.': 'Friends\' activity will appear here.');
  goog.dom.appendChild(this.getElement(), this.noActivitiesEl_);
  

  this.digest_(this.activities_);
  
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
        var activities = /** @type {Array.<Object>} */ e.target.getResponseJson();
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
      case 'comment':
        var comment = activity['comment']
        var comments = goog.object.get(this.mediaDigest_, comment['media']['id'], []);
        comments.push(comment);
        this.mediaDigest_[comment['media']['id']] = comments;
        break;
    };
  }, this);

  // Render sessions
  goog.object.forEach(this.channelDigest_, function(sessions, channelId) {
    this.addActivity_(undefined, sessions, 'session');
  }, this);
  
  // Render medias
  goog.object.forEach(this.mediaDigest_, function(activities, channelId) {
    this.addActivity_(undefined, activities, 'comment');
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
          if (!this.mediaDigest_[media['id']] &&
              !goog.array.find(medias, function(m) {return m['id'] == media['id']})) {
            medias.push(media);
          }
        }, this);
      }
    }, this);
  }

  var activityEl;
  switch(type) {
    case 'session':
      var session = activity ? activity['session'] : digest[0];
      var channel = brkn.model.Channels.getInstance().get(session['channel_id']);
      medias = activity ? activity['session']['media'] : medias;
      activityEl = soy.renderAsElement(brkn.sidebar.sessionActivity, {
        users: users,
        channel: channel,
        time: goog.date.relative.format(time.getTime()),
        tunedOut: !!session['tune_out']
      });
      break
    case 'comment':
      medias = activity ? [activity['comment']['media']] : [digest[0]['media']]
      var comments = activity ? [new brkn.model.Comment(activity['comment'])] : [];
      if (digest) {
        goog.array.forEach(digest, function(obj) {
          comments.push(new brkn.model.Comment(obj));
        });
      }
      activityEl = soy.renderAsElement(brkn.sidebar.commentActivity, {
        comments: comments.reverse(),
        users: users,
        media: medias[0]
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
    var media = new brkn.model.Media(m);
    var mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, { media: media });
    var img = goog.dom.getElementByClass('thumb', mediaEl);
    goog.dom.appendChild(mediasEl, mediaEl);

    this.getHandler().listen(mediaEl, goog.events.EventType.CLICK, function() {
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
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