/*
 * Collapsing header (mirrors mailchimp.com/developer):
 * On scroll down every header element — nav, search, sign-up, product
 * switcher and the full wordmark — fades out together, leaving only the
 * Mailchimp logo MARK. The mark is cropped from the exact same logo SVG and
 * positioned right on top of the wordmark's chimp, so the chimp appears to
 * stay put while only the text and chrome fade away. Scroll up reverses it.
 *
 * The mark lives as a direct child of the header (not inside the fading
 * content), which lets the whole content row fade as one uniform block.
 * Timing + colours are in styles.css.
 */
(function () {
  var THRESHOLD = 80;
  // Chimp bounding box within the 155 x 52.25 logo viewBox.
  var VBW = 155, VBH = 52.25, CX0 = 0, CX1 = 43.19, CY0 = 4.13, CY1 = 49.37;
  var header, mark, lastY = 0, ticking = false;

  function visibleLogo() {
    var imgs = header.querySelectorAll("a[data-fern-logo] img");
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].getBoundingClientRect().width > 0) return imgs[i];
    }
    return imgs[0] || null;
  }

  // Size + place the mark exactly over the chimp inside the full logo.
  function placeMark() {
    if (!mark) return;
    var logo = visibleLogo();
    if (!logo) return;
    var hr = header.getBoundingClientRect();
    var lr = logo.getBoundingClientRect();
    if (!lr.width) return;
    mark.style.left = (lr.left - hr.left + (CX0 / VBW) * lr.width) + "px";
    mark.style.top = (lr.top - hr.top + (CY0 / VBH) * lr.height) + "px";
    mark.style.width = ((CX1 - CX0) / VBW) * lr.width + "px";
    mark.style.height = ((CY1 - CY0) / VBH) * lr.height + "px";
  }

  function setup() {
    header = document.querySelector("header.fern-background-image")
      || document.querySelector("header");
    if (!header || header.__mcHdr) return;
    header.__mcHdr = true;
    header.classList.add("mc-header");

    if (!header.querySelector(".mc-header-mark")) {
      mark = document.createElement("a");
      mark.className = "mc-header-mark";
      mark.href = "/";
      mark.setAttribute("aria-label", "Mailchimp Developer home");
      header.appendChild(mark);
    } else {
      mark = header.querySelector(".mc-header-mark");
    }

    placeMark();
    window.addEventListener("load", placeMark);
    window.addEventListener("resize", placeMark, { passive: true });

    lastY = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (y > lastY && y > THRESHOLD) {
        placeMark();
        header.classList.add("mc-header-collapsed");
      } else if (y < lastY || y <= THRESHOLD) {
        header.classList.remove("mc-header-collapsed");
      }
      lastY = y;
      ticking = false;
    });
  }

  if (document.readyState !== "loading") setup();
  else document.addEventListener("DOMContentLoaded", setup);
  // Re-attach if Fern swaps the header out on SPA navigation.
  new MutationObserver(function () {
    if (!header || !header.isConnected) setup();
  }).observe(document.body, { subtree: true, childList: true });
})();
