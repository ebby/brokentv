goog.provide('brkn.sidebar.CommentInput');

goog.require('soy');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {?boolean=} opt_showControls
 * @param {?boolean=} opt_canMention
 * @param {?boolean=} opt_reply
 * @param {?boolean=} opt_toField
 * @param {?boolean=} opt_inputOptional
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.CommentInput = function(opt_showControls, opt_canMention, opt_reply, opt_toField,
    opt_inputOptional) {
  goog.base(this);
  
  /**
   * @type {boolean}
   * @private
   */
  this.showControls_ = !!opt_showControls;
  
  /**
   * @type {boolean}
   * @private
   */
  this.toField_ = !!opt_toField;
  
  /**
   * @type {boolean}
   * @private
   */
  this.inputOptional_ = !!opt_inputOptional;
  
  /**
   * @type {boolean}
   * @private
   */
  this.canMention_ = !!opt_canMention;
  
  /**
   * @type {boolean}
   * @private
   */
  this.reply_ = !!opt_reply;
  
  /**
   * @type {string}
   * @private
   */
  this.value = '';
  
  /**
   * @type {goog.ui.Textarea}
   * @private
   */
  this.commentInput_ = new goog.ui.Textarea(this.reply_ ? 'reply...' : 'Add to the conversation.');
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.tweetToggle_ = new goog.ui.CustomButton('tweet');
  this.tweetToggle_.setSupportedState(goog.ui.Component.State.CHECKED, true);
  
  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.fbToggle_ = new goog.ui.CustomButton('post');
  this.fbToggle_.setSupportedState(goog.ui.Component.State.CHECKED, true);

  var currentUser = brkn.model.Users.getInstance().currentUser;
  
  /**
   * @type {boolean}
   * @private
   */
  this.fbPublish_ = currentUser.postFacebook;
  
  /**
   * @type {boolean}
   * @private
   */
  this.twitterPublish_ = currentUser.postTwitter;
  
  /**
   * @type {boolean}
   * @private
   */
  this.twitterAuthUrl_;

  /**
   * @type {goog.ui.CustomButton}
   * @private
   */
  this.addCommentButton_ = new goog.ui.CustomButton('add');

  /**
   * @type {?brkn.model.User}
   * @private
   */
  this.replyUser = null;
  
  /**
   * @type {Object.<string, brkn.model.User>}
   * @private
   */
  this.tokens_ = {};
  
  /**
   * @type {Array.<brkn.model.User>}
   * @private
   */
  this.suggestions_ = [];
  
  /**
   * @type {number}
   * @private
   */
  this.cursorIndex_ = -1;
  
  /**
   * @type {number}
   * @private
   */
  this.lastTokenIndex_ = 0;
  
  /**
   * @type {?Element}
   * @private
   */
  this.token_ = null;

  /**
   * @type {?string}
   */
  this.parentComment = null;
};
goog.inherits(brkn.sidebar.CommentInput, goog.ui.Component);


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.COMMENT_CONTROLS_HEIGHT = 25;


/**
 * @type {number}
 * @constant
 */
brkn.sidebar.CommentInput.INPUT_HEIGHT = 41;


/**
 * @type {RegExp}
 * @constant
 */
brkn.sidebar.CommentInput.MENTION_REGEX = /@(\w+\s?\w*)/;


/**
 * @type {RegExp}
 * @constant
 */
brkn.sidebar.CommentInput.TO_REGEX = /(\w+\s?\w*)/;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.commentControls_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.inputHolder_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.suggestionsEl_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.CommentInput.prototype.highlighterEl_;


/** @inheritDoc */
brkn.sidebar.CommentInput.prototype.createDom = function() {
  var el = soy.renderAsElement(brkn.sidebar.commentInput);
  this.setElementInternal(el);
};


