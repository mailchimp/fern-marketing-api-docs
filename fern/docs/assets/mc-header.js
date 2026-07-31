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
      links: [["Guides", "/open-commerce/guides/quick-start"], ["Documentation", "/open-commerce/docs/fundamentals"], ["GraphQL Playground", "/open-commerce/playground"]]
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
