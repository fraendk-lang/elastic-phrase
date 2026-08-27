(function (global) {
  "use strict";

  var COMPOSER_APP_URL = "https://elasticcomposer.app";

  function buildComposerUrl(context) {
    if (!context || !context.phrase || !context.phrase.length) return COMPOSER_APP_URL;
    var url = COMPOSER_APP_URL.replace(/\/$/, "") + "/?from=phrase";
    url += "#p=" + encodeURIComponent(JSON.stringify(context));
    return url;
  }

  function parsePhraseHash(hash) {
    if (!hash || typeof hash !== "string") return null;
    var raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw.startsWith("p=")) return null;
    try {
      return JSON.parse(decodeURIComponent(raw.slice(2)));
    } catch (e) {
      return null;
    }
  }

  var api = {
    COMPOSER_APP_URL: COMPOSER_APP_URL,
    buildComposerUrl: buildComposerUrl,
    parsePhraseHash: parsePhraseHash,
  };

  global.ElasticHandoff = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
