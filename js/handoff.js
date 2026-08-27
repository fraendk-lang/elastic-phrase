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

  function serializeShareState(state) {
    if (!state) return null;
    var payload = {
      v: 1,
      t: state.tonicPc,
      m: state.modeId,
      s: state.styleId,
      b: state.bars,
      i: Math.round((state.intensity == null ? 0.55 : state.intensity) * 100),
      bp: state.bpm,
      sd: state.seed,
    };
    if (state.soundPreset && state.soundPreset !== "flute") payload.sf = state.soundPreset;
    if (state.reverb != null && Math.round(state.reverb * 100) !== 28) {
      payload.rv = Math.round(state.reverb * 100);
    }
    if (state.euclidean && state.euclidean.enabled) {
      payload.e = {
        p: state.euclidean.pulses,
        st: state.euclidean.steps,
        r: state.euclidean.rotation,
        sp: state.euclidean.scalePulses,
        sr: state.euclidean.scaleRotation,
      };
    }
    if (state.chords && state.chords.length) {
      payload.c = state.chords.map(function (c) {
        var e = { r: c.rootPc, q: c.qualityId, b: c.bassPc };
        if (c.beats && c.beats !== 4) e.t = c.beats;
        return e;
      });
    }
    if (state.swing != null && state.swing !== 58) payload.sw = state.swing;
    if (state.humanize != null && state.humanize !== 35) payload.hu = state.humanize;
    return payload;
  }

  function parseShareHash(hash) {
    if (!hash || typeof hash !== "string") return null;
    var raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw.startsWith("s=")) return null;
    try {
      return JSON.parse(decodeURIComponent(raw.slice(2)));
    } catch (e) {
      return null;
    }
  }

  function applySharePayload(payload) {
    if (!payload || payload.v !== 1) return null;
    var scale = global.ElasticScale;
    var chordsApi = global.ElasticChords;
    if (!scale) return null;

    var next = {
      tonicPc: scale.clampPc(payload.t == null ? 0 : payload.t),
      modeId: payload.m || "dorian",
      styleId: payload.s || "modal-jazz",
      bars: Math.max(2, Math.min(8, payload.b == null ? 4 : payload.b)),
      intensity: Math.max(0, Math.min(100, payload.i == null ? 55 : payload.i)) / 100,
      bpm: Math.max(40, Math.min(240, payload.bp == null ? 100 : payload.bp)),
      seed: payload.sd == null ? Date.now() & 0xffff : payload.sd,
      soundPreset: payload.sf || "flute",
      reverb: payload.rv == null ? 0.28 : Math.max(0, Math.min(100, payload.rv)) / 100,
      swing: payload.sw == null ? 58 : Math.max(0, Math.min(100, payload.sw)),
      humanize: payload.hu == null ? 35 : Math.max(0, Math.min(100, payload.hu)),
      euclidean: {
        enabled: false,
        pulses: 5,
        steps: 8,
        rotation: 0,
        scalePulses: 4,
        scaleRotation: 0,
      },
      chords: null,
      importLabel: "",
    };

    if (payload.e && typeof payload.e === "object") {
      next.euclidean.enabled = true;
      next.euclidean.pulses = payload.e.p == null ? 5 : payload.e.p;
      next.euclidean.steps = payload.e.st == null ? 8 : payload.e.st;
      next.euclidean.rotation = payload.e.r == null ? 0 : payload.e.r;
      next.euclidean.scalePulses = payload.e.sp == null ? 4 : payload.e.sp;
      next.euclidean.scaleRotation = payload.e.sr == null ? 0 : payload.e.sr;
    }

    if (payload.c && Array.isArray(payload.c) && chordsApi) {
      var parsed = chordsApi.parseComposerPayload({ p: payload.c, b: next.bpm, k: { t: next.tonicPc, m: next.modeId } });
      if (parsed && parsed.chords.length) {
        next.chords = parsed.chords;
        next.importLabel = chordsApi.formatProgression(parsed.chords);
      }
    }

    return next;
  }

  function buildShareUrl(state, baseUrl) {
    var payload = serializeShareState(state);
    if (!payload) return baseUrl || PHRASE_APP_URL;
    var root = (baseUrl || PHRASE_APP_URL).replace(/\/$/, "");
    return root + "#s=" + encodeURIComponent(JSON.stringify(payload));
  }

  function importShareFromLocation(loc) {
    loc = loc || (typeof window !== "undefined" ? window.location : null);
    if (!loc) return null;
    var payload = parseShareHash(loc.hash || "");
    return applySharePayload(payload);
  }

  var api = {
    COMPOSER_APP_URL: COMPOSER_APP_URL,
    PHRASE_APP_URL: PHRASE_APP_URL,
    buildComposerUrl: buildComposerUrl,
    buildPhraseImportUrl: buildPhraseImportUrl,
    parsePhraseHash: parsePhraseHash,
    parseComposerHash: parseComposerHash,
    importFromLocation: importFromLocation,
    serializeShareState: serializeShareState,
    parseShareHash: parseShareHash,
    applySharePayload: applySharePayload,
    buildShareUrl: buildShareUrl,
    importShareFromLocation: importShareFromLocation,
  };

  global.ElasticHandoff = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