/** @inheritDoc */
brkn.sidebar.CommentInput.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  goog.dom.classes.add(el, 'decorated');
  goog.dom.appendChild(el, goog.dom.createDom('div', 'suggestions'));
  goog.dom.appendChild(el, goog.dom.createDom('div', 'highlighter'));
};


/** @inheritDoc */
brkn.sidebar.CommentInput.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.commentInput_.decorate(
      goog.dom.getElementsByTagNameAndClass('textarea', undefined, this.getElement())[0]);
  this.commentInput_.setMaxHeight(70);
  var keyHandler = new goog.events.KeyHandler(this.commentInput_.getKeyEventTarget());
  var popup = goog.dom.getElementByClass('popup', this.getElement());
  
  if (!this.reply_ && !this.toField_) {
    this.addChild(this.addCommentButton_);
    this.addCommentButton_.decorate(goog.dom.getElementByClass('add-comment', this.getElement()));
    this.addCommentButton_.setEnabled(this.inputOptional_);
    
    this.getHandler()
        .listen(this.addCommentButton_,
            goog.ui.Component.EventType.ACTION,
            goog.bind(this.onAddComment_, this));
    
    this.commentControls_ = goog.dom.getElementByClass('comment-controls', this.getElement());
    if (this.commentControls_) {
      goog.style.showElement(this.commentControls_, this.showControls_);
      goog.dom.classes.enable(this.getElement(), 'show-controls', this.showControls_);
      this.inputHolder_ = goog.dom.getElementByClass('input-holder', this.getElement());
      
      this.addChild(this.tweetToggle_);
      this.tweetToggle_.decorate(goog.dom.getElementByClass('tweet-toggle', this.getElement()));
      if (!brkn.model.Users.getInstance().currentUser.hasTwitter) {
        goog.net.XhrIo.send('/_twitter', goog.bind(function(e) {
          var response = e.target.getResponseJson()
          this.twitterPublish_ = this.twitterPublish_ && response['auth'];
          this.twitterAuthUrl_ = response['auth_url'];
          this.tweetToggle_.setChecked(this.twitterPublish_);
        }, this));
      }
      
      this.addChild(this.fbToggle_);
      this.fbToggle_.decorate(goog.dom.getElementByClass('fb-toggle', this.getElement()));
      FB.api('/me/permissions', goog.bind(function(response) {
        this.fbPublish_ = this.fbPublish_ && !!response.data[0]['publish_stream'];
        this.fbToggle_.setChecked(this.fbPublish_);
      }, this));
      
      this.getHandler()
          .listen(this.fbToggle_,
              goog.ui.Component.EventType.ACTION,
              goog.bind(this.onFacebookToggle_, this))
          .listen(this.tweetToggle_,
              goog.ui.Component.EventType.ACTION,
              goog.bind(this.onTwitterToggle_, this));
      
      if (DESKTOP && !IPAD) {
        brkn.Popup.getInstance().hovercard(this.tweetToggle_.getElement(), brkn.model.Popup.Position.TOP,
            brkn.model.Popup.Action.TOOLTIP, {'text': goog.bind(function() {
              return 'Share on Twitter: ' + (this.tweetToggle_.isChecked() ? 'ON' : 'OFF'); 
            }, this)});
        brkn.Popup.getInstance().hovercard(this.fbToggle_.getElement(), brkn.model.Popup.Position.TOP,
            brkn.model.Popup.Action.TOOLTIP, {'text': goog.bind(function() {
              return 'Share on Facebook: ' + (this.fbToggle_.isChecked() ? 'ON' : 'OFF'); 
            }, this)});
      }
      brkn.model.Users.getInstance().currentUser.subscribe(brkn.model.User.Actions.TWITTER_AUTH, function() {
        this.tweetToggle_.setChecked(true);
        brkn.model.Users.getInstance().currentUser.hasTwitter = true;
      }, this);
    }
  }
  
  this.suggestionsEl_ = goog.dom.getElementByClass('suggestions', this.getElement());
  this.highlighterEl_ = goog.dom.getElementByClass('highlighter', this.getElement());
  
  popup && goog.style.showElement(popup,
      !brkn.model.Users.getInstance().currentUser.hasFacebook &&
      !brkn.model.Users.getInstance().currentUser.hasTwitter && this.showControls_);
  
  this.getHandler()
      .listen(this.commentInput_.getElement(),
          goog.events.EventType.FOCUS,
          goog.bind(function(e) {
            brkn.model.Controller.getInstance().publish(brkn.model.Controller.Actions.PLAY, false);
            popup && goog.style.showElement(popup, false);
            if (!brkn.model.Users.getInstance().currentUser.welcomed && !this.toField_) {
              brkn.model.Popup.getInstance().publish(brkn.model.Popup.Action.TOOLTIP, this.commentInput_.getElement(),
                  brkn.model.Popup.Position.TOP, {'text': 'Mention friends using @'});
            }
            this.dispatchEvent(goog.events.EventType.FOCUS)
          }, this))
      .listen(keyHandler,
          goog.events.KeyHandler.EventType.KEY,
          goog.bind(function(e) {
            e.stopPropagation();
            brkn.model.Popup.getInstance().publish(brkn.model.Popup.Action.HIDE);
            if (e.keyCode == '13' || ((e.keyCode == '32' || e.keyCode == '9') && this.cursorIndex_ > -1)) {
              if (this.suggestions_.length && this.suggestions_.reverse()[this.cursorIndex_]) {
                e.preventDefault();
                // Suggestion input is the last word up to the cursor
                var suggestionInput = this.commentInput_.getValue().slice(
                    (this.toField_ ? this.lastTokenIndex_ : 0),
                    this.commentInput_.getElement().selectionStart);
                var fragments = suggestionInput.split(' ');
                suggestionInput = fragments.length > 1 ? 
                    fragments[fragments.length - 2] + ' ' + fragments[fragments.length - 1] :
                        fragments.pop();
                var user = this.suggestions_[this.cursorIndex_];
                this.tokens_[user.id] = user;
                if (this.toField_) {
                  this.updateTokens_(suggestionInput.match(brkn.sidebar.CommentInput.TO_REGEX)[0]);
                } else {
                  this.updateTokens_(suggestionInput.match(brkn.sidebar.CommentInput.MENTION_REGEX)[0]); 
                }
                this.commentInput_.getElement().focus();
                goog.style.showElement(this.suggestionsEl_, false);
                this.suggestions_ = [];
                this.cursorIndex_ = -1;
                this.setCaretToPos(this.commentInput_.getValue().length);
              } else if (e.keyCode == '13') {  
                e.preventDefault();
                this.addCommentButton_.setActive(this.commentInput_.getValue());
                this.onAddComment_(e);
              }
              this.canMention_ && this.updateTokens_();
            } else if (e.keyCode == '27' && this.suggestions_.length) {
              goog.style.showElement(this.suggestionsEl_, false);
              this.suggestions_ = [];
              this.setCaretToPos(this.commentInput_.getValue().length);
              this.cursorIndex_ = -1;
              this.tokens_ = {};
            } else if ((e.keyCode == '38' || e.keyCode == '40') && this.suggestions_.length) {
              e.preventDefault();
              var sugEls = Array.prototype.slice.call(goog.dom.getChildren(this.suggestionsEl_));
              if (sugEls.reverse()[this.cursorIndex_]) {
                goog.dom.classes.remove(sugEls[this.cursorIndex_], 'selected');
              }
              this.cursorIndex_ = e.keyCode == '38' ? 
                  Math.min(this.cursorIndex_ + 1, this.suggestions_.length - 1) :
                  Math.max(this.cursorIndex_ - 1, -1);
              if (this.cursorIndex_ != -1) {
                goog.dom.classes.add(sugEls[this.cursorIndex_], 'selected');
              }
            } else {
              goog.Timer.callOnce(goog.bind(function() {
                this.addCommentButton_.setEnabled(this.inputOptional_ || !!this.commentInput_.getValue());
                
                // Suggestion input is the last word up to the cursor
                var suggestionInput = this.commentInput_.getValue().slice(
                    (this.toField_ ? this.lastTokenIndex_ : 0),
                    this.commentInput_.getElement().selectionStart);
                var fragments = suggestionInput.split(' ')
                suggestionInput = fragments.length > 1 ? 
                    fragments[fragments.length - 2] + ' ' + fragments[fragments.length - 1] :
                        fragments.pop()
                
                var hasMention = (this.toField_ && brkn.sidebar.CommentInput.TO_REGEX.test(suggestionInput)) ||
                    this.canMention_ && brkn.sidebar.CommentInput.MENTION_REGEX.test(suggestionInput);
                goog.style.showElement(this.suggestionsEl_, hasMention);
                
                if (e.keyCode == '8') {
                  this.highlighterEl_.innerHTML.match('<div class="token">.*</div>$');
                } else if (hasMention) {
                  var mentionInput = this.toField_ ? suggestionInput.match(brkn.sidebar.CommentInput.TO_REGEX) :
                    suggestionInput.match(brkn.sidebar.CommentInput.MENTION_REGEX);
                  this.suggestions_ = brkn.model.Users.getInstance().search(mentionInput[1]);
                  if (this.suggestions_.length) {
                    this.renderSuggestions_(this.suggestions_, mentionInput[0]);
                  }
                }

                if (!this.commentInput_.getValue()) {
                  this.clear();
                };

                this.canMention_ && this.updateTokens_();
              }, this));
            }
          }, this))
       .listen(this.commentInput_,
           goog.ui.Textarea.EventType.RESIZE,
          goog.bind(function(e) {
            this.dispatchEvent(e);
          }, this));
  
  if (popup) {
     this.getHandler().listen(popup,
         goog.events.EventType.CLICK,
         goog.bind(function(e) {
           goog.style.showElement(popup, false);
         }, this));
  }

  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.REPLY_COMMENT,
      this.reply, this);
  brkn.model.Sidebar.getInstance().subscribe(brkn.model.Sidebar.Actions.REPLY_TWEET,
      this.replyTweet, this);
};


