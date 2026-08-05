/*
 * Mailchimp-style sidebar TOC.
 * Fern renders the current page's headings in a right-hand "On this page"
 * TOC (.toc-root). Mailchimp instead nests those headings under the active
 * item in the LEFT sidebar. This script relocates them there, hides the
 * right TOC, and adds scroll-spy so the current section gets the magenta
 * marker. It re-runs on SPA navigation via a debounced MutationObserver,
 * guarded by a signature so it never loops on its own mutations.
 */
(function () {
  var lastSig = "";
  var spyHandler = null;

  function setupScrollSpy(links) {
    if (spyHandler) window.removeEventListener("scroll", spyHandler);
    var ids = links.map(function (a) {
      return decodeURIComponent((a.getAttribute("href") || "").split("#")[1] || "");
    });
    var raf = false;
    function run() {
      raf = false;
      var current = ids.length ? ids[0] : null;
      for (var i = 0; i < ids.length; i++) {
        var el = ids[i] && document.getElementById(ids[i]);
        if (el && el.getBoundingClientRect().top <= 140) current = ids[i];
      }
      // Bottom guard: a short final section can never scroll past the threshold,
      // so when the page is scrolled to the bottom, force the last item active.
      var atBottom = (window.innerHeight + Math.ceil(window.scrollY)) >= (document.documentElement.scrollHeight - 2);
      if (ids.length && atBottom) current = ids[ids.length - 1];
      links.forEach(function (a, i) {
        a.classList.toggle("active", ids[i] === current);
      });
    }
    spyHandler = function () {
      if (!raf) { raf = true; requestAnimationFrame(run); }
    };
    window.addEventListener("scroll", spyHandler, { passive: true });
    run();
  }

  function build() {
    var sidebar = document.querySelector("#fern-sidebar");
    if (!sidebar) return;
    var active = sidebar.querySelector('.fern-sidebar-link[data-state="active"]');
    var toc = document.querySelector(".toc-root");
    // Include only the larger (top-level, H2) headings in the page nav, the way
    // Mailchimp's docs list section headers rather than every sub-heading.
    // In Fern's TOC each item's <li> carries data-depth ("0" = H2, "1" = H3,
    // "2" = H4). Keep depth 0; fall back to all links if a page has no H2 so
    // the TOC is never empty.
    var allLinks = toc
      ? Array.prototype.slice.call(toc.querySelectorAll('a[href*="#"]'))
      : [];
    var links = allLinks.filter(function (a) {
      var li = a.closest("li");
      return li && li.getAttribute("data-depth") === "0";
    });
    if (!links.length) links = allLinks;

    // Hide Fern's right-hand TOC column (label + list + "scroll to top").
    // Use visibility:hidden (not display:none) so the column keeps reserving
    // its space and the main content stays in its original position instead
    // of reflowing to fill the gap. Inline !important beats Fern runtime CSS.
    if (toc && active && links.length) {
      var col = toc.closest("aside") || toc.parentElement;
      if (col) col.style.setProperty("visibility", "hidden", "important");
    }

    var sig =
      (active ? active.getAttribute("href") : "") +
      "|" +
      links.map(function (a) { return a.getAttribute("href"); }).join(",");
    if (sig === lastSig) return; // nothing changed -> avoid mutation loop
    lastSig = sig;

    var prev = sidebar.querySelectorAll(".mc-injected-toc");
    for (var i = 0; i < prev.length; i++) prev[i].remove();
    document.body.classList.remove("mc-toc-relocated");

    if (!active || !links.length) return;

    var ul = document.createElement("ul");
    ul.className = "mc-injected-toc";
    var injected = [];
    links.forEach(function (a) {
      var li = document.createElement("li");
      var na = document.createElement("a");
      na.setAttribute("href", a.getAttribute("href"));
      na.className = "mc-injected-toc-link";
      na.textContent = a.textContent.trim();
      li.appendChild(na);
      ul.appendChild(li);
      injected.push(na);
    });

    var container = active.closest("li") || active;
    container.parentNode.insertBefore(ul, container.nextSibling);
    document.body.classList.add("mc-toc-relocated");
    setupScrollSpy(injected);
  }

  var timer;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(build, 40);
  }

  if (document.readyState !== "loading") schedule();
  else document.addEventListener("DOMContentLoaded", schedule);

  var obs = new MutationObserver(schedule);
  obs.observe(document.body, { subtree: true, childList: true });
  window.addEventListener("popstate", schedule);
  // build immediately when a sidebar nav item is clicked (snappier than waiting for the observer)
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#fern-sidebar a")) {
      lastSig = "__force__"; // force a rebuild once the new page's TOC renders
      schedule();
    }
  }, true);
})();
