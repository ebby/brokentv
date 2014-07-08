goog.provide('brkn.sidebar.Messages');

goog.require('soy');
goog.require('brkn.model.Message');
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
  this.messages_ = opt_messages || [];

  /**
   * @type {?Object.<string, Element>}
   * @private
   */
  this.messageMap_ = {};

  /**
   * @type {brkn.sidebar.CommentInput}
   * @private
   */
  this.commentInput_ = new brkn.sidebar.CommentInput(false);

  /**
   * @type {number}
   * @private
   */
  this.resizeExtra_ = 0;

  /**
   * @type {boolean}
   * @private
   */
  this.inbox_ = this.user_.id == brkn.model.Users.getInstance().currentUser.id;

  /**
   * @type {goog.ui.CustomButton}
   */
  this.toggle_ = new goog.ui.CustomButton('Notifications');
  this.toggle_.setSupportedState(goog.ui.Component.State.CHECKED,
      true);

  this.count_ = 0;
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


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Messages.prototype.noMessagesEl_;

/**
 * @type {Element}
 * @private
 */
brkn.sidebar.Messages.prototype.moreMessagesEl_;


/** @inheritDoc */
brkn.sidebar.Messages.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  if (!this.inbox_) {
      el.innerHTML = '';
      el.scrollTop = 0;

      this.messagesEl_ = goog.dom.createDom('div', 'messages');
      goog.dom.appendChild(this.getElement(), this.messagesEl_);

      this.spinner_ = goog.dom.createDom('div', 'spinner');
      goog.dom.appendChild(this.messagesEl_, this.spinner_);
      goog.style.showElement(this.spinner_, false);

      this.noMessagesEl_ = goog.dom.createDom('div', 'no-comments',
          this.inbox_ ? 'No Messages' :'Start a private conversation.');
      goog.dom.appendChild(this.messagesEl_, this.noMessagesEl_);
  } else {
    this.toggle_.decorate(goog.dom.getElementByClass('toggle', this.getElement()));
    this.container_ = goog.dom.getElementByClass('container', this.getElement());

    this.messagesEl_ = goog.dom.getElementByClass('messages', this.getElement());
    goog.dom.classes.enable(this.messagesEl_, 'inbox', this.inbox_);

    this.spinner_ = goog.dom.createDom('div', 'spinner');
    goog.dom.appendChild(this.messagesEl_, this.spinner_);
    goog.style.showElement(this.spinner_, false);

    this.noMessagesEl_ = goog.dom.createDom('div', 'no-comments',
        this.inbox_ ? 'No Messages' :'Start a private conversation.');
    goog.dom.appendChild(this.messagesEl_, this.noMessagesEl_);
    goog.style.showElement(this.noMessagesEl_, false);

    this.getHandler()
        .listen(this.toggle_.getElement(),
            goog.events.EventType.CLICK,
            goog.bind(function(e) {
              goog.dom.classes.enable(this.getElement(), 'show', this.toggle_.isChecked());
            }, this))
        .listen(this.messagesEl_,
            goog.events.EventType.CLICK,
            goog.bind(function(e) {
              e.preventDefault();
              e.stopPropagation();
            }, this))
        .listen(window,
            goog.events.EventType.CLICK,
            goog.bind(function(e) {
              if (this.toggle_.isChecked()) {
                if (!goog.dom.getAncestorByClass(e.target, 'inbox')) {
                  goog.Timer.callOnce(goog.bind(function() {
                    goog.dom.classes.remove(this.getElement(), 'show');
                    this.toggle_.setChecked(false);
                  }, this));
                }
              }
            }, this));
    goog.style.showElement(this.spinner_, true);
    goog.net.XhrIo.send(
        '/_message/' + this.user_.id,
        goog.bind(function(e) {
          goog.style.showElement(this.spinner_, false);
          var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
          this.count_ = 0;
          this.messages_ = goog.array.map(response, function(m) {
            var message = new brkn.model.Message(m);
            this.count_ += (!message.read ? 1 : 0);
            this.addMessage_(message);
            return message;
          }, this);
          goog.style.showElement(this.noMessagesEl_, !this.messages_.length);
          goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
              this.count_ > 0 ? this.count_.toString() : '');
        }, this));
  }

  this.moreMessagesEl_ = goog.dom.createDom('div', 'no-comments', 'Load previous messages');
  goog.dom.appendChild(this.messagesEl_, this.moreMessagesEl_);
  goog.style.showElement(this.moreMessagesEl_, !this.inbox_ && this.messages_.length >= 10);
  goog.style.showElement(this.noMessagesEl_, true);

  if (!this.inbox_) {
    this.commentInput_.render(this.getElement());
    this.getHandler().listen(window, goog.events.EventType.CLICK, goog.bind(function(e) {
      if (!goog.dom.getAncestorByClass(e.target, 'comment-input') &&
          !this.commentInput_.getValue()) {
        this.commentInput_.setFocused(false);
        this.resize(0);
      }
    }, this))
    .listen(this.noMessagesEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.commentInput_.setFocused(true);
    }, this))
    .listen(this.moreMessagesEl_, goog.events.EventType.CLICK, goog.bind(this.loadMore_, this))
    .listen(this.commentInput_, 'add', goog.bind(this.onAddComment_, this))
    .listen(window, 'resize', goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)));
  } else {
    this.messages_ = this.messages_.reverse();
    brkn.model.Users.getInstance().currentUser.subscribe(brkn.model.User.Actions.READ_MESSAGE, function(fromId) {
      var msgEl = this.messageMap_[fromId];
      if (msgEl && goog.dom.classes.has(msgEl, 'unread')) {
        goog.dom.classes.remove(msgEl, 'unread');
        goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
            --this.count_ > 0 ? this.count_.toString() : '');
      }
    }, this);
  }

  goog.array.forEachRight(this.messages_, function(m) {
    this.addMessage_(m);
  }, this);

  brkn.model.Users.getInstance().subscribe(brkn.model.Users.Action.NEW_MESSAGE, function(m) {
    if (m.fromUser.id != brkn.model.Users.getInstance().currentUser.id &&
        (m.fromUser.id == this.user_.id || m.toUser.id == this.user_.id)) {
      if (this.inbox_) {
        // Remove last message by this sender
        var incr = true;
        var last = this.messageMap_[m.fromUser.id];
        if (last) {
          incr = !goog.dom.classes.has(last, 'unread');
          goog.dom.removeNode(last);
        }
        incr && goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
            ++this.count_ > 0 ? this.count_.toString() : '');
      }
      this.addMessage_(m, this.inbox_);
      this.resize();
    }
  }, this);
  this.resize();
};