/**
 * @param {Array.<brkn.model.User>} users
 * @param {string} input
 * @private
 */
brkn.sidebar.CommentInput.prototype.renderSuggestions_ = function(users, input) {
  this.suggestionsEl_.innerHTML = '';
  goog.style.showElement(this.suggestionsEl_, true);
  goog.array.forEach(users.slice(0, 5), function(u) {
    var suggestionEl = goog.dom.createDom('div', 'suggestion', u.name);
    goog.dom.appendChild(this.suggestionsEl_, suggestionEl);
    this.getHandler().listen(suggestionEl, goog.events.EventType.CLICK, goog.bind(function() {
      this.tokens_[u.id] = u;
      this.updateTokens_(input);
      this.commentInput_.getElement().focus();
      this.setCaretToPos(this.commentInput_.getValue().length);
      goog.style.showElement(this.suggestionsEl_, false);
      this.suggestions_ = [];
      this.cursorIndex_ = -1;
    }, this));
  }, this);
};


/**
 * @param {?string=} opt_input
 * @private
 */
brkn.sidebar.CommentInput.prototype.updateTokens_ = function(opt_input) {
  var input = this.commentInput_.getValue();
  var highlighter = input;
  var value = input;
  var unusedTokens = goog.object.getKeys(this.tokens_);
  goog.array.forEach(goog.object.getValues(this.tokens_), function(u) {
    var name = opt_input && goog.string.caseInsensitiveStartsWith((this.toField_ ? '' : '@') + u.name, opt_input) ?
        opt_input : u.name;
    highlighter = highlighter.replace(new RegExp(name, 'g'), '<div class="token">' + u.name + '</div> ');
    this.highlighterEl_.innerHTML = highlighter;
    value = value.replace(new RegExp(name, 'g'), '@[' + u.id + ':' + u.name + ']');
    this.value = value;
    var match = (new RegExp(name, 'g')).exec(input);
    if (match) {
      goog.array.remove(unusedTokens, u.id);
      this.lastTokenIndex_ = Math.max(match.index + match[0].length, this.lastTokenIndex_);
    }
    input = input.replace(new RegExp(name, 'g'), u.name) + ' ';
    opt_input && this.commentInput_.setValue(input);
  }, this);
  goog.array.forEach(unusedTokens, function(t) {
    goog.object.remove(this.tokens_, t);
  }, this);
};


