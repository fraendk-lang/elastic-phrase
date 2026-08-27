(function (global) {
  "use strict";

  /** CC BY-SA 3.0 — https://github.com/gleitz/midi-js-soundfonts */
  var PRIMARY_PACK = "MusyngKite";
  var FALLBACK_PACK = "FluidR3_GM";
  var FORMAT = "mp3";
  var CDN_BASE = "https://gleitz.github.io/midi-js-soundfonts/";
  var LOCAL_BASE = "/assets/soundfonts/MusyngKite/";

  var INSTRUMENT_NAMES = [
    "flute",
    "acoustic_grand_piano",
    "bright_acoustic_piano",
    "electric_piano_1",
    "pad_2_warm",
  ];

  function instrumentFileName(name, format) {
    return name + "-" + (format || FORMAT) + ".js";
  }

  function localInstrumentUrl(name, format) {
    return LOCAL_BASE + instrumentFileName(name, format);
  }

  function cdnInstrumentUrl(name, pack, format) {
    return CDN_BASE + pack + "/" + instrumentFileName(name, format);
  }

  function instrumentLoadAttempts(name, format) {
    format = format || FORMAT;
    return [
      { url: localInstrumentUrl(name, format), label: "local " + PRIMARY_PACK },
      { url: cdnInstrumentUrl(name, PRIMARY_PACK, format), label: PRIMARY_PACK },
      { url: cdnInstrumentUrl(name, FALLBACK_PACK, format), label: FALLBACK_PACK },
    ];
  }

  var api = {
    PRIMARY_PACK: PRIMARY_PACK,
    FALLBACK_PACK: FALLBACK_PACK,
    FORMAT: FORMAT,
    CDN_BASE: CDN_BASE,
    LOCAL_BASE: LOCAL_BASE,
    INSTRUMENT_NAMES: INSTRUMENT_NAMES,
    instrumentFileName: instrumentFileName,
    localInstrumentUrl: localInstrumentUrl,
    cdnInstrumentUrl: cdnInstrumentUrl,
    instrumentLoadAttempts: instrumentLoadAttempts,
  };

  global.ElasticSoundfontConfig = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