/**
 * @private
 */
brkn.sidebar.Messages.prototype.loadMore_ = function() {
  this.moreMessagesEl_ && goog.style.showElement(this.moreMessagesEl_, false);
  goog.style.showElement(this.spinner_, true);
  goog.net.XhrIo.send(
      '/_message/' + this.user_.id + '?offset=' + this.messages_.length,
      goog.bind(function(e) {
        var response = /** @type {Array.<Object>} */ e.target.getResponseJson();
        if (response.length) {
          this.lastMessage_ = null;
          var separator = goog.dom.createDom('div', 'separator');
          goog.dom.insertChildAt(this.messagesEl_, separator, 3);
        }
        goog.style.showElement(this.spinner_, false);
        this.moreMessagesEl_ && goog.style.showElement(this.moreMessagesEl_, !!response.length);
        goog.array.forEachRight(response, function(m) {
          var message = new brkn.model.Message(m);
          this.messages_.push(message);
          this.addMessage_(message, true);
          return message
        }, this);
        if (response.length) {
          this.getElement().scrollTop = 0;
          this.lastMessage_ = null;
          this.getElement().scrollTop = separator.offsetHeight;
        }
      }, this));
};


/**
 * @param {brkn.model.Message} message
 * @param {?boolean=} opt_first
 * @private
 */