/**
 * @param {brkn.model.Comment|string} comment Parent comment or id
 * @param {brkn.model.User} user But in reply to this user
 * @private
 */
brkn.sidebar.CommentInput.prototype.reply = function(comment, user) {
  this.parentComment = comment.id ? comment.id : comment.toString();
  this.replyUser = user;
};


/**
 * @param {brkn.model.Tweet} tweet
 * @private
 */
brkn.sidebar.CommentInput.prototype.replyTweet = function(tweet) {
  this.parentTweet = tweet.id;
  this.setValue((this.getValue() ? this.getValue() + ' ' : '') + '@' + tweet.handle + ' ');
  this.setFocused(true);
  this.tweetToggle_.setEnabled(true);
  this.setFocused(true);
  this.setCaretToPos(this.commentInput_.getValue().length);
};


/**
 * @param {number} selectionStart 
 * @param {number} selectionEnd
 */
brkn.sidebar.CommentInput.prototype.setSelectionRange = function(selectionStart, selectionEnd) {
  if (this.commentInput_.getElement().setSelectionRange) {
    this.commentInput_.getElement().focus();
    this.commentInput_.getElement().setSelectionRange(selectionStart, selectionEnd);
  }
  else if (this.commentInput_.getElement().createTextRange) {
    var range = this.commentInput_.getElement().createTextRange();
    range.collapse(true);
    range.moveEnd('character', selectionEnd);
    range.moveStart('character', selectionStart);
    range.select();
  }
};


