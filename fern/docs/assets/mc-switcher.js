/*
 * Custom product switcher (mirrors mailchimp.com/developer): replaces Fern's
 * plain product dropdown with a "Products" trigger that opens a full-width
 * mega-menu — one column per product with a name, description and quick links.
 * Only the three real products are listed (Tools / Release Notes / Blog remain
 * top-nav links). The native Fern selector is hidden in styles.css.
 */
(function () {
  var PRODUCTS = [
    {
      name: "Mailchimp Marketing API", href: "/marketing",
      desc: "Power timely, relevant marketing campaigns with custom data pulled directly from your app.",
      links: [["Guides", "/marketing/guides/quick-start"], ["Documentation", "/marketing/docs/fundamentals"], ["API Reference", "/marketing/api"]]
    },
    {
      name: "Mailchimp Transactional", href: "/transactional",
      desc: "Send targeted and event-driven messages to anyone, fast—with best-in-class deliverability.",
      links: [["Guides", "/transactional/guides/quick-start"], ["Documentation", "/transactional/docs/fundamentals"], ["API Reference", "/transactional/api"]]
    },
    {
      name: "Mailchimp Open Commerce", href: "/open-commerce",
      desc: "Control your commerce future with a modular, API-first commerce stack.",
      links: [["Guides", "/open-commerce/guides/quick-start"], ["Documentation", "/open-commerce/docs/fundamentals"], ["GraphQL Playground", "/open-commerce/graphql-playground"]]
    }
  ];

  var header, trigger, panel, isOpen = false;

  function build() {
    header = document.querySelector("header.fern-background-image") || document.querySelector("header");
    if (!header) return;
    var logoC = header.querySelector(".fern-header-logo-container");
    if (!logoC || logoC.querySelector(".mc-switcher-trigger")) return;

    // "Products" trigger, sitting where the native selector was (next to the logo)
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "mc-switcher-trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = 'Products <svg class="mc-switcher-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    var row = logoC.querySelector(".flex.items-center") || logoC.firstElementChild || logoC;
    row.appendChild(trigger);

    // Full-width mega-menu panel
    panel = document.createElement("div");
    panel.className = "mc-switcher-panel";
    var html = '<div class="mc-switcher-inner">';
    PRODUCTS.forEach(function (p) {
      html += '<div class="mc-switcher-col">'
        + '<a class="mc-switcher-name" href="' + p.href + '">' + p.name + '</a>'
        + '<p class="mc-switcher-desc">' + p.desc + '</p>'
        + '<ul class="mc-switcher-links">'
        + p.links.map(function (l) { return '<li><a href="' + l[1] + '">' + l[0] + '</a></li>'; }).join("")
        + '</ul></div>';
    });
    html += "</div>";
    panel.innerHTML = html;
    document.body.appendChild(panel);

    trigger.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener("click", function (e) {
      if (isOpen && !panel.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
  }

  function position() {
    var r = header.getBoundingClientRect();
    panel.style.top = Math.max(0, r.bottom) + "px";
  }
  function toggle() { isOpen ? close() : openMenu(); }
  function openMenu() {
    isOpen = true; position();
    panel.classList.add("is-open");
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    trigger.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  if (document.readyState !== "loading") build();
  else document.addEventListener("DOMContentLoaded", build);
  // Re-attach if Fern swaps the header on SPA navigation.
  new MutationObserver(function () {
    if (!header || !header.isConnected || !document.querySelector(".mc-switcher-trigger")) build();
  }).observe(document.body, { subtree: true, childList: true });
  window.addEventListener("resize", function () { if (isOpen) position(); });
  window.addEventListener("scroll", function () { if (isOpen) close(); }, { passive: true });
})();
