/*
 * OneTrust consent + Google consent-mode defaults.
 *
 * Mirrors _cookie_preferences_preload.html in the monolith. Runs before
 * mc-gtm.js — the consent defaults must be in the dataLayer before the GTM
 * container loads, so keep this first in the `js:` list in docs.yml.
 *
 * Fern injects scripts only, so the <link rel=preconnect> and the
 * <meta name=OptanonActiveGroups> from the dotcom markup are created here
 * instead. OptanonWrapper looks the meta up by selector, so it behaves the
 * same either way.
 *
 * Order differs from the dotcom snippet in one way, deliberately: there the
 * stub is a deferred <script> tag, so the inline consent defaults below it
 * still execute first. A dynamically inserted script is async regardless of
 * the defer attribute, so the defaults are set here BEFORE the stub is
 * appended rather than after.
 */
(function () {
  var DOMAIN_SCRIPT = "41e15231-4a82-4457-b3aa-67f11aea3ee2";

  // TODO(mailchimp): paste ONETRUST_OPTOUT_COUNTRIES + ONETRUST_OPTOUT_STATES
  // from app/lib/Plums/OneTrustHelper.php in the monolith, concatenated
  // (~250 country and US-state codes). While this is empty, every region gets
  // the opt-in (denied) defaults below.
  var OPTOUT_REGIONS = [];

  function head() {
    return document.head || document.getElementsByTagName("head")[0];
  }

  function preconnect(href) {
    var link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    head().appendChild(link);
  }

  function activeGroupsMeta() {
    if (document.querySelector('meta[name="OptanonActiveGroups"]')) return;
    var meta = document.createElement("meta");
    meta.setAttribute("name", "OptanonActiveGroups");
    meta.setAttribute("content", "");
    head().appendChild(meta);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  // OneTrust calls this once it has resolved the visitor's groups.
  window.OptanonWrapper = function () {
    window.dataLayer.push({ event: "OneTrustGroupsUpdated" });
    var meta = document.querySelector('[name="OptanonActiveGroups"]');
    if (meta && typeof OptanonActiveGroups !== "undefined") {
      meta.content = OptanonActiveGroups;
    }
  };

  preconnect("https://cdn.cookielaw.org");
  activeGroupsMeta();

  gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  if (OPTOUT_REGIONS.length) {
    gtag("consent", "default", {
      ad_storage: "granted",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      region: OPTOUT_REGIONS
    });
  }

  // Loaded from here rather than as a `url:` entry in docs.yml: Fern adds an
  // SRI integrity hash to configured remote scripts, and OneTrust updates
  // otSDKStub.js in place.
  var stub = document.createElement("script");
  stub.src = "https://cdn.cookielaw.org/scripttemplates/otSDKStub.js";
  stub.type = "text/javascript";
  stub.charset = "UTF-8";
  stub.setAttribute("data-domain-script", DOMAIN_SCRIPT);
  head().appendChild(stub);
})();
