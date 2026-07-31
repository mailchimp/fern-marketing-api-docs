/*
 * Collapsing header (mirrors mailchimp.com/developer):
 * On scroll down the header background, nav, search and full wordmark all fade
 * away, leaving ONLY the Mailchimp logo mark — pinned exactly where the logo
 * already sits, so nothing slides or jumps. On scroll up everything fades back.
 *
 * The mark is injected once into the real logo container so it shares the
 * logo's left edge; the cross-fade is handled purely in CSS (styles.css).
 */
(function () {
  var THRESHOLD = 80;
  var header, lastY = 0, ticking = false;

  function setup() {
    header = document.querySelector("header.fern-background-image")
      || document.querySelector("header");
    if (!header || header.__mcHdr) return;
    header.__mcHdr = true;
    header.classList.add("mc-header");

    // Inject a mark-only logo alongside the real one; CSS cross-fades between
    // them. Anchored to the logo container so it never moves.
    var logoC = header.querySelector(".fern-header-logo-container");
    if (logoC && !logoC.querySelector(".mc-header-mark")) {
      var mark = document.createElement("a");
      mark.className = "mc-header-mark";
      mark.href = "/";
      mark.setAttribute("aria-label", "Mailchimp Developer home");
      logoC.appendChild(mark);
    }

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