/**
 * @param {number} pos
 */
brkn.sidebar.CommentInput.prototype.setCaretToPos = function(pos) {
  this.setSelectionRange(pos, pos);
};


/**
 * @return {string}
 */
brkn.sidebar.CommentInput.prototype.getValue = function() {
  if (this.canMention_ && goog.object.getValues(this.tokens_).length) {
    this.updateTokens_();
  } else {
    this.value = this.commentInput_.getValue();
  }
  return this.value;
};


/**
 * @return {Array.<brkn.model.User>}
 */
brkn.sidebar.CommentInput.prototype.getTokens = function() {
  return goog.object.getValues(this.tokens_);
};


/**
 * @param {string} text
 * @param {?boolean=} opt_facebook
 * @param {?boolean=} opt_tweet
 */
brkn.sidebar.CommentInput.prototype.setValue = function(text, opt_facebook, opt_tweet) {
  this.fbToggle_.setChecked(!!opt_facebook);
  this.tweetToggle_.setChecked(!!opt_tweet);
  this.commentInput_.setValue(text);
  this.value = text;
  this.addCommentButton_.setEnabled(!!text);
};


/**
 */
brkn.sidebar.CommentInput.prototype.clear = function() {
  this.commentInput_.setValue('');
  this.tokens_ = {};
  this.suggestions_ = [];
  this.highlighterEl_.innerHTML = '';
  this.suggestionsEl_.innerHTML = '';
  goog.style.showElement(this.suggestionsEl_, false);
  this.commentInput_.resize();
  this.lastTokenIndex_ = 0;
};


/**
 * @return {boolean}
 */
brkn.sidebar.CommentInput.prototype.hasReply = function() {
  return !!this.token_;
};


/**
 * @return {boolean}
 */
