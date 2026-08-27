(function (global) {
  "use strict";

  var COMPOSER_APP_URL = "https://elasticcomposer.app";
  var PHRASE_APP_URL = "https://elastic-phrase.vercel.app";

  function buildComposerUrl(context) {
    if (!context || !context.phrase || !context.phrase.length) return COMPOSER_APP_URL;
    var url = COMPOSER_APP_URL.replace(/\/$/, "") + "/?from=phrase";
    url += "#p=" + encodeURIComponent(JSON.stringify(context));
    return url;
  }

  function buildPhraseImportUrl(payload) {
    if (!payload || !payload.chords || !payload.chords.length) return PHRASE_APP_URL;
    var compact = {
      b: payload.bpm,
      p: payload.chords.map(function (c) {
        var e = { r: c.rootPc, q: c.qualityId, b: c.bassPc };
        if (c.beats && c.beats !== 4) e.t = c.beats;
        return e;
      }),
    };
    if (payload.key) compact.k = { t: payload.key.tonicPc, m: payload.key.modeId };
    return (
      PHRASE_APP_URL.replace(/\/$/, "") +
      "/?from=composer&bpm=" +
      compact.b +
      "#c=" +
      encodeURIComponent(JSON.stringify(compact))
    );
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

  function parseComposerHash(hash) {
    if (global.ElasticChords) return global.ElasticChords.parseComposerHash(hash);
    return null;
  }

  function importFromLocation(loc) {
    loc = loc || (typeof window !== "undefined" ? window.location : null);
    if (!loc) return null;
    var params = new URLSearchParams(loc.search || "");
    if (params.get("from") !== "composer") return null;
    var data = parseComposerHash(loc.hash || "");
    if (!data) return null;
    data.bpm = Number(params.get("bpm")) || data.bpm || 100;
    return data;
  }

  var api = {
    COMPOSER_APP_URL: COMPOSER_APP_URL,
    PHRASE_APP_URL: PHRASE_APP_URL,
    buildComposerUrl: buildComposerUrl,
    buildPhraseImportUrl: buildPhraseImportUrl,
    parsePhraseHash: parsePhraseHash,
    parseComposerHash: parseComposerHash,
    importFromLocation: importFromLocation,
  };

  global.ElasticHandoff = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
