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
