(function (global) {
  "use strict";

  var scale = global.ElasticScale;

  var QUALITY_INTERVALS = {
    maj: [0, 4, 7],
    m: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    "7": [0, 4, 7, 10],
    m7b5: [0, 3, 6, 10],
    dim7: [0, 3, 6, 9],
    sus4: [0, 5, 7],
    sus2: [0, 2, 7],
  };

  var ENHARMONIC = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E" };
  var DE_ROOTS = {
    Ais: 10, Cis: 1, Dis: 3, Fis: 6, Gis: 8, His: 11, Ces: 11, Des: 1, Eis: 5, Fes: 4,
    Ges: 6, As: 8, Es: 3, A: 9, B: 10, C: 0, D: 2, E: 4, F: 5, G: 7, H: 11,
  };
  var DE_TOKENS = [
    "Ais", "Cis", "Dis", "Fis", "Gis", "His", "Ces", "Des", "Eis", "Fes", "Ges",
    "As", "Es", "A", "B", "C", "D", "E", "F", "G", "H",
  ];
  var QUALITY_SUFFIXES = [
    ["maj7", "maj7"],
    ["m7b5", "m7b5"],
    ["dim7", "dim7"],
    ["min7", "m7"],
    ["min", "m"],
    ["m7", "m7"],
    ["sus4", "sus4"],
    ["sus2", "sus2"],
    ["dom7", "7"],
    ["7", "7"],
    ["dim", "dim"],
    ["aug", "aug"],
    ["M", "maj"],
    ["m", "m"],
    ["", "maj"],
  ];

  function parseRootToken(str, lang) {
    if (!str) return null;
    if (lang === "de") {
      var lower = str.toLowerCase();
      for (var i = 0; i < DE_TOKENS.length; i++) {
        var tok = DE_TOKENS[i];
        if (lower.indexOf(tok.toLowerCase()) === 0) {
          return { pc: DE_ROOTS[tok], len: tok.length };
        }
      }
      return null;
    }
    var m = str.match(/^([A-Ga-g])(#|b)?/);
    if (!m) return null;
    var name = m[1].toUpperCase() + (m[2] || "");
    if (ENHARMONIC[name]) name = ENHARMONIC[name];
    var idx = scale.NOTE_NAMES.indexOf(name);
    if (idx === -1) return null;
    return { pc: idx, len: m[0].length };
  }

  function matchQuality(suffix) {
    var raw = (suffix || "").trim();
    var lower = raw.toLowerCase();
    for (var i = 0; i < QUALITY_SUFFIXES.length; i++) {
      var key = QUALITY_SUFFIXES[i][0];
      if (key === raw || key.toLowerCase() === lower) return QUALITY_SUFFIXES[i][1];
    }
    return null;
  }

  /**
   * @param {string} text e.g. "Am7", "G/B", "F#m7b5"
   * @returns {{rootPc:number,qualityId:string,bassPc:number,beats:number}|null}
   */
  function parseChordSymbol(text, lang) {
    if (!text || typeof text !== "string") return null;
    var raw = text.trim();
    if (!raw) return null;

    var bassStr = null;
    var slash = raw.indexOf("/");
    if (slash !== -1) {
      bassStr = raw.slice(slash + 1).trim();
      raw = raw.slice(0, slash).trim();
    }

    var rootTok = parseRootToken(raw, lang || "en");
    if (!rootTok) return null;

    var suffix = raw.slice(rootTok.len).trim();
    var qualityId = matchQuality(suffix);
    if (!qualityId) return null;

    var bassPc = rootTok.pc;
    if (bassStr) {
      var bassTok = parseRootToken(bassStr, lang || "en");
      if (!bassTok || bassTok.len !== bassStr.length) return null;
      bassPc = bassTok.pc;
    }

    return {
      rootPc: scale.clampPc(rootTok.pc),
      qualityId: qualityId,
      bassPc: scale.clampPc(bassPc),
      beats: 4,
    };
  }

  /**
   * @param {string} text e.g. "Am7 | D7 | Gmaj7 | C"
   * @returns {{chords:Array, errors:Array, ok:boolean}}
   */
  function parseProgressionText(text, opts) {
    opts = opts || {};
    if (!text || !String(text).trim()) {
      return { chords: [], errors: [], ok: false };
    }
    var parts = String(text)
      .split(/[\|,;\n]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var chordsOut = [];
    var errors = [];
    parts.forEach(function (part, index) {
      var chord = parseChordSymbol(part, opts.lang);
      if (!chord) errors.push({ index: index, token: part });
      else chordsOut.push(chord);
    });
    return {
      chords: chordsOut,
      errors: errors,
      ok: errors.length === 0 && chordsOut.length > 0,
    };
  }

  function progressionTextFromChords(chordList) {
    return (chordList || []).map(chordLabel).join(" | ");
  }

  function chordTonePcs(rootPc, qualityId) {
    var ivs = QUALITY_INTERVALS[qualityId] || QUALITY_INTERVALS.maj;
    return ivs.map(function (iv) {
      return scale.clampPc(rootPc + iv);
    });
  }

  function deserializeCompact(entry) {
    if (!entry || typeof entry.r !== "number") return null;
    return {
      rootPc: scale.clampPc(entry.r),
      qualityId: entry.q || "maj",
      bassPc: scale.clampPc(typeof entry.b === "number" ? entry.b : entry.r),
      beats: entry.t && entry.t > 0 ? entry.t : 4,
    };
  }

  function parseComposerPayload(data) {
    if (!data || !Array.isArray(data.p) || !data.p.length) return null;
    var chords = data.p.map(deserializeCompact).filter(Boolean);
    if (!chords.length) return null;
    return {
      bpm: Math.min(240, Math.max(40, Math.round(data.b || 100))),
      key: data.k && typeof data.k.t === "number"
        ? { tonicPc: scale.clampPc(data.k.t), modeId: data.k.m || "major" }
        : null,
      chords: chords,
    };
  }

  function parseComposerHash(hash) {
    if (!hash || typeof hash !== "string") return null;
    var raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw.startsWith("c=")) return null;
    try {
      return parseComposerPayload(JSON.parse(decodeURIComponent(raw.slice(2))));
    } catch (e) {
      return null;
    }
  }

  function buildTimeline(chords) {
    var timeline = [];
    var beat = 0;
    (chords || []).forEach(function (chord, index) {
      timeline.push({
        index: index,
        chord: chord,
        startBeat: beat,
        durationBeats: chord.beats || 4,
        tones: chordTonePcs(chord.rootPc, chord.qualityId),
      });
      beat += chord.beats || 4;
    });
    return timeline;
  }

  function chordAtBeat(timeline, beat) {
    for (var i = timeline.length - 1; i >= 0; i--) {
      var seg = timeline[i];
      if (beat >= seg.startBeat && beat < seg.startBeat + seg.durationBeats) return seg;
    }
    return timeline.length ? timeline[timeline.length - 1] : null;
  }

  function chordLabel(chord) {
    var q = chord.qualityId === "maj" ? "" : chord.qualityId;
    return scale.noteName(chord.rootPc) + q;
  }

  function formatProgression(chords) {
    return (chords || []).map(chordLabel).join(" – ");
  }

  var api = {
    QUALITY_INTERVALS: QUALITY_INTERVALS,
    chordTonePcs: chordTonePcs,
    parseChordSymbol: parseChordSymbol,
    parseProgressionText: parseProgressionText,
    progressionTextFromChords: progressionTextFromChords,
    parseComposerPayload: parseComposerPayload,
    parseComposerHash: parseComposerHash,
    buildTimeline: buildTimeline,
    chordAtBeat: chordAtBeat,
    chordLabel: chordLabel,
    formatProgression: formatProgression,
  };

  global.ElasticChords = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
