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
   * @type {brkn.model.Popup}
   * @private
   */
  this.model_ = brkn.model.Popup.getInstance();
  this.model_.subscribe(brkn.model.Popup.Action.SHARE,
      this.showForShare_, this);
  this.model_.subscribe(brkn.model.Popup.Action.SELECT_PROGRAM,
      this.showForSelectProgram_, this);
};
goog.inherits(brkn.Popup, goog.ui.Popup);
goog.addSingletonGetter(brkn.Popup);


/**
 * @type {goog.ui.LabelInput}
 */
brkn.Popup.prototype.suggestInput_;


/**
 * @type {string}
 * @constant
 */
brkn.Popup.YOUTUBE_DATA = 'https://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json'


/**
 * Will position the hovercard to the right-center of the element or
 * reposition if it doesn't fit in the viewport.
 *
 * @param {Element} anchor The anchor element.
 */
brkn.Popup.prototype.positionAtAnchor = function(anchor) {
  this.setPinnedCorner(goog.positioning.Corner.BOTTOM_LEFT);
  var topMargin = -1 * (goog.style.getSize(anchor).height +
      goog.style.getSize(this.getElement()).height) / 2;
  var leftMargin = -1 * (goog.style.getSize(this.getElement()).width -
      goog.style.getSize(anchor).width) / 2;
  this.setMargin(0, 3, 6, leftMargin);
  this.setPosition(new goog.positioning.AnchoredViewportPosition(
      anchor,
      goog.positioning.Corner.TOP_START));
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


/**
 * Show popup for a like object.
 * @param {Element} anchor The like element.
 * @private
 */
brkn.Popup.prototype.showForShare_ = function(anchor) {
  this.setVisible(false);
  this.positionAtAnchor(anchor);

  soy.renderElement(this.getContentElement(), brkn.popup.shareRecord, {
    id: 1
  });
  FB.XFBML.parse(document.getElementById('fblike'));

//  if (!like.hasData()) {
//    // The category wasn't populated. Fetch the facebook data and fill in.
//    like.fetchData(goog.bind(function() {
//      var categoryEl = goog.dom.getElementByClass('category',
//          this.getContentElement());
//      goog.dom.setTextContent(categoryEl, like.getCategory());
//    }, this));
//  }
//
//  var likeEl = /** @type {Element} */ this.getContentElement().firstChild;
//  goog.dom.classes.enable(likeEl, 'liked', isLiked);
//
//  var findLink = goog.dom.getElementByClass('find-link', likeEl);
//
//  var addButton = new goog.ui.CustomButton('ADD');
//  addButton.addClassName('add-button');
//  addButton.addClassName('blue');
//  addButton.render(likeEl);
//  addButton.setVisible(!isShared || isLiked);
//
//  var removeButton = new goog.ui.CustomButton('REMOVE');
//  removeButton.addClassName('add-button');
//  removeButton.addClassName('red');
//  removeButton.render(likeEl);
//
//  var image = /** @type {Element} */ goog.dom.getElementByClass('picture',
//      likeEl).firstChild;
//
//  this.handler_.
//      listen(addButton,
//          goog.ui.Component.EventType.ACTION,
//          function() {
//            this.addLike_(like);
//            if (goog.dom.classes.has(likeEl, 'unliked')) {
//              // Adding your own just removed like
//              goog.dom.classes.remove(likeEl, 'unliked');
//              goog.dom.classes.add(likeEl, 'liked');
//            } else {
//              // Adding a like from your partner
//              addButton.setEnabled(false);
//            }
//          }).
//      listen(removeButton,
//          goog.ui.Component.EventType.ACTION,
//          function() {
//            this.likeToRemove_ = like.id;
//            goog.dom.classes.remove(likeEl, 'liked');
//            goog.dom.classes.add(likeEl, 'unliked');
//          }).
//      listen(findLink,
//          goog.events.EventType.CLICK,
//          goog.bind(this.onFindLink_, this, like)).
//      listen(image,
//          goog.events.EventType.LOAD,
//          function() {
//            goog.style.showElement(image, true);
//            goog.Timer.callOnce(function() {
//              if (image.clientHeight < 80) {
//                goog.dom.classes.add(image, 'fix-height');
//              }
//              // Center the cropped picture.
//              image.style.marginLeft = -1 * image.clientWidth / 2 + 'px';
//              image.style.marginTop = -1 * image.clientHeight / 2 + 'px';
//            });
//          });

  this.setVisible(true);
};