brkn.sidebar.CommentInput.prototype.isFocused = function() {
  return goog.dom.classes.has(this.getElement(), 'focused');
};


/**
 * @param {boolean} enabled
 */
brkn.sidebar.CommentInput.prototype.setFacebook = function(enabled) {
  this.fbToggle_.setChecked(enabled);
};


/**
 * @param {boolean} focus
 */
brkn.sidebar.CommentInput.prototype.setFocused = function(focus) {
  if (focus) {
    this.commentInput_.getElement().focus();
//    goog.Timer.callOnce(goog.bind(function() {
//      goog.style.setPosition(this.commentControls_, 0, 0);
//    }, this));
  }
  return goog.dom.classes.enable(this.getElement(), 'focused', focus);
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onAddComment_ = function(e) {
  if (this.getValue() || this.inputOptional_) {
    this.dispatchEvent({
      type: 'add',
      callback: goog.bind(function(e) {
          var response = e.target.getResponseJson();
          if (response['comment']) {
            var comment = new brkn.model.Comment(response['comment']);
            var tweet = response['tweet'] ? new brkn.model.Tweet(response['tweet']) : null;
            var media = brkn.model.Medias.getInstance().getOrAdd(response['comment']['media']);
            if (media) {
              media.publish(brkn.model.Media.Actions.ADD_COMMENT, comment);
              tweet && media.publish(brkn.model.Media.Actions.ADD_TWEET, tweet);
            }
          }
        }, this),
      facebook: this.fbToggle_.isChecked(),
      twitter: this.tweetToggle_.isChecked(),
      text: this.getValue(),
      parentId: this.parentComment,
      toUserId: this.replyUser && this.replyUser.id
    });
    this.clear();
  }
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onFacebookToggle_ = function(e) {
  brkn.model.Popup.getInstance().publish(brkn.model.Popup.Action.TOOLTIP, this.fbToggle_.getElement(),
      brkn.model.Popup.Position.TOP, {'text': goog.bind(function() {
        return 'Share on Facebook: ' + (this.fbToggle_.isChecked() ? 'ON' : 'OFF'); 
      }, this)});
  if (!brkn.model.Users.getInstance().currentUser.hasFacebook && !this.fbPublish_
      && this.fbToggle_.isChecked()) {
    goog.style.showElement(goog.dom.getElement('overlay'), true);
    FB.login(goog.bind(function(response) {
      goog.style.showElement(goog.dom.getElement('overlay'), false);
      this.facebookPublish_ = !!response['authResponse'];
      this.fbToggle_.setChecked(this.facebookPublish_);
    }, this), { scope: 'publish_stream' });
  }
};


/**
 * @param {Event} e
 */
brkn.sidebar.CommentInput.prototype.onTwitterToggle_ = function(e) {
  brkn.model.Popup.getInstance().publish(brkn.model.Popup.Action.TOOLTIP, this.tweetToggle_.getElement(),
      brkn.model.Popup.Position.TOP, {'text': goog.bind(function() {
        return 'Share on Twitter: ' + (this.tweetToggle_.isChecked() ? 'ON' : 'OFF'); 
      }, this)});
  if (!brkn.model.Users.getInstance().currentUser.hasTwitter && !this.twitterPublish_ &&
      this.tweetToggle_.isChecked()) {
      this.tweetToggle_.setChecked(false);
      if (IPHONE || IPAD) {
        var a = document.createElement('a');
        a.setAttribute("href", this.twitterAuthUrl_);
        a.setAttribute("target", "_blank");
  
        var dispatch = document.createEvent("HTMLEvents")
        dispatch.initEvent("click", true, true);
        a.dispatchEvent(dispatch);
      } else {
        var newWindow = window.open(this.twitterAuthUrl_,'Twitter Login','height=300,width=550');
        newWindow.moveTo(screen.width/2-225, screen.height/2-150);
        newWindow.focus(); 
      }
   }
};
