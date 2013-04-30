goog.provide('brkn.sidebar.Messages');

goog.require('soy');
goog.require('brkn.model.User');
goog.require('brkn.sidebar.CommentInput');
goog.require('brkn.sidebar.messages');

goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');



/**
 * @param {?brkn.model.User=} opt_user
 * @param {?Array.<brkn.model.Message>=} opt_messages
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.Messages = function(opt_user, opt_messages) {
  goog.base(this);

  /**
   * @type {?brkn.model.User}
   * @private
   */
  this.user_ = opt_user || null;

  /**
   * @type {?Array.<brkn.model.Message>}
   * @private
   */
  this.messages_ = opt_messages || null;

  /**
   * @type {brkn.sidebar.CommentInput}
   * @private
   */
  this.commentInput_ = new brkn.sidebar.CommentInput();

  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;
};
goog.inherits(brkn.sidebar.Messages, goog.ui.Component);


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Messages.prototype.messagesEl_;


/**
 * @type {brkn.model.Message}
 * @private
 */
brkn.sidebar.Messages.prototype.lastMessage_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Messages.prototype.lastMessageEl_;


/** @inheritDoc */
brkn.sidebar.Messages.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);
  
  el.innerHTML = '';
  el.scrollTop = 0;
  
  this.messagesEl_ = goog.dom.createDom('div', 'messages');
  goog.dom.appendChild(this.getElement(), this.messagesEl_);
  
  if (this.user_.id != brkn.model.Users.getInstance().currentUser.id) {
    this.commentInput_.render(this.getElement());  
  }
  
  this.getHandler()
      .listen(this.commentInput_, 'add', goog.bind(this.onAddComment_, this))
      .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)));
  
  goog.array.forEach(this.messages_, function(m) {
    this.addMessage_(m);
  }, this);

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_MESSAGE, function(m) {
    if (m.fromUser.id == this.user_.id || m.toUser.id == this.user_.id) {
      this.addMessage_(m); 
      this.resize();
    }
  }, this);
  
  this.resize();
};


/**
 * @param {brkn.model.Message} message
 * @private
 */
brkn.sidebar.Messages.prototype.addMessage_ = function(message) {
  //goog.style.showElement(this.noMessagesEl_, false);
  var timeEl;
  if (this.lastMessage_ && this.lastMessage_.fromUser.id == message.fromUser.id) {
    var textEl = soy.renderAsElement(brkn.sidebar.messages.text, {
      message: message
    });
    goog.dom.appendChild(goog.dom.getElementByClass('texts', this.lastMessageEl_), textEl);
    timeEl = goog.dom.getElementByClass('timestamp', textEl);
  } else {
    var messageEl = soy.renderAsElement(brkn.sidebar.messages.message, {
      message: message,
      flip: message.fromUser.id == brkn.model.Users.getInstance().currentUser.id
    });
    this.lastMessage_ = message;
    this.lastMessageEl_ = messageEl;
    goog.dom.appendChild(this.messagesEl_, messageEl);
    timeEl = goog.dom.getElementByClass('timestamp', messageEl);
  }
  brkn.model.Clock.getInstance().addTimestamp(message.time, timeEl);
};


/**
 * @param {Object} e
 * @private
 */
brkn.sidebar.Messages.prototype.onAddComment_ = function(e) {
  var message = new brkn.model.Message({
    'from_user': brkn.model.Users.getInstance().currentUser,
    'to_user': brkn.model.Users.getInstance().get_or_add(this.user_),
    'text': e.text
  });
  message.time = new goog.date.DateTime();
  message.relativeTime = goog.date.relative.format(message.time.getTime()) 
  
  this.addMessage_(message);
  
  goog.net.XhrIo.send(
      '/_message',
      e.callback,
      'POST',
      'from_id=' + brkn.model.Users.getInstance().currentUser.id + 
      '&to_id=' + this.user_.id + '&text=' + e.text);
};


/**
 * @param {?number=} opt_extra Extra space to subtract
 * @private
 */
brkn.sidebar.Messages.prototype.resize = function(opt_extra) {
  this.resizeExtra_ = opt_extra || this.resizeExtra_;
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 42 -
      this.resizeExtra_ - (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
};
