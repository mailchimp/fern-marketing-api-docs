/*
 * Page views on client-side route changes.
 *
 * GTM only sends a page view on the first load, and Fern navigates client-side,
 * so every subsequent route change is pushed here as `spa_page_view`. Same
 * payload as the GtmRouteTracker component in the DAE setup doc; there is no
 * root layout to mount a component into, so navigation is detected by patching
 * the history API instead of reading usePathname().
 *
 * The initial load is skipped — GTM already counted it.
 *
 * Titles on API reference pages land after the route commits, so each push
 * waits for the <title> to change (or for a short timeout) rather than reading
 * document.title synchronously
 */
(function () {
  var TITLE_WAIT_MS = 1500;
  var current = location.pathname + location.search;

  function push(title) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "spa_page_view",
      page_path: location.pathname + location.search,
      page_location: location.href,
      page_title: title,
      content_group: "developer"
    });
  }

  function whenTitleSettles(previous, cb) {
    var target = document.head;
    if (!target || typeof MutationObserver !== "function") {
      cb(document.title);
      return;
    }
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      cb(document.title);
    }
    var observer = new MutationObserver(function () {
      if (document.title && document.title !== previous) finish();
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
    var timer = setTimeout(finish, TITLE_WAIT_MS);
  }

  function navigated() {
    var next = location.pathname + location.search;
    if (next === current) return;
    current = next;
    whenTitleSettles(document.title, push);
  }

  function patch(method) {
    var original = history[method];
    if (typeof original !== "function") return;
    history[method] = function () {
      var result = original.apply(this, arguments);
      // The URL is already updated; let the router finish its own work first.
      setTimeout(navigated, 0);
      return result;
    };
  }

  patch("pushState");
  patch("replaceState");
  window.addEventListener("popstate", function () {
    setTimeout(navigated, 0);
  });
})();