brkn.sidebar.Messages.prototype.addMessage_ = function(message, opt_first) {
  goog.style.showElement(this.noMessagesEl_, false);
  this.moreMessagesEl_ && goog.style.showElement(this.moreMessagesEl_,
      !this.inbox_ && this.messages_.length >= 10);
  var timeEl;
  var mediaEl;
  if (!this.inbox_ && this.lastMessage_ && this.lastMessage_.fromUser.id == message.fromUser.id) {
    var textEl = soy.renderAsElement(brkn.sidebar.messages.text, {
      message: message
    });
    goog.dom.appendChild(goog.dom.getElementByClass('texts', this.lastMessageEl_), textEl);
    if (message.media) {
      mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, {
        media: message.media
      });
      goog.dom.appendChild(goog.dom.getElementByClass('texts', this.lastMessageEl_), mediaEl);
    }
    timeEl = goog.dom.getElementByClass('timestamp', textEl);
  } else {
    var messageEl = soy.renderAsElement(brkn.sidebar.messages.message, {
      message: message,
      flip: message.fromUser.id == brkn.model.Users.getInstance().currentUser.id
    });
    this.lastMessage_ = message;
    this.lastMessageEl_ = messageEl;
    if (opt_first) {
      goog.dom.insertChildAt(this.messagesEl_, messageEl, 3);
    } else {
      goog.dom.appendChild(this.messagesEl_, messageEl);
    }
    timeEl = goog.dom.getElementByClass('timestamp', messageEl);
    goog.dom.classes.enable(messageEl, 'unread', !message.read)
    if (this.inbox_) {
      this.messageMap_[message.fromUser.id] = messageEl;
      this.getHandler().listen(messageEl, goog.events.EventType.CLICK, goog.bind(function() {
        if (!message.read) {
          message.setRead();
          goog.dom.classes.remove(messageEl, 'unread');
          goog.dom.setTextContent((/** @type {Element} */ this.toggle_.getElement().firstChild),
              --this.count_ > 0 ? this.count_.toString() : '');
        }
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.PROFILE, message.fromUser);
      }, this));
      if (opt_first) {
        var alert = goog.dom.getElement('mp3-1');
        alert.load();
        alert.play();
      }
    } else if (message.media) {
      mediaEl = soy.renderAsElement(brkn.sidebar.listMedia, {
        media: message.media
      });
      goog.dom.appendChild(goog.dom.getElementByClass('texts', messageEl), mediaEl);
    }
  }
  brkn.model.Clock.getInstance().addTimestamp(message.time, timeEl);
  if (!opt_first) {
    this.getElement().scrollTop = this.getElement().scrollHeight;
  }
  if (!this.inbox_ && !message.read && message.id &&
      brkn.model.Sidebar.getInstance().currentProfileId == message.fromUser.id) {
    message.setRead();
  }
  if (mediaEl) {
    var previewEl = goog.dom.getElementByClass('list-play', mediaEl);
    var plusEl = goog.dom.getElementByClass('list-plus', mediaEl);
    this.getHandler()
        .listen(mediaEl,
            goog.events.EventType.CLICK,
            goog.bind(function() {
              brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.MEDIA_INFO, message.media);
            }, this))
        .listen(previewEl,
            goog.events.EventType.CLICK,
            goog.bind(function(e) {
              e.preventDefault();
              e.stopPropagation();
              var program = brkn.model.Program.async(message.media);
              brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
            }, this))
       .listen(plusEl, goog.events.EventType.CLICK, function(e) {
            e.preventDefault();
            e.stopPropagation();
            brkn.model.Channels.getInstance().getMyChannel().publish(brkn.model.Channel.Action.ADD_QUEUE,
                message.media, true);
          });
  }
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
  if (this.inbox_) {
    this.dispatchEvent('resize');
  } else {
    this.resizeExtra_ = opt_extra || this.resizeExtra_;
    goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height +
        (IPHONE && SAFARI ? 61 : 0) - (DESKTOP ? 40 : 0) - 41 -
        this.resizeExtra_ - (goog.dom.getAncestorByClass(this.getElement(), 'tabbed') ? 30 : 0));
  }
};
