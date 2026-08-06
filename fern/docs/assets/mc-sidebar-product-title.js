// Mirror the current product's display-name into the top of the sidebar as an
// uppercase label (matches mailchimp.com/developer, e.g. "MAILCHIMP MARKETING
// API"). Fern renders the product name in the header product-selector; this
// surfaces the same name above the sidebar nav. SPA-aware via MutationObserver.
(function () {
  function productName() {
    var ps = document.querySelector(".fern-product-selector");
    if (!ps) return null;
    // textContent can include inline-SVG <style> junk (".fa-secondary{...}"),
    // so cut at the first "." / "{" and collapse whitespace.
    var name = (ps.textContent || "").split(/\.fa-|\{/)[0].replace(/\s+/g, " ").trim();
    return name || null;
  }

  function apply() {
    var side = document.querySelector("aside.fern-sidebar-desktop");
    if (!side) return;
    // The changelog/release-notes sidebar renders its header via CSS (::before
    // on the first nav group) instead — a JS-injected title flashes in after
    // the page reload triggered by the tag filters. Skip injection there.
    if (document.querySelector(".fern-layout-changelog")) return;
    var name = productName();
    if (!name) return;
    // Insert just above the first nav group (inside the scroll area, below the
    // sticky header offset) rather than as the aside's first child — otherwise
    // it renders behind the header.
    var group = side.querySelector(".fern-sidebar-group");
    if (!group) return;
    var container = group.parentElement;
    var el = container.querySelector(":scope > .mc-sidebar-product-title");
    if (!el) {
      el = document.createElement("div");
      el.className = "mc-sidebar-product-title";
      container.insertBefore(el, group);
    }
    if (el.textContent !== name) el.textContent = name;
  }

  function init() {
    apply();
    // Re-apply on client-side navigation / sidebar re-renders. The guards in
    // apply() make repeated calls cheap and prevent mutation loops.
    var obs = new MutationObserver(function () { apply(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
