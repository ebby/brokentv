function makeXylo() {
   ifrm = document.createElement("iframe");
   ifrm.setAttribute("src", "http://www.telepath.tv/?ytc=natgeo,UCpVm7bg6pXKo1Pr6k5kxG9A&embed=1");
   ifrm.style.width = 1000+"px";
   ifrm.style.height = 604+"px";
   ifrm.style.border = 'none';
   return ifrm;
}

(function () {
    var t, e, i, s, o, n, r, l, h, a, u, d, c = [].slice,
        p = function (t, e) {
            return function () {
                return t.apply(e, arguments)
            }
        };
    t = jQuery, t(function () {
        return window.gmcs = {}, window.gmcs.site_id = "1", window.gmcs.host = "http://damp-ravine-5659.herokuapp.com", window.gmcs.debug = !1, window.gmcs.log = function (t) {
            return window.gmcs.debug ? console.log(t) : void 0
        }, window.gmcs.utils = {}, window.gmcs.utils.domManager = new i, window.gmcs.utils.cookieHandler = new e, window.gmcs.utils.guid = function () {
            var t, e, i;
            return t = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", i = new Date, e = i.valueOf().toString(16), e += t.substr(Math.floor(Math.random() * t.length), 1), e += t.substr(Math.floor(Math.random() * t.length), 1)
        }, window.gmcs.surface = new a("Nat Geo TV", !0)
    }), e = function () {
        function t() {}
        return t.prototype.setCookie = function (t, e, i) {
            var s, o;
            return i ? (s = new Date, s.setTime(s.getTime() + 24 * i * 60 * 60 * 1e3), o = "; expires=" + s.toGMTString()) : o = "", document.cookie = t + "=" + e + o + "; path=/"
        }, t.prototype.getCookie = function (t) {
            var e, i, s, o;
            for (o = t + "=", i = document.cookie.split(";"), s = 0; s < i.length;) {
                for (e = i[s];
                    " " === e.charAt(0);) e = e.substring(1, e.length);
                if (0 === e.indexOf(o)) return e.substring(o.length, e.length);
                s++
            }
            return null
        }, t.prototype.deleteCookie = function (t) {
            return setCookie(t, "", -1)
        }, t
    }(), l = function () {
        function t() {
            var t, e, i, s, o, n, r, l;
            o = 2 <= arguments.length ? c.call(arguments, 0, l = arguments.length - 1) : (l = 0, []), t = arguments[l++], this.libraries = {
                jQuery: "http://ajax.googleapis.com/ajax/libs/jquery/$version/jquery.js",
                videoJs: "vjs/video.dev.js"
            }, i = o[0], r = o[1], e = o[2], this.libraries[i] && (i = this.libraries[i]), s = function (e) {
                return function () {
                    return e.loaded ? void 0 : (e.loaded = !0, t())
                }
            }(this), n = document.createElement("script"), n.onload = s, n.onreadystatechange = function () {
                return /loaded|complete/.test(n.readyState) ? s() : void 0
            }, n.src = i.replace("$version", r), e && (i = i.replace(".js", ".min.js")), document.getElementsByTagName("head")[0].appendChild(n)
        }
        return t
    }(), i = function () {
        function t() {
            this.getStyle = p(this.getStyle, this), this.get = p(this.get, this), this.appendDivToParent = p(this.appendDivToParent, this), this.appendDivToBody = p(this.appendDivToBody, this), this.body = document.getElementsByTagName("body")[0], this.head = document.getElementsByTagName("head")[0]
        }
        return t.prototype.appendDivToBody = function (t) {
            var e;
            return e = document.createElement("div"), e.id = t, this.body.appendChild(e)
        }, t.prototype.appendDivToParent = function (t, e) {
            var i, s;
            return s = document.createElement("div"), s.id = t, i = document.getElementById(e), i.appendChild(s)
        }, t.prototype.get = function (t) {
            var e;
            return e = document.getElementById(t)
        }, t.prototype.getStyle = function (t) {
            var e;
            return e = document.createElement("link"), e.href = t, e.rel = "stylesheet", e.type = "text/css", this.head.appendChild(e)
        }, t
    }(), n = function () {
        function t(t, e) {
            this.dispose = p(this.dispose, this), this.showProgressBar = p(this.showProgressBar, this), this.hideProgressBar = p(this.hideProgressBar, this), this.isPlaying = p(this.isPlaying, this), this.setCurrentTime = p(this.setCurrentTime, this), this.loadedmetadata = p(this.loadedmetadata, this), this.ready = p(this.ready, this), this.onpause = p(this.onpause, this), this.onplay = p(this.onplay, this), this.ended = p(this.ended, this), this.timeUpdate = p(this.timeUpdate, this), this.one = p(this.one, this), this.on = p(this.on, this), this.isMuted = p(this.isMuted, this), this.timeRemaining = p(this.timeRemaining, this), this.currentTime = p(this.currentTime, this), this.duration = p(this.duration, this), this.loadFile = p(this.loadFile, this), this.unmute = p(this.unmute, this), this.mute = p(this.mute, this), this.pause = p(this.pause, this), this.play = p(this.play, this);
            var i;
            this.id = t, this.parent_id = e, i = document.createElement("video"), i.setAttribute("id", t), i.setAttribute("class", "video-js vjs-default-skin vjs-big-play-button"), i.setAttribute("height", "100%"), i.setAttribute("width", "100%"), i.setAttribute("data-setup", "{}"), i.setAttribute("controls", ""), document.getElementById(e).appendChild(i), this.elem = videojs(t), this.playing = !1, this.elem.on("play", function (t) {
                return function () {
                    return t.playing = !0
                }
            }(this)), this.elem.on("pause", function (t) {
                return function () {
                    return t.playing = !1
                }
            }(this))
        }
        return t.prototype.play = function () {
            return this.elem.play()
        }, t.prototype.pause = function () {
            return this.elem.pause()
        }, t.prototype.mute = function () {
            return this.elem.volume(0)
        }, t.prototype.unmute = function () {
            return this.elem.volume(1)
        }, t.prototype.loadFile = function (t) {
            var e;
            return e = t.src(), this.elem.src([{
                type: "video/flv",
                src: e
            }])
        }, t.prototype.duration = function () {
            return this.elem.duration()
        }, t.prototype.currentTime = function () {
            return this.elem.currentTime()
        }, t.prototype.timeRemaining = function () {
            return this.duration() - this.currentTime()
        }, t.prototype.isMuted = function () {
            return this.elem.muted()
        }, t.prototype.on = function (t, e) {
            return this.elem.on(t, e)
        }, t.prototype.one = function (t, e) {
            return this.elem.one(t, e)
        }, t.prototype.timeUpdate = function (t) {
            return this.elem.on("timeupdate", t)
        }, t.prototype.ended = function (t) {
            return this.elem.on("ended", t)
        }, t.prototype.onplay = function (t) {
            return this.elem.on("play", t)
        }, t.prototype.onpause = function (t) {
            return this.elem.on("pause", t)
        }, t.prototype.ready = function (t) {
            return this.elem.ready(t)
        }, t.prototype.loadedmetadata = function (t) {
            return this.elem.on("loadedmetadata", t)
        }, t.prototype.setCurrentTime = function (t) {
            return this.elem.currentTime(t)
        }, t.prototype.isPlaying = function () {
            return this.playing
        }, t.prototype.hideProgressBar = function () {
            return this.elem.controlBar.progressControl.hide()
        }, t.prototype.showProgressBar = function () {
            return this.elem.controlBar.progressControl.show()
        }, t.prototype.dispose = function () {
            return this.elem.dispose()
        }, t
    }(), a = function () {
        function e(t, e, i) {
            var s;
            this.site_name = t, null == e && (e = !1), null == i && (i = 0), this.update_current_time = p(this.update_current_time, this), this.maximise = p(this.maximise, this), this.minimise = p(this.minimise, this), this.like_video = p(this.like_video, this), this.play_next_video = p(this.play_next_video, this), this.play = p(this.play, this), this.refresh_slug = p(this.refresh_slug, this), this.create_slug = p(this.create_slug, this), this.create_overlay = p(this.create_overlay, this), this.load_UI = p(this.load_UI, this), this.load_VJS = p(this.load_VJS, this), this.hostname = window.gmcs.host, s = window.gmcs.utils.cookieHandler, this.callbacks = {
                playlist_loaded: this.load_VJS,
                videojs_loaded: this.load_UI
            }, this.user = new u(this.callbacks.playlist_loaded), this.current_time = parseInt(s.getCookie("gmcs-surface-current_time")), isNaN(this.current_time) && (this.current_time = 0), this.start_minimised = parseInt(s.getCookie("gmcs-surface-minimised")), isNaN(this.start_minimised) && (null != e ? e : 0) && (this.start_minimised = 1), this.minimised = !1, this.dom = window.gmcs.utils.domManager, this.dom.getStyle("/static/css/natgeo.css"), this.dom.getStyle("vjs/video-js.css")
        }
        return e.prototype.load_VJS = function () {
            return window.gmcs.log("Loading Video JS"), new l("videoJs", this.callbacks.videojs_loaded)
        }, e.prototype.load_UI = function () {
            return this.video = this.user.playlist.next(), this.overlay = null, void(this.start_minimised > 0 ? (this.minimised = !0, this.create_slug()) : (this.create_overlay(), this.create_slug(), this.minimised = !1))
        }, e.prototype.create_overlay = function () {
            return this.overlay = new s(this.site_name), this.overlay.onclose(this.minimise), this.overlay.onlike(this.like_video), this.overlay.set_title(this.video.title()), this.overlay.onskip(function (t) {
                return function () {
                    return new o(t.user.id, "skip", t.video.id), t.play_next_video()
                }
            }(this))
        }, e.prototype.create_slug = function () {
            return this.slug = new h("Recommended For You"), this.slug.click(this.maximise), this.slug.set_title(this.video.title()), this.slug.set_poster(this.video.thumb())
        }, e.prototype.refresh_slug = function () {
            return this.slug.set_title(this.video.title()), this.slug.set_poster(this.video.thumb())
        }, e.prototype.create_player = function (t, e, i) {
            var s;
            return s = new n("cs-video-player", "cs-player-container"), s.ready(function (n) {
                return function () {
                    return s.loadFile(t), s.ended(function () {
                        return window.gmcs.log("ENDED"), new o(n.user.id, "complete", n.video.id), n.play_next_video()
                    }), e && s.play(), i && s.one("loadedmetadata", function () {
                        return s.setCurrentTime(n.current_time)
                    }), s.timeUpdate(n.update_current_time)
                }
            }(this)), s
        }, e.prototype.play = function (t) {
            return this.video = t, this.overlay.set_title(this.video.title()), this.overlay.enable_like(this.like_video), this.overlay.hide_related()
        }, e.prototype.play_next_video = function () {
            var t;
            return t = this.user.playlist.next(), null !== t ? (this.video = t, window.gmcs.log("Surface: Play next video: " + this.video.title()), this.overlay.set_title(this.video.title()), this.overlay.enable_like(this.like_video), this.overlay.hide_related()) : void 0
        }, e.prototype.like_video = function () {
            var e;
            return this.overlay.disable_like(), new o(this.user.id, "like", this.video.id), e = window.gmcs.host + "/videos/" + this.video.id + "/related/", window.gmcs.log(e), t.getJSON(e, function (t) {
                return function (e) {
                    return t.overlay.show_related(e, t.play)
                }
            }(this))
        }, e.prototype.minimise = function () {
            return this.overlay.hide(), this.slug.set_label("Resume Watching"), this.slug.set_title(this.video.title()), this.slug.set_poster(this.video.thumb()), this.slug.open(), this.slug.show(), this.minimised = !0, window.gmcs.utils.cookieHandler.setCookie("gmcs-surface-minimised", 1, 1e4)
        }, e.prototype.maximise = function () {
            return this.minimised === !0 ? (null === this.overlay && this.create_overlay(), this.slug.hide(), this.overlay.show(), this.minimised = !1, window.gmcs.utils.cookieHandler.setCookie("gmcs-surface-minimised", 0, 1e4)) : void 0
        }, e.prototype.update_current_time = function () {
            return 0;
        }, e
    }(), d = function () {
        function t(t, e, i, s) {
            this.id = t, this.file_src = e, this.video_title = i, this.thumb_href = s, this.thumb = p(this.thumb, this), this.isAd = p(this.isAd, this), this.url = p(this.url, this), this.title = p(this.title, this), this.setPosition = p(this.setPosition, this), this.position = p(this.position, this), this.src = p(this.src, this), this.playback_position = 0
        }
        return t.prototype.src = function () {
            return this.file_src
        }, t.prototype.position = function () {
            return this.playback_position
        }, t.prototype.setPosition = function (t) {
            return this.playback_position = t
        }, t.prototype.title = function () {
            return this.video_title
        }, t.prototype.url = function () {
            return this.video_url
        }, t.prototype.isAd = function () {
            return this.ad
        }, t.prototype.thumb = function () {
            return this.thumb_href
        }, t
    }(), u = function () {
        function e(e) {
            var i, s, o;
            this.cookie_handler = window.gmcs.utils.cookieHandler, i = null != (o = this.cookie_handler.getCookie("gmcs-surface-user-guid")) ? o : window.gmcs.utils.guid(), s = window.gmcs.host + "/users/get?guid=" + i + "&site_id=" + window.gmcs.site_id, t.getJSON(s, function (t) {
                return function (s) {
                    return t.id = s.id.toString(), t.cookie_handler.setCookie("gmcs-surface-user-guid", i, 1e4), window.gmcs.log("Surface: User: User ID " + t.id), t.playlist = new r(t.id, e, s.last_played)
                }
            }(this))
        }
        return e
    }(), r = function () {
        function e(t, e, i) {
            this.id = t, this.next = p(this.next, this), this.current = p(this.current, this), this.load_playlist = p(this.load_playlist, this), this.load_video = p(this.load_video, this), this.add = p(this.add, this), this.videos = [], i ? (window.gmcs.log("Loading Last Played"), this.load_video(i, e)) : this.load_playlist(e)
        }
        return e.prototype.add = function (t) {
            return this.videos.push(t), window.gmcs.log("Surface: User: Playlist: Add: " + t.title())
        }, e.prototype.load_video = function (t, e) {
            var i;
            return i = new d(t.id, t.src, t.title, t.thumb_src), this.add(i), e ? e() : void 0
        }, e.prototype.load_playlist = function (e) {
            var i;
            return i = window.gmcs.host + "/users/" + this.id + "/refreshplaylist/", window.gmcs.log("Requesting new playlist"), t.getJSON(i, function (i) {
                return function (s) {
                    var o, n, r, l, h;
                    for (i.videos = [], window.gmcs.log(s.videos), h = s.videos.splice(0, 5), r = 0, l = h.length; l > r; r++) o = h[r], n = new d(o.id, o.src, o.title, o.thumb_src), i.add(n);
                    return t("#cs-footer-skip").text("Skip"), t("#cs-footer-skip").addClass("footer-enabled"), e ? e() : void 0
                }
            }(this))
        }, e.prototype.current = function () {
            return this.videos[0]
        }, e.prototype.next = function () {
            var e;
            return this.videos.length > 0 ? (e = this.videos.shift(), new o(this.id, "play", e.id), window.gmcs.log(this.videos), 0 === this.videos.length && (t("#cs-footer-skip").text("Optimising playlist"), t("#cs-footer-skip").removeClass("footer-enabled"), this.load_playlist()), e) : null
        }, e
    }(), o = function () {
        function e(e, i, s) {
            var o, n, r, l, h;
            l = function () {
                var i;
                return i = window.gmcs.host + "/users/" + e + "/played/" + s + "/", t.getJSON(i)
            }, r = function () {
                var i;
                return i = window.gmcs.host + "/users/" + e + "/liked/" + s + "/", t.getJSON(i)
            }, h = function () {
                var i;
                return i = window.gmcs.host + "/users/" + e + "/skipped/" + s + "/", t.getJSON(i)
            }, n = function () {
                var i;
                return i = window.gmcs.host + "/users/" + e + "/completed/" + s + "/", t.getJSON(i)
            }, o = {
                play: l,
                like: r,
                skip: h,
                complete: n
            };
            try {
                o[i]()
            } catch (a) {
                return null
            }
        }
        return e
    }(), s = function () {
        function e(e) {
            this.remove_overlay = p(this.remove_overlay, this), /*this.set_blur = p(this.set_blur, this),*/ this.hide_related = p(this.hide_related, this), this.show_related = p(this.show_related, this), this.onskip = p(this.onskip, this), this.onlike = p(this.onlike, this), this.onclose = p(this.onclose, this), this.disable_like = p(this.disable_like, this), this.enable_like = p(this.enable_like, this), this.disable_skip = p(this.disable_skip, this), this.enable_skip = p(this.enable_skip, this), this.set_title = p(this.set_title, this), this.hide = p(this.hide, this), this.show = p(this.show, this);
            var i, s;
            this.dom = window.gmcs.utils.domManager, /*this.set_blur(), */s = document.createElement("div"), s.id = "cs-wrapper", i = document.getElementsByTagName("html")[0], i.appendChild(s), this.dom.appendDivToParent("cs-overlay", "cs-wrapper"), this.dom.appendDivToParent("cs-header", "cs-wrapper"), this.dom.appendDivToParent("cs-close", "cs-header"), this.dom.appendDivToParent("cs-main", "cs-wrapper"), this.dom.appendDivToParent("xylo", "cs-main"), t("#cs-player-container").addClass("largeVideoWrapper"), this.$wrapper = t("#cs-wrapper"), this.$site_label = t("#cs-label"), this.$title_label = t("#cs-video-title"), this.$close_button = t("#cs-close"), this.$like_button = t("#cs-footer-like"), this.$skip_button = t("#cs-footer-skip"), this.$related_container = t("#cs-related-container"), this.$close_button.addClass("cs-close"), this.$site_label.html(e), this.$like_button.text("Like"), this.$like_button.addClass("footer-enabled"), this.$related_container.html("Since you liked this, you might also like:"), this.hide_related(), this.enable_skip()
            var xylo = document.getElementById('xylo');
            xylo.appendChild(makeXylo());
        }
        return e.prototype.show = function () {
            return /*this.set_blur(),*/ this.$wrapper.show()
        }, e.prototype.hide = function () {
            return this.remove_overlay(), this.$wrapper.hide()
        }, e.prototype.set_title = function (t) {
            return this.$title_label.html(t)
        }, e.prototype.enable_skip = function () {
            return this.$skip_button.text("Skip"), this.$skip_button.addClass("footer-enabled")
        }, e.prototype.disable_skip = function () {
            return this.$skip_button.text("Optimising playlist"), this.$skip_button.removeClass("footer-enabled")
        }, e.prototype.enable_like = function (t) {
            return this.$like_button.text("Like"), this.$like_button.addClass("footer-enabled"), this.onlike(t)
        }, e.prototype.disable_like = function (t) {
            return this.$like_button.text("Liked!"), this.$like_button.unbind("click"), this.$like_button.removeClass("footer-enabled")
        }, e.prototype.onclose = function (t) {
            return this.$close_button.click(t)
        }, e.prototype.onlike = function (t) {
            return this.$like_button.click(t)
        }, e.prototype.onskip = function (t) {
            return this.$skip_button.click(t)
        }, e.prototype.show_related = function (t, e) {
            var i, s, o, n, r, l, h;
            if (o = this.$related_container, t.length > 0) {
                for (o.html("Since you liked this, you might also like:"), r = function (t) {
                    return function (t) {
                        i.onclick = function () {
                            return e(new d(t.pk, t.fields.src, t.fields.title, t.fields.thumb_src))
                        }
                    }
                }(this), l = 0, h = t.length; h > l; l++) n = t[l], s = window.gmcs.utils.guid(), i = document.createElement("div"), i.className = "related-link", i.id = s, o[0].appendChild(i), i.innerHTML = " > " + n.fields.title, r(n);
                o.show()
            }
        }, e.prototype.hide_related = function () {
            return this.$related_container.hide()
        }, e.prototype.set_blur = function () {
            return t("body").css("filter", "blur(15px)"), t("body").css("filter", "url(src/blur.svg#blur)"), t("body").css("-webkit-filter", "blur(15px)"), t("body").css("-moz-filter", "blur(15px)"), t("body").css("-o-filter", "blur(15px)"), t("body").css("-ms-filter", "blur(15px)"), t("html, body").css({
                overflow: "hidden",
                height: "100%"
            })
        }, e.prototype.remove_overlay = function () {
            return t("body").css("-webkit-filter", "blur(0px)"), t("html").css("filter", "blur(0px)"), t("body").css("filter", "url(src/blur.svg#noBlur)"), t("body").css("-moz-filter", "blur(0px)"), t("body").css("-o-filter", "blur(0px)"), t("body").css("-ms-filter", "blur(0px)"), t("html, body").css({
                overflow: "auto",
                height: "auto"
            })
        }, e
    }(), h = function () {
        function e(e) {
            this.preload = p(this.preload, this), this.open = p(this.open, this), this.close = p(this.close, this), this.set_poster = p(this.set_poster, this), this.set_title = p(this.set_title, this), this.set_label = p(this.set_label, this), this.click = p(this.click, this), this.show = p(this.show, this), this.hide = p(this.hide, this), this.dom = window.gmcs.utils.domManager, this.dom.appendDivToBody("cs-slug-wrapper"), this.dom.appendDivToParent("cs-slug-close", "cs-slug-wrapper"), this.dom.appendDivToParent("cs-slug-body", "cs-slug-wrapper"), this.dom.appendDivToParent("cs-slug-body-overlay", "cs-slug-body"), this.dom.appendDivToParent("cs-slug-label", "cs-slug-body-overlay"), this.dom.appendDivToParent("cs-slug-play-button", "cs-slug-body-overlay"), this.dom.appendDivToParent("cs-slug-video-title", "cs-slug-body-overlay"), this.$label = t("#cs-slug-label"), this.set_label(e), this.$video_title = t("#cs-slug-video-title"), this.$wrapper = t("#cs-slug-wrapper"), this.$slug_body = t("#cs-slug-body"), this.$close_button = t("#cs-slug-close"), this.open(), 1 === parseInt(window.gmcs.utils.cookieHandler.getCookie("gmcs-surface-slug-closed")) && this.close(), this.preload(["src/slug-close-active.png", "src/slug-close-inactive.png", "src/slug-open-active.png", "src/slug-open-inactive.png"])
        }
        return e.prototype.hide = function () {
            return this.$wrapper.hide()
        }, e.prototype.show = function () {
            return this.$wrapper.show(200)
        }, e.prototype.click = function (t) {
            return this.$slug_body.click(t)
        }, e.prototype.set_label = function (t) {
            return this.$label.text(t)
        }, e.prototype.set_title = function (t) {
            return this.$video_title.text(t)
        }, e.prototype.set_poster = function (t) {
            var e;
            return e = "url('" + t + "')", this.$slug_body.css("background", e)
        }, e.prototype.close = function () {
            return this.$wrapper.addClass("slug-closed"), this.$close_button.removeClass("slug-close-btn"), this.$close_button.addClass("slug-open-btn"), this.$close_button.unbind("click"), this.$close_button.click(this.open), window.gmcs.utils.cookieHandler.setCookie("gmcs-surface-slug-closed", 1, 1e4)
        }, e.prototype.open = function () {
            return this.$wrapper.removeClass("slug-closed"), this.$close_button.removeClass("slug-open-btn"), this.$close_button.addClass("slug-close-btn"), this.$close_button.unbind("click"), this.$close_button.click(this.close), window.gmcs.utils.cookieHandler.setCookie("gmcs-surface-slug-closed", 0, 1e4)
        }, e.prototype.preload = function (t) {
            var e, i, s, o;
            for (o = [], i = 0, s = t.length; s > i; i++) e = t[i], o.push(function (t) {
                return function (t) {
                    var e;
                    return e = new Image, e.src = t
                }
            }(this)(e));
            return o
        }, e
    }()
}).call(this);
