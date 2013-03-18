goog.provide('brkn.sidebar.AdminList');

goog.require('soy');
goog.require('brkn.model.Media');
goog.require('brkn.sidebar');

goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.fx.dom.Scroll');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.DragDrop');
goog.require('goog.fx.DragDropGroup');
goog.require('goog.string.linkify');
goog.require('goog.ui.Component');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Textarea.EventType');



/**
 * @param {string} collectionId
 * @param {Array.<brkn.model.Media>} pending
 * @param {Array.<Object>} playlists
 * @param {Array.<Object>} publishers
 * @param {Object} categories
 * @param {?string=} opt_thumb
 * @param {?string=} opt_desc
 * @constructor
 * @extends {goog.ui.Component}
 */
brkn.sidebar.AdminList = function(collectionId, pending, playlists, publishers, categories,
    opt_thumb, opt_desc) {
  goog.base(this);

  /**
   * @type {boolean}
   * @private
   */
  this.isAdmin_ = brkn.model.Users.getInstance().currentUser.isAdmin();

  /**
   * @type {string}
   * @private
   */
  this.collectionId_ = collectionId;
  
  /**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.all_;
  
  /**
   * @type {Array.<brkn.model.Media>}
   * @private
   */
  this.pending_ = pending;
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.playlists_ = playlists;
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.publishers_ = publishers;
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.categories_ = categories['categories'];
  
  /**
   * @type {Array.<string>}
   * @private
   */
  this.feedCategories_ = categories['feed_categories'];
  
  /**
   * @type {Array.<string>}
   * @private
   */
  this.feedId_ = categories['feed_id'];
  
  /**
   * @type {?string}
   * @private
   */
  this.thumbnail_ = opt_thumb || null;

  /**
   * @type {?string}
   * @private
   */
  this.description_ = opt_desc || null;

  /**
   * @type {goog.fx.DragDropGroup}
   * @private
   */
  this.dragDropGroup_ = this.isAdmin_ ? new goog.fx.DragDropGroup() : null;
  
  /**
   * @type {Object.<string, boolean>}
   * @private
   */
  this.finished_ = {
      'pending' : false,
      'all': false
  }
  
  /**
   * @type {Array.<string>}
   * @private
   */
  this.tabs_ = ['pending', 'all', 'playlists', 'publishers', 'categories'];
};
goog.inherits(brkn.sidebar.AdminList, goog.ui.Component);


/**
 * @type {Array.<string>}
 * @constant
 */
brkn.sidebar.AdminList.FEED_IDS = ['top_rated', 'top_favorites', 'most_shared', 'most_recent',
                                   'most_discussed', 'most_responded', 'recently_featured',
                                   'on_the_web', 'most_viewed'];


/**
 * @type {Array.<string>}
 * @constant
 */
brkn.sidebar.AdminList.FEED_CATEGORIES = ['All', 'Film', 'Autos', 'Music', 'Animals', 'Sports',
                                          'Travel', 'Games', 'Videoblog', 'People', 'Comedy',
                                          'Entertainment', 'News', 'Howto', 'Education', 'Tech',
                                          'Nonprofit', 'Movies', 'Shows', 'Shortmov'];


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.AdminList.prototype.input_;


/**
 * @type {Element}
 * @private
 */
brkn.sidebar.AdminList.prototype.tabsEl_;


/** @inheritDoc */
brkn.sidebar.AdminList.prototype.decorateInternal = function(el) {
  goog.base(this, 'decorateInternal', el);

  el.innerHTML = '';
  el.scrollTop = 0;
  
  soy.renderElement(el, brkn.sidebar.adminList);
  
  var pendingMediasEl = goog.dom.getElementByClass('pending-content', el);
  goog.array.forEach(this.pending_, function(media) {
    this.addMedia_(pendingMediasEl, media);
  }, this);
  
  this.playlistsEl_ = goog.dom.getElementByClass('playlists-content', el);
  goog.array.forEach(this.playlists_, this.addPlaylist_, this);
  
  this.publishersEl_ = goog.dom.getElementByClass('publishers-content', el);
  goog.array.forEach(this.publishers_, this.addPublisher_, this);

  this.categoriesEl_ = goog.dom.getElementByClass('categories-list', el);
  this.feedIdsEl_ = goog.dom.getElementByClass('feed-ids', el);
  this.feedCatsEl_ = goog.dom.getElementByClass('feed-cats', el);
  goog.net.XhrIo.send('/admin/_categories', goog.bind(function(e) {
    var cats = e.target.getResponseJson();
    goog.array.forEach(cats, function(cat) {
      this.addCategory_(cat, 'category',
          (goog.array.contains(this.categories_, cat['id']) || !this.categories_.length));
    }, this);
  }, this));

  goog.array.forEach(brkn.sidebar.AdminList.FEED_CATEGORIES, function(cat) {
    this.addCategory_(cat, 'feed_category',
        (goog.array.contains(this.feedCategories_, cat)));
  }, this);

  goog.array.forEach(brkn.sidebar.AdminList.FEED_IDS, function(id) {
    this.addCategory_(id, 'feed_id', this.feedId_ == id);
  }, this);

  this.resize();
};



