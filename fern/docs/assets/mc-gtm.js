/*
 * GTM container loader — the dotcom snippet from _external_scripts.html.
 *
 * The empty container ID is intentional: the gateway resolves it from the
 * first-party /metrics/ path. Fern's built-in analytics.gtm config stays off,
 * or the container would load twice (and it can only load from
 * googletagmanager.com with an explicit container ID).
 *
 * /metrics/ is served by the Mailchimp gateway on production hosts only. On
 * alpha, deploy previews, and local, the loader is intentionally skipped.
 * Must run after mc-onetrust-consent.js.
 */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  // /metrics/ is served by the Mailchimp gateway and only exists on these
  // hosts. Everywhere else (alpha, deploy previews, local) the request would
  // 404 and log a console error, so the container is not loaded there.
  var PRODUCTION_HOSTS = ["mailchimp.com", "www.mailchimp.com", "developer.mailchimp.com"];
  if (PRODUCTION_HOSTS.indexOf(w.location.hostname) === -1) {
    return;
  }

  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "/metrics/?id=" + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", "");
