(function (global) {
  "use strict";

  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clampSwing(swing) {
    return Math.max(0, Math.min(100, swing == null ? 0 : swing));
  }

  function clampHumanize(humanize) {
    return Math.max(0, Math.min(100, humanize == null ? 0 : humanize));
  }

  /** 0% → 0.5 straight, 100% → ~0.67 triplet swing */
  function swingRatio(swingPct) {
    return 0.5 + (clampSwing(swingPct) / 100) * 0.17;
  }

  function mapBeatWithSwing(beat, swingPct) {
    var swing = clampSwing(swingPct);
    if (swing <= 0) return beat;

    var ratio = swingRatio(swing);
    var beatInBar = ((beat % 4) + 4) % 4;
    var barStart = beat - beatInBar;
    var whole = Math.floor(beatInBar + 1e-9);
    var frac = beatInBar - whole;

    if (frac < 0.02) return beat;
    if (frac >= 0.48 && frac <= 0.52) {
      return barStart + whole + ratio;
    }
    if (frac >= 0.22 && frac <= 0.28) {
      return barStart + whole + frac * (1 + swing / 320);
    }
    return beat;
  }

  /**
   * @param {Array<{startBeat:number,durationBeats:number,midi:number,velocity:number}>} notes
   * @param {{swing?:number,humanize?:number,seed?:number}} opts
   */
  function applyFeel(notes, opts) {
    opts = opts || {};
    var swing = clampSwing(opts.swing);
    var humanize = clampHumanize(opts.humanize);
    if (!notes || !notes.length || (swing <= 0 && humanize <= 0)) {
      return (notes || []).map(function (n) {
        return {
          midi: n.midi,
          startBeat: n.startBeat,
          durationBeats: n.durationBeats,
          velocity: n.velocity,
          degree: n.degree,
          role: n.role,
          chordIndex: n.chordIndex,
        };
      });
    }

    var rng = mulberry32((opts.seed != null ? opts.seed : 1) ^ 0xfee1);
    return notes.map(function (n) {
      var start = mapBeatWithSwing(n.startBeat, swing);
      var vel = n.velocity == null ? 90 : n.velocity;
      var dur = n.durationBeats;

      if (humanize > 0) {
        var amount = humanize / 100;
        start += (rng() - 0.5) * amount * 0.045;
        vel = Math.round(Math.max(48, Math.min(118, vel + (rng() - 0.5) * amount * 22)));
        dur = Math.max(0.125, dur * (1 + (rng() - 0.5) * amount * 0.1));
      }

      return {
        midi: n.midi,
        startBeat: Math.max(0, start),
        durationBeats: dur,
        velocity: vel,
        degree: n.degree,
        role: n.role,
        chordIndex: n.chordIndex,
      };
    });
  }

  var api = {
    applyFeel: applyFeel,
    mapBeatWithSwing: mapBeatWithSwing,
    swingRatio: swingRatio,
    clampSwing: clampSwing,
    clampHumanize: clampHumanize,
  };

  global.ElasticFeel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