/** @inheritDoc */
brkn.sidebar.AdminList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  
  this.input_ = goog.dom.getElementByClass('input', this.getElement());
  var keyHandler = new goog.events.KeyHandler(this.input_);
  var pasteHandler = new goog.events.PasteHandler(this.input_);
  this.tabsEl_ = goog.dom.getElementByClass('tabs', this.getElement());
  this.currentTab_ = 'pending';
  var fetchInProgress = false;

  this.getHandler()
      .listen(window, 'resize',
          goog.partial(goog.Timer.callOnce, goog.bind(this.resize, this)))
      .listen(keyHandler, goog.events.KeyHandler.EventType.KEY, goog.bind(function(e) {
        if (e.keyCode == '13') {
          this.fetchLink_(this.input_.value);
        }
      }, this))
      .listen(pasteHandler, goog.events.PasteHandler.EventType.AFTER_PASTE, goog.bind(function(e) {
        this.fetchLink_(this.input_.value);
      }, this))
      .listen(this.tabsEl_, goog.events.EventType.CLICK, goog.bind(function(e) {
        var tabEl = goog.dom.getAncestorByTagNameAndClass(e.target, 'li');
        this.navigate_(tabEl);
      }, this))
      this.getHandler().listen(this.getElement(), goog.events.EventType.SCROLL, goog.bind(function(e) {
        if (this.collectionId_ && !fetchInProgress && !this.finished_[this.currentTab_] &&
            (this.currentTab_ == 'pending' || this.currentTab_ == 'all') &&
            this.getElement().scrollTop + goog.dom.getViewportSize().height >
            this.getElement().scrollHeight - this.getElement().clientTop) {
          fetchInProgress = true;
          var spinner = goog.dom.getElementByClass('spinner', this.getElement());
          goog.style.showElement(spinner, true);
          var list = this.currentTab_ == 'pending' ? this.pending_ : this.all_;
          goog.net.XhrIo.send(
              '/admin/_media/collection/' + this.collectionId_ + '?offset=' + list.length +
                  (this.currentTab_ == 'pending' ? '&pending=1' : ''),
              goog.bind(function(e) {
                fetchInProgress = false;
                var res = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
                var medias = /** @type {Array.<Object>} */ res['medias'];
                medias = goog.array.map(medias, function(m) {
                  return new brkn.model.Media(m);
                });
                goog.array.extend(list, medias);
                var mediasEl = goog.dom.getElementByClass(this.currentTab_ + '-content',
                    this.getElement());
                goog.array.forEach(medias, function(media) {
                  this.addMedia_(mediasEl, media);
                }, this);
                
                this.finished_[this.currentTab_] = !medias.length;
                goog.dom.classes.enable(spinner, 'finished', !medias.length);
              }, this));
        }
      }, this));
   
  this.resize();
};


brkn.sidebar.AdminList.prototype.resize = function() {
  goog.style.setHeight(this.getElement(), goog.dom.getViewportSize().height - 40);
};


/**
 * @param {string} input 
 * @private
 */
