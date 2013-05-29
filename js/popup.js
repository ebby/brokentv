goog.provide('brkn.Popup');

goog.require('goog.fx.dom.Scroll');
goog.require('goog.fx.easing');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.LabelInput');
goog.require('goog.ui.Popup');
goog.require('goog.Throttle');
goog.require('goog.events.PasteHandler');
goog.require('goog.events.PasteHandler.EventType');
goog.require('goog.net.XhrIo');
goog.require('soy');

goog.require('brkn.popup');
goog.require('brkn.model.Popup');


/**
 * Popup UI component.
 *
 * @constructor
 * @extends {goog.ui.Popup}
 */
brkn.Popup = function() {
  var el = goog.dom.getElement('popup');
  if (!el) {
    // Insert our base div into the document if not already there.
    el = soy.renderAsElement(brkn.popup.base);
    goog.dom.appendChild(document.body, el);
  }
  goog.base(this, el);

  goog.events.listen(window, goog.events.EventType.RESIZE,
      goog.bind(this.setVisible, this, false));
  goog.events.listen(this, goog.ui.PopupBase.EventType.HIDE,
      this.onHideInternal_);
  
  /**
   * @type {boolean}
   * @private
   */
  this.hovered_ = false;
  
  /**
   * @type {boolean}
   * @private
   */
  this.shouldClose_ = false;

  /**
   * @type {brkn.model.Popup}
   * @private
   */
  this.model_ = brkn.model.Popup.getInstance();
  this.model_.subscribe(brkn.model.Popup.Action.TOOLTIP,
      this.showTooltip_, this);
  this.model_.subscribe(brkn.model.Popup.Action.SELECT_PROGRAM,
      this.showForSelectProgram_, this);
  this.model_.subscribe(brkn.model.Popup.Action.HIDE,
      this.hide_, this);
  
  goog.events.listen(this.getElement(), goog.events.EventType.MOUSEOVER, goog.bind(function() {
    this.hovered_ = true;
  }, this));
  goog.events.listen(this.getElement(), goog.events.EventType.MOUSEOUT, goog.bind(function(e) {
    this.hovered_ = false;
    if (this.shouldClose_) {
      this.model_.publish(brkn.model.Popup.Action.HIDE);
    }
  }, this));
};
goog.inherits(brkn.Popup, goog.ui.Popup);
goog.addSingletonGetter(brkn.Popup);


/**
 * @type {goog.ui.LabelInput}
 */
brkn.Popup.prototype.suggestInput_;


/**
 * @type {number}
 * @private
 */
brkn.Popup.prototype.closeTimer_;


/**
 * @type {string}
 * @constant
 */
brkn.Popup.YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json'
  

/**
 * Show popup for a like object.
 * @param {Element} anchor The like element.
 * @param {brkn.model.Popup.Position} pos
 * @param {string} action
 * @param {?Object=} opt_args 
 */
brkn.Popup.prototype.hovercard = function(anchor, pos, action, opt_args) {
  goog.events.listen(anchor, goog.events.EventType.MOUSEOVER, goog.bind(function() {
    this.closeTimer_ && goog.Timer.clear(this.closeTimer_);
    this.shouldClose_ = false;
    this.model_.publish(action, anchor, pos, opt_args);
  }, this));
  goog.events.listen(anchor, goog.events.EventType.MOUSEOUT, goog.bind(function(e) {
    this.closeTimer_ = goog.Timer.callOnce(goog.bind(function() {
      if (!this.hovered_) {
        this.model_.publish(brkn.model.Popup.Action.HIDE);
      } else {
        this.shouldClose_ = true;
      }
    }, this), 100);
    
  }, this));
}


/**
 * Will position the hovercard to the right-center of the element or
 * reposition if it doesn't fit in the viewport.
 *
 * @param {Element} anchor The anchor element.
 * @param {brkn.model.Popup.Position} pos
 */
brkn.Popup.prototype.positionAtAnchor = function(anchor, pos) {
  if (pos == brkn.model.Popup.Position.TOP) {
    this.setPinnedCorner(goog.positioning.Corner.BOTTOM_LEFT);
    var leftMargin = -1 * (goog.style.getSize(this.getElement()).width -
        goog.style.getSize(anchor).width) / 2;
    this.setMargin(0, 0, 6, leftMargin);
    this.setPosition(new goog.positioning.AnchoredViewportPosition(
        anchor,
        goog.positioning.Corner.TOP_START));
    goog.dom.classes.set(this.getElement(), 'popup');
    goog.dom.classes.add(this.getElement(), 'top');
  } else if (pos == brkn.model.Popup.Position.LEFT) {
    this.setPinnedCorner(goog.positioning.Corner.TOP_LEFT);
    var topMargin = -1 * (goog.style.getSize(this.getElement()).height -
        goog.style.getSize(anchor).height) / 2;
    this.setMargin(topMargin, 6, 0, 0);
    this.setPosition(new goog.positioning.AnchoredViewportPosition(
        anchor,
        goog.positioning.Corner.TOP_END));
    goog.dom.classes.set(this.getElement(), 'popup');
    goog.dom.classes.add(this.getElement(), 'left');
  } else if (pos == brkn.model.Popup.Position.RIGHT) {
    this.setPinnedCorner(goog.positioning.Corner.TOP_LEFT);
    var topMargin = -1 * (goog.style.getSize(this.getElement()).height -
        goog.style.getSize(anchor).height) / 2;
    this.setMargin(topMargin, 0, 0, 6);
    this.setPosition(new goog.positioning.AnchoredViewportPosition(
        anchor,
        goog.positioning.Corner.TOP_END));
    goog.dom.classes.set(this.getElement(), 'popup');
    goog.dom.classes.add(this.getElement(), 'right');
  }
};


