/*
 * Adds a `mc-blog-route` class to <body> whenever the current path is the blog
 * (index or a post) so the stylesheet can hide the sidebar and let the blog
 * own the full width. Matches /blog, /blog/x, and the /developer/blog variants.
 */
(function () {
  var RE = /(^|\/)(blog|tools|release-notes)(\/|$)/;
  function apply() {
    var p = location.pathname.replace(/\/+$/, "");
    document.body.classList.toggle("mc-blog-route", RE.test(p));
  }
  var t;
  function schedule() { clearTimeout(t); t = setTimeout(apply, 20); }
  if (document.readyState !== "loading") schedule();
  else document.addEventListener("DOMContentLoaded", schedule);
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true });
  window.addEventListener("popstate", schedule);
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) schedule();
  }, true);
})();
