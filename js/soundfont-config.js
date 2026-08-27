(function (global) {
  "use strict";

  var PRIMARY_PACK = "MusyngKite";
  var FALLBACK_PACK = "FluidR3_GM";
  var FORMAT = "mp3";
  var CDN_BASE = "https://gleitz.github.io/midi-js-soundfonts/";

  function cdnInstrumentUrl(name, pack, format) {
    return CDN_BASE + pack + "/" + name + "-" + (format || FORMAT) + ".js";
  }

  function instrumentLoadAttempts(name, format) {
    format = format || FORMAT;
    return [
      { url: cdnInstrumentUrl(name, PRIMARY_PACK, format), label: PRIMARY_PACK },
      { url: cdnInstrumentUrl(name, FALLBACK_PACK, format), label: FALLBACK_PACK },
    ];
  }

  var api = {
    PRIMARY_PACK: PRIMARY_PACK,
    FORMAT: FORMAT,
    instrumentLoadAttempts: instrumentLoadAttempts,
  };

  global.ElasticSoundfontConfig = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