brkn.sidebar.AdminList.prototype.fetchLink_ = function(input) {
  var url = goog.string.linkify.findFirstUrl(input);
  if (this.collectionId_ && url) {
    this.input_.disabled = 'disabled';
    goog.net.XhrIo.send(
        'admin/_add/collection/' + this.collectionId_,
        goog.bind(function(e) {
          this.input_.value = '';
          this.input_.disabled = '';
          var response = e.target.getResponseJson();
          if (response['type'] == 'media') {
            var media = brkn.model.Medias.getInstance().getOrAdd(response['data']);
            if (!goog.array.find(this.pending_, function(m) {return m.id == media.id})) {
              this.pending_.push(media);
              var pendingListEl = goog.dom.getElementByClass('pending-content',
                  this.getElement());
              this.addMedia_(pendingListEl, media, true);
              this.navigate_(goog.dom.getElementsByTagNameAndClass('li', 'pending')[0]);
            }
          } else if (response['type'] == 'playlist') {
            var playlist = response['data'];
            if (!goog.array.find(this.playlists_, function(p) {return p.id == playlist.id})) {
              this.playlists_.push(playlist);
              this.addPlaylist_(playlist);
              this.navigate_(goog.dom.getElementsByTagNameAndClass('li', 'playlists')[0]);
            }
          } else if (response['type'] == 'publisher') {
            var publisher = response['data'];
            if (publisher && !goog.array.find(this.publishers_, function(p) {return p.id == publisher.id})) {
              this.publishers_.push(publisher);
              this.addPublisher_(publisher);
              this.navigate_(goog.dom.getElementsByTagNameAndClass('li', 'publishers')[0]);
            }
          }
        }, this),
        'POST',
        'url=' + url);
  }
};


/**
 * @param {Element} tabEl
 * @private
 */
brkn.sidebar.AdminList.prototype.navigate_ = function(tabEl) {
  goog.array.forEach(this.tabs_, function(tab) {
    goog.dom.classes.enable(this.tabsEl_.parentElement, tab, goog.dom.classes.has(tabEl, tab));
    this.currentTab_ = goog.dom.classes.has(tabEl, tab) ? tab : this.currentTab_;
  }, this);
  if (this.collectionId_ && !this.all_) {
    goog.net.XhrIo.send(
        '/admin/_media/collection/' + this.collectionId_,
        goog.bind(function(e) {
          var res = /** @type {Array.<Object>} */ goog.json.parse(e.target.getResponse());
          var medias = /** @type {Array.<Object>} */ res['medias'];
          this.all_ = goog.array.map(medias, function(m) {
            return new brkn.model.Media(m);
          });
          var allMediasEl = goog.dom.getElementByClass('all-content', this.getElement());
          goog.array.forEach(this.all_, function(media) {
            this.addMedia_(allMediasEl, media);
          }, this);
        }, this));
  }
};


/**
 * @param {Object} playlist 
 * @private
 */
brkn.sidebar.AdminList.prototype.addPlaylist_ = function(playlist) {
  var playlistEl = soy.renderAsElement(brkn.sidebar.playlist, {
    name: playlist['name']
  });
  goog.dom.appendChild(this.playlistsEl_, playlistEl);
  
  var remove = goog.dom.getElementByClass('remove', playlistEl);
  this.getHandler().listen(remove, goog.events.EventType.CLICK, function(e) {
    goog.net.XhrIo.send('admin/_remove/collection/' + this.collectionId_, goog.bind(function() {
      goog.dom.removeNode(playlistEl);
    }, this), 'POST', 'pub_id=' + playlist['id']);
  });
};


/**
 * @param {Object} publisher 
 * @private
 */
brkn.sidebar.AdminList.prototype.addPublisher_ = function(publisher) {
  var publisherEl = soy.renderAsElement(brkn.sidebar.publisher, {
    name: publisher['name'] || publisher['id'],
    picture: publisher['picture']
  });
  goog.dom.appendChild(this.publishersEl_, publisherEl);

  var remove = goog.dom.getElementByClass('remove', publisherEl);
  this.getHandler().listen(remove, goog.events.EventType.CLICK, function(e) {
    goog.net.XhrIo.send('admin/_remove/collection/' + this.collectionId_, goog.bind(function() {
      goog.dom.removeNode(publisherEl);
    }, this), 'POST', 'pub_id=' + publisher['id']);
  });
};


/**
 * @param {Object|string} category
 * @param {string} type
 * @param {?boolean} opt_enabled
 * @private
 */
brkn.sidebar.AdminList.prototype.addCategory_ = function(category, type, opt_enabled) {
  if (type == 'category') {
    var catEl = soy.renderAsElement(brkn.sidebar.category, {
      name: category['name'],
      id: category['id']
    });
    goog.dom.appendChild(this.categoriesEl_, catEl);
  } else {
    var catEl = soy.renderAsElement(brkn.sidebar.category, {
      name: category,
      id: category
    });
    goog.dom.appendChild((type == 'feed_id' ? this.feedIdsEl_ : this.feedCatsEl_), catEl);
  }
  goog.dom.classes.enable(catEl, 'enabled', !!opt_enabled);

  var edit = type == 'category' ? 'cat_id=' + category['id'] :
      type == 'feed_id' ? 'feed_id=' + category : 'feed_cat=' + category
  this.getHandler().listen(catEl, goog.events.EventType.CLICK, function(e) {
    if (type == 'feed_id') {
      goog.array.forEach(goog.dom.getChildren(this.feedIdsEl_), function(el) {
        goog.dom.classes.remove(el, 'enabled');
      })
    }
    var enabled = goog.dom.classes.toggle(catEl, 'enabled');
    goog.net.XhrIo.send('admin/_edit/collection/' + this.collectionId_, goog.functions.NULL(),
        'POST', edit + '&enabled=' + enabled);
  });
};