brkn.Popup.prototype.onHideInternal_ = function() {
	this.hide_();
	this.model_.publish(brkn.model.Popup.Action.ON_HIDE);
};


/**
 * @return {Element}
 */
brkn.Popup.prototype.getContentElement = function() {
	return goog.dom.getElementByClass('content', this.getElement());
};


/**
 * Show popup for a like object.
 * @param {Element} anchor The like element.
 * @param {brkn.model.Popup.Position} pos
 * @param {Object} args 
 * @private
 */
brkn.Popup.prototype.showTooltip_ = function(anchor, pos, args) {
  this.setVisible(false);
  this.positionAtAnchor(anchor, pos);
  
  soy.renderElement(this.getContentElement(), brkn.popup.tooltip, {
    text: args['text'],
    link: args['link']
  });
  this.setVisible(true);
}


/**
 * Show popup for a like object.
 * @param {Element} anchor The like element.
 * @param {brkn.model.Channel} channel The Channel 
 * @private
 */
brkn.Popup.prototype.showForSelectProgram_ = function(anchor, channel) {
  this.setVisible(false);
  this.setPinnedCorner(goog.positioning.Corner.TOP_LEFT);
  var topMargin = -1 * (goog.style.getSize(this.getElement()).height -
  		goog.style.getSize(anchor).height) / 2;
  this.setMargin(topMargin, 0, 0, 5);
  this.setPosition(new goog.positioning.AnchoredViewportPosition(
      anchor,
      goog.positioning.Corner.TOP_END));
  
  goog.dom.classes.add(this.getElement(), 'left');

  soy.renderElement(this.getContentElement(), brkn.popup.selectProgram);
  
  this.suggestInput_ = new goog.ui.LabelInput('paste a YouTube link');
  this.suggestInput_.decorate(goog.dom.getElementByClass('program-input', this.getElement()));
  
  var keyHandler = new goog.events.KeyHandler(this.suggestInput_.getElement());
  var pasteHandler = new goog.events.PasteHandler(this.suggestInput_.getElement());
	var throttle = new goog.Throttle(goog.bind(this.onProgramInput_, this, channel), 1000);
  
  this.setVisible(true);

  this.handler_
		  .listen(pasteHandler,
		  		goog.events.PasteHandler.EventType.AFTER_PASTE,
		  		goog.bind(this.onProgramInput_, this, channel))
			.listen(keyHandler,
		      goog.events.KeyHandler.EventType.KEY,
		      goog.bind(function() {
				    if (throttle) {
				    	throttle.fire();
				    }
					}, this))
		  .listen(this.suggestInput_.getElement(),
		  		goog.events.EventType.FOCUS,
		      goog.bind(this.onProgramInput_, this, channel));
};


/**
 * Show popup for a like object.
 * @param channel {brkn.model.Channel} channel The channel
 * @param e {Event} The event
 * @private
 */
brkn.Popup.prototype.onProgramInput_ = function(channel, e) {
	var contentEl = goog.dom.getElementByClass('select-content', this.getElement());
	try {
		var video = goog.ui.media.YoutubeModel.newInstance(this.suggestInput_.getValue());

		goog.net.XhrIo.send(		
				goog.string.subs(brkn.Popup.YOUTUBE_DATA, video.getVideoId()),
				goog.bind(function(e){
					var entry = goog.json.parse(e.target.getResponse())['entry'];
					var title = entry['title']['$t'];
					var thumb = entry['media$group']['media$thumbnail'][0]['url'];
					var el = goog.dom.getElementByClass('page2', this.getElement());
					soy.renderElement(el, brkn.popup.confirmMedia, {
						title: title,
						thumb: thumb
					});
					var confirmButton = new goog.ui.CustomButton('Yes');
					confirmButton.decorate(goog.dom.getElementByClass('button', el));
					
					var scrollAnim = new goog.fx.dom.Scroll(contentEl,
							[0, 0], [260, 0], 300, goog.fx.easing.easeOut);
					scrollAnim.play();
					this.handler_.listen(confirmButton,
							goog.ui.Component.EventType.ACTION,
							goog.bind(this.onAddProgram_, this, channel, video));
				}, this));
	} catch (error) {
		return;
	}
};


/**
 * Show popup for a like object.
 * @param {brkn.model.Channel} channel The channel
 * @param {goog.ui.media.YoutubeModel} video 
 * @private
 */
brkn.Popup.prototype.onAddProgram_ = function(channel, video) {
	goog.net.XhrIo.send(
		'/_addprogram',
		goog.bind(function(e) {
			var response = goog.json.parse(e.target.getResponse());
			var newProgram = new brkn.model.Program(response);
			channel.publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram);
			this.setVisible(false);
		}, this),
		'POST',
		'channel=' + channel.id +'&youtube_id=' + video.getVideoId());
};





