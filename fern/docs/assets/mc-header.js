/*
 * Auto-hide header: on scroll down the header slides up out of view; on scroll
 * up it slides back. A floating Mailchimp logo (cloned from the header) stays
 * pinned top-left while the header is hidden — so "everything disappears except
 * the logo," matching mailchimp.com/developer.
 */
(function () {
  var THRESHOLD = 120;
  var header, floatLogo, lastY = 0, ticking = false;

  function setup() {
    header = document.querySelector("header.fern-background-image")
      || document.querySelector(".fern-header")
      || document.querySelector("header");
    if (!header || header.__mcHdr) return;
    header.__mcHdr = true;
    header.classList.add("mc-header");

    var src = header.querySelector(".fern-header-logo-container");
    if (src) {
      floatLogo = document.createElement("div");
      floatLogo.className = "mc-float-logo";
      floatLogo.innerHTML = src.innerHTML;
      document.body.appendChild(floatLogo);
    }
    lastY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (y > lastY && y > THRESHOLD) {
        header.classList.add("mc-header-hidden");
        document.body.classList.add("mc-header-is-hidden");
      } else if (y < lastY) {
        header.classList.remove("mc-header-hidden");
        document.body.classList.remove("mc-header-is-hidden");
      }
      lastY = y;
      ticking = false;
    });
  }

  if (document.readyState !== "loading") setup();
  else document.addEventListener("DOMContentLoaded", setup);
  // re-attach if Fern replaces the header on SPA navigation
  new MutationObserver(function () {
    if (!header || !header.isConnected) setup();
  }).observe(document.body, { subtree: true, childList: true });
})();