/**
 * @param {Element} parent
 * @param {brkn.model.Media} media 
 * @param {?boolean=} opt_top
 * @private
 */
brkn.sidebar.AdminList.prototype.addMedia_ = function(parent, media, opt_top) {
  var mediaEl = soy.renderAsElement(brkn.sidebar.adminMedia, {
    media: media,
    published: media.getPublishDate()
  });
  if (opt_top) {
    goog.dom.insertChildAt(parent, mediaEl, 0);
  } else {
    goog.dom.appendChild(parent, mediaEl); 
  }
  if (this.isAdmin_) {
    this.dragDropGroup_.addItem(mediaEl);
  }
  var dragger = new goog.fx.Dragger(goog.dom.getElementByClass('repos', mediaEl));
  var thumb = goog.dom.getElementByClass('thumb', mediaEl);
  var play = goog.dom.getElementByClass('play', mediaEl);
  var approve = goog.dom.getElementByClass('approve', mediaEl);
  var remove = goog.dom.getElementByClass('remove', mediaEl);
  dragger.defaultAction = function(x, y) {
    var delta = y - 24
    if (delta >= -50 && delta <= 50) {
      goog.style.setStyle(thumb, 'background-position-y', 50 - delta + '%');
    }
  };
  this.getHandler().listen(dragger, 'end',
      function(e) {
        var percent = goog.style.getStyle(thumb, 'background-position').split(' ')[1];
        percent = percent.substring(0, percent.length - 1);
        goog.net.XhrIo.send(
            '/admin/_posthumb',
            goog.functions.NULL(),
            'POST',
            'media=' + media.id +
            '&pos=' + percent);
      })
      .listen(play, goog.events.EventType.CLICK, goog.bind(this.play_, this, media))
      .listen(approve, goog.events.EventType.CLICK,
          goog.bind(this.approval_, this, media, true, mediaEl))
      .listen(remove, goog.events.EventType.CLICK,
          goog.bind(this.approval_, this, media, false, mediaEl));
  goog.Timer.callOnce(goog.partial(goog.dom.classes.add, mediaEl, 'show'));
};


/**
 * @param {brkn.model.Channel} channel The channel
 * @param {brkn.model.Media} media 
 * @private
 */
brkn.sidebar.AdminList.prototype.onAddProgram_ = function(channel, media) {
  goog.net.XhrIo.send(
    '/admin/_addprogram',
    goog.bind(function(e) {
      var response = goog.json.parse(e.target.getResponse());
      var newProgram = new brkn.model.Program(response);
      channel.publish(brkn.model.Channel.Action.ADD_PROGRAM, newProgram);
    }, this),
    'POST',
    'channel=' + channel.id +'&media=' + media.id);
};


/**
 * @param {brkn.model.Media} media 
 * @param {boolean} approve
 * @param {Element} mediaEl
 * @private
 */
brkn.sidebar.AdminList.prototype.approval_ = function(media, approve, mediaEl) {
  var collectionId = media.collectionId || this.collectionId_;
  goog.net.XhrIo.send(
      'admin/_media/collection',
      goog.bind(function() {
        goog.dom.classes.add(mediaEl, 'remove');
        goog.Timer.callOnce(function() {
          goog.dom.removeNode(mediaEl)
        }, 300);
        brkn.model.Controller.getInstance().setPending(
            (/** @type {string}*/ brkn.model.Controller.getInstance().getPending() - 1));
        brkn.model.Sidebar.getInstance().publish(brkn.model.Sidebar.Actions.APPROVED, media,
            collectionId);
      }, this),
      'POST',
      'col=' + collectionId + '&media=' + media.id + '&approve=' + approve);
};


/**
 * @param {brkn.model.Media} media
 * @private
 */
brkn.sidebar.AdminList.prototype.play_ = function(media) {
  var program = brkn.model.Program.async(media);
  brkn.model.Player.getInstance().publish(brkn.model.Player.Actions.PLAY_ASYNC, program);
};
