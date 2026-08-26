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

  // ONETRUST_OPTOUT_COUNTRIES + ONETRUST_OPTOUT_STATES from
  // app/lib/Plums/OneTrustHelper.php in the monolith, verbatim (271 codes).
  // Regions absent from this list keep the all-denied defaults below.
  var OPTOUT_REGIONS = [
    "AD", "AE", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AU", "AW",
    "AX", "AZ", "BA", "BB", "BD", "BF", "BH", "BI", "BJ", "BL", "BM", "BN",
    "BO", "BQ", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF",
    "CG", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX",
    "CY", "CZ", "DJ", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ET",
    "FJ", "FK", "FM", "FO", "GA", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
    "GM", "GN", "GP", "GQ", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN",
    "HR", "HT", "Hans", "Hant", "ID", "IL", "IM", "IN", "IO", "IQ", "IR",
    "JE", "JM", "JO", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW",
    "KY", "KZ", "LA", "LB", "LC", "LK", "LR", "LS", "LY", "MA", "MC", "MD",
    "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR",
    "MS", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NI",
    "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PM",
    "PN", "PR", "PS", "PW", "PY", "QA", "RE", "RS", "RU", "RW", "SA", "SB",
    "SC", "SD", "SG", "SH", "SJ", "SL", "SM", "SN", "SO", "SR", "SS", "ST",
    "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
    "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "UZ",
    "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
    "ZM", "ZW", "US-AK", "US-AL", "US-AR", "US-AS", "US-AZ", "US-CO", "US-CT",
    "US-DC", "US-DE", "US-GA", "US-GU", "US-HI", "US-IA", "US-ID", "US-IL",
    "US-IN", "US-KS", "US-KY", "US-LA", "US-MA", "US-MD", "US-ME", "US-MI",
    "US-MN", "US-MO", "US-MP", "US-MS", "US-MT", "US-NC", "US-ND", "US-NE",
    "US-NH", "US-NJ", "US-NM", "US-NY", "US-OH", "US-OK", "US-OR", "US-PA",
    "US-PR", "US-RI", "US-SC", "US-SD", "US-TN", "US-TX", "US-UM", "US-UT",
    "US-VA", "US-VI", "US-VT", "US-WA", "US-WI", "US-WV", "US-WY"
  ];

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
