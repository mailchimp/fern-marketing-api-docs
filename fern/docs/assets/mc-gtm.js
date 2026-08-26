/*
 * GTM container loader — the dotcom snippet from _external_scripts.html.
 *
 * The empty container ID is intentional: the gateway resolves it from the
 * first-party /metrics/ path. Fern's built-in analytics.gtm config stays off,
 * or the container would load twice (and it can only load from
 * googletagmanager.com with an explicit container ID).
 *
 * /metrics/ exists only on mailchimp.com, so this 404s on the alpha domain and
 * resolves once the portal is served from mailchimp.com/developer. Must run
 * after mc-onetrust-consent.js.
 */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "/metrics/?id=" + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", "");
