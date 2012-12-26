goog.provide('brkn.sidebar.Stream');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param  {Array.<Object>} activities
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Stream = function(activities) {
  goog.base(this);
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.activities_ = activities;
};
goog.inherits(brkn.sidebar.Stream, goog.ui.Component);


/** @inheritDoc */
brkn.sidebar.Stream.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  goog.dom.classes.add(el, 'stream');
  
  goog.array.forEach(this.activities_, function(activity) {
    var user = brkn.model.Users.getInstance().get(activity['user']);
    
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
          time: time.toUsTimeString()
        });
        break
      case 'comment':
        medias = [activity['comment']['media']]
        activityEl = soy.renderAsElement(brkn.sidebar.commentActivity, {
          user: user,
          activity: activity,
          time: time.toUsTimeString()
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
      
      // Image cropping
      this.getHandler().listen(img,
          goog.events.EventType.LOAD,
          function() {
            goog.style.showElement(img, true);
            goog.Timer.callOnce(function() {
              if (goog.style.getSize(img).height < goog.style.getSize(mediaEl).height + 50) {
                goog.dom.classes.add(img, 'fix-height');
              }
              
              if (goog.style.getSize(img).width > 2*goog.style.getSize(mediaEl).width) {
                goog.dom.classes.add(img, 'pan-left');
              } else if (goog.style.getSize(img).height > 2*goog.style.getSize(mediaEl).height) {
                goog.dom.classes.add(img, 'pan-top');
              }

              // Center the cropped picture.
              img.style.marginTop = -goog.style.getSize(img).height/2 + 'px';
              img.style.marginLeft = -goog.style.getSize(img).width/2 + 'px';
              goog.dom.classes.enable(mediaEl, 'stretched', goog.style.getSize(img).height > 360);
            });
          });
    }, this);

    goog.dom.appendChild(this.getElement(), (/** @type{Node} */ activityEl));
  }, this);
};
  
  