(function (global) {
  "use strict";

  var scale = global.ElasticScale;

  /** Modal jazz: quartal motion, target tones on 1 & 3, passing tones on offbeats */
  var PATTERNS = {
    "modal-jazz": {
      bars: 4,
      cells: [
        { degrees: [0], dur: 1, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "pass" },
        { degrees: [3], dur: 1, role: "target" },
        { degrees: [5], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "pass" },
        { degrees: [2], dur: 1, role: "target" },
        { degrees: [0], dur: 1, role: "target" },
      ],
    },
    blues: {
      bars: 4,
      cells: [
        { degrees: [0], dur: 1, role: "target" },
        { degrees: [0], dur: 0.5, role: "pass" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [3], dur: 1, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [0], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 1, role: "target" },
        { degrees: [2], dur: 1, role: "target" },
        { degrees: [0], dur: 2, role: "target" },
      ],
    },
  };

  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function velocityForRole(role, rng, intensity) {
    var base = role === "target" ? 92 : 72;
    var spread = Math.round((intensity || 0.5) * 18);
    return Math.max(48, Math.min(118, base + Math.round((rng() - 0.5) * spread)));
  }

  function octaveDrift(degree, barIndex, rng) {
    if (degree <= 2) return 4 + (barIndex % 2 === 0 ? 0 : 0);
    if (degree >= 5) return 5 + (rng() > 0.7 ? 1 : 0);
    return 5;
  }

  /**
   * @param {{tonicPc:number, modeId:string, styleId:string, bars?:number, seed?:number, intensity?:number}} opts
   * @returns {{notes:Array, meta:object}}
   */
  function generatePhrase(opts) {
    var tonicPc = scale.clampPc(opts.tonicPc == null ? 0 : opts.tonicPc);
    var modeId = opts.modeId || "dorian";
    var styleId = opts.styleId || "modal-jazz";
    var pattern = PATTERNS[styleId] || PATTERNS["modal-jazz"];
    var bars = opts.bars || pattern.bars || 4;
    var rng = mulberry32(opts.seed != null ? opts.seed : Date.now() & 0xffff);
    var intensity = opts.intensity == null ? 0.55 : opts.intensity;

    var notes = [];
    var beat = 0;
    var barLen = 4;

    for (var bar = 0; bar < bars; bar++) {
      var cells = pattern.cells.slice();
      if (rng() > 0.65) {
        cells = cells.map(function (c) {
          return { degrees: c.degrees.map(function (d) { return (d + 1) % 7; }), dur: c.dur, role: c.role };
        });
      }

      var barBeat = 0;
      var ci = 0;
      while (barBeat < barLen && ci < cells.length) {
        var cell = cells[ci % cells.length];
        var degree = pick(rng, cell.degrees);
        var oct = octaveDrift(degree, bar, rng);
        var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);

        if (rng() > 0.82 && cell.role === "pass") {
          midi += rng() > 0.5 ? 1 : -1;
        }

        var dur = cell.dur;
        if (barBeat + dur > barLen) dur = barLen - barBeat;

        notes.push({
          midi: midi,
          startBeat: beat + barBeat,
          durationBeats: dur,
          velocity: velocityForRole(cell.role, rng, intensity),
          degree: degree,
          role: cell.role,
        });

        barBeat += dur;
        ci += 1;
      }
      beat += barLen;
    }

    return {
      notes: notes,
      meta: {
        tonicPc: tonicPc,
        modeId: modeId,
        styleId: styleId,
        bars: bars,
        beatsPerBar: barLen,
        keyLabel: scale.keyLabel(tonicPc, modeId),
      },
    };
  }

  function buildElasticContext(result, bpm) {
    return {
      v: 1,
      app: "elastic-phrase",
      bpm: Math.round(bpm || 100),
      key: { t: result.meta.tonicPc, m: result.meta.modeId },
      phrase: result.notes.map(function (n) {
        return { m: n.midi, s: n.startBeat, d: n.durationBeats, v: n.velocity };
      }),
    };
  }

  var api = {
    PATTERNS: PATTERNS,
    generatePhrase: generatePhrase,
    buildElasticContext: buildElasticContext,
  };

  global.ElasticPhraseEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
