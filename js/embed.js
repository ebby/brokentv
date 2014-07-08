goog.provide('telepath');
goog.require('soy');
goog.require('brkn.surface');
goog.require('goog.events');
goog.require('goog.Timer');

var telepath = function(youtube_channel) {
  // Attach CSS
  var css=document.createElement("link")
  css.setAttribute("rel", "stylesheet")
  css.setAttribute("type", "text/css")
  css.setAttribute("href", '/static/css/surface.css');
  document.getElementsByTagName("head")[0].appendChild(css)

  var surfaceEl;
  var playerEl = soy.renderAsElement(brkn.surface.player, {
    youtube_channel: youtube_channel
  });
  goog.dom.appendChild(document.body, playerEl);
  var iframe = goog.dom.getElement('telepath-iframe');

  var closeButton = goog.dom.getElementByClass('close-button', playerEl);
  goog.events.listen(closeButton, 'click', function() {
    goog.dom.classes.remove(playerEl, 'show');
    iframe.contentWindow.pause();

    if (surfaceEl) {
      var suggestionEl = goog.dom.getElementByClass('suggestion', surfaceEl);
      var titleEl = goog.dom.getElementByClass('title', surfaceEl);
      var thumbEl = goog.dom.getElementByClass('thumb', surfaceEl);

      goog.dom.setTextContent(suggestionEl, 'Keep watching');
      if (iframe.contentWindow.getCurrentProgram().media.name != goog.dom.getTextContent(titleEl)) {
        goog.dom.setTextContent(titleEl, iframe.contentWindow.getCurrentProgram().media.name);
        thumbEl.style.backgroundImage = 'url(' + iframe.contentWindow.getCurrentProgram().media.Mb + ')';
      }

      goog.dom.classes.remove(surfaceEl, 'expand');
    }



    goog.Timer.callOnce(function() {
      goog.dom.classes.add(playerEl, 'hide');
    }, 600);
  });

  goog.events.listen(iframe.contentWindow, 'telepath-ready', function() {
    surfaceEl = soy.renderAsElement(brkn.surface.embed, {
      media: iframe.contentWindow.getCurrentProgram().media
    });
    goog.dom.appendChild(document.body, surfaceEl);

    // var tab = goog.dom.getElementByClass('tab', surfaceEl);
    // goog.events.listen(tab, 'click', function() {
    //   goog.dom.classes.toggle(surfaceEl, 'collapse');
    // });

    var program = goog.dom.getElementByClass('program', surfaceEl);
    goog.events.listen(program, 'click', function() {
      goog.dom.classes.remove(playerEl, 'hide');
      goog.dom.classes.add(playerEl, 'show');
      goog.dom.classes.add(surfaceEl, 'expand');
      iframe.contentWindow.play();
    });
  });
};


goog.exportSymbol('telepath', telepath);
