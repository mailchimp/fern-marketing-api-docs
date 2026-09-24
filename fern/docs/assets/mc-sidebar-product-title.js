// Mirror the current product's display-name into the top of the sidebar as an
// uppercase label (matches mailchimp.com/developer, e.g. "MAILCHIMP MARKETING
// API"). Fern renders the product name in the header product-selector; this
// surfaces the same name above the sidebar nav. SPA-aware via MutationObserver.
(function () {
  function productName() {
    var ps = document.querySelector(".fern-product-selector");
    if (!ps) return null;
    // Prefer the dedicated title node; the button also contains a hidden
    // list-item variant with the title and subtitle, so textContent alone
    // concatenates all of them.
    var title = ps.querySelector(".product-item-title, .fern-selection-item-title");
    var raw = title ? title.textContent : ps.textContent;
    // textContent can include inline-SVG <style> junk (".fa-secondary{...}"),
    // so cut at the first "." / "{" and collapse whitespace.
    var name = (raw || "").split(/\.fa-|\{/)[0].replace(/\s+/g, " ").trim();
    return name || null;
  }

  function apply() {
    var side = document.querySelector("aside.fern-sidebar-desktop");
    if (!side) return;
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
