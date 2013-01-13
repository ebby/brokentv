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
};
goog.inherits(brkn.sidebar.Stream, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Stream.prototype.activitiesEl_;


/** @inheritDoc */
brkn.sidebar.Stream.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;

  goog.dom.classes.add(el, 'stream');
  this.activitiesEl_ = goog.dom.createDom('div', 'activities');
  goog.dom.appendChild(this.getElement(), this.activitiesEl_);
  
  var spinner = goog.dom.createDom('div', 'spinner', 'Loading more');
  goog.dom.appendChild(this.getElement(), spinner);
  goog.style.showElement(spinner, false);
  
  goog.array.forEach(this.activities_, function(activity) {
    this.addActivity_(activity)
  }, this);
  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_ACTIVITY, function(activity) {
    this.addActivity_(activity, true)
  }, this);
  
  this.getHandler().listen(this.getElement(), goog.events.EventType.SCROLL, goog.bind(function(e) {
    if (!this.finished_ && this.getElement().scrollTop + goog.dom.getViewportSize().height >
        this.getElement().scrollHeight - 60) {
      goog.style.showElement(spinner, true);
      goog.net.XhrIo.send(
          '/_activity' + (this.uid_ ? '/' + this.uid_ : '') + '?offset=' + this.count_,
          goog.bind(function(e) {
            var activities = /** @type {Array.<Object>} */ e.target.getResponseJson();
            this.finished_ = !activities.length;
            goog.dom.classes.enable(spinner, 'finished', this.finished_);
            goog.style.showElement(spinner, this.finished_);
            goog.array.forEach(activities, function(activity) {
              this.addActivity_(activity);
            }, this);
            
          }, this));
    }
  }, this));
};

/**
 * @param {Object} activity
 * @param {?boolean=} opt_insertTop
 * @private
 */
brkn.sidebar.Stream.prototype.addActivity_ = function(activity, opt_insertTop) {
  var user = brkn.model.Users.getInstance().get_or_add(activity['user']);
  var time = goog.date.fromIsoString(activity['time'] + 'Z');
  
  var activityEl;
  var medias = [];
  switch(activity.type) {
    case 'session':
      var channel = brkn.model.Channels.getInstance().get(activity['session']['channel_id'])
      medias = activity['session']['media']
      activityEl = soy.renderAsElement(brkn.sidebar.sessionActivity, {
        user: user,
        activity: activity,
        channel: channel,
        time: goog.date.relative.format(time.getTime())
      });
      break
    case 'comment':
      medias = [activity['comment']['media']]
      activityEl = soy.renderAsElement(brkn.sidebar.commentActivity, {
        user: user,
        activity: activity,
        time: goog.date.relative.format(time.getTime())
      });
      break
    default:
      return;
  }
  this.getHandler()
    .listen(goog.dom.getElementByClass('user', activityEl),
        goog.events.EventType.CLICK, function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user)
    })
    .listen(goog.dom.getElementByClass('picture', activityEl),
        goog.events.EventType.CLICK, function() {
          brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, user)
        });

  var mediasEl = goog.dom.getElementByClass('medias', activityEl);
  goog.array.forEach(medias, function(m) {
    var media = new brkn.model.Media(m);
    var mediaEl = soy.renderAsElement(brkn.sidebar.mediaPreview, { media: media });
    var img = goog.dom.getElementByClass('thumb', mediaEl);
    goog.dom.appendChild(mediasEl, mediaEl);
    
    this.getHandler().listen(mediaEl, goog.events.EventType.CLICK, function() {
      brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, media);
    });
  }, this);

  if (opt_insertTop) {
    goog.dom.insertChildAt(this.activitiesEl_, (/** @type {Node} */ activityEl), 0);
  } else {
    goog.dom.appendChild(this.activitiesEl_, (/** @type {Node} */ activityEl)); 
  }
  goog.Timer.callOnce(goog.partial(goog.dom.classes.add, activityEl, 'show'));
  this.count_++;
};
