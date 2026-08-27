(function (global) {
  "use strict";

  var scale = global.ElasticScale;
  var chords = global.ElasticChords;

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

  function nearestMidi(candidates, prevMidi, preferRegister) {
    var base = preferRegister != null ? preferRegister * 12 : 60;
    var best = candidates[0];
    var bestScore = Infinity;
    candidates.forEach(function (pc) {
      for (var oct = 3; oct <= 6; oct++) {
        var midi = oct * 12 + pc;
        var score = Math.abs(midi - (prevMidi || base)) + Math.abs(midi - 66) * 0.15;
        if (score < bestScore) {
          bestScore = score;
          best = midi;
        }
      }
    });
    return best;
  }

  function chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId) {
    var tones = seg.tones;
    var weighted = [];
    tones.forEach(function (pc, i) {
      var w = i === 0 ? 3 : 1;
      for (var k = 0; k < w; k++) weighted.push(pc);
    });
    var pc = pick(rng, weighted);
    return nearestMidi([pc], prevMidi, 5);
  }

  function scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi) {
    var oct = octaveDrift(degree, bar, rng);
    var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
    if (rng() > 0.82) midi += rng() > 0.5 ? 1 : -1;
    if (prevMidi != null && Math.abs(midi - prevMidi) > 7) {
      midi += midi > prevMidi ? -12 : 12;
    }
    return midi;
  }

  function totalBeatsFromChords(chordList) {
    return (chordList || []).reduce(function (sum, c) {
      return sum + (c.beats || 4);
    }, 0);
  }

  function activeDegreesFromPattern(degreePattern) {
    var list = [];
    for (var d = 0; d < degreePattern.length; d++) {
      if (degreePattern[d]) list.push(d);
    }
    return list.length ? list : [0, 2, 4];
  }

  function generateEuclideanCore(opts, rng, intensity, timeline) {
    var euclid = global.ElasticEuclid;
    if (!euclid) throw new Error("ElasticEuclid missing");
    var tonicPc = scale.clampPc(opts.tonicPc == null ? 0 : opts.tonicPc);
    var modeId = opts.modeId || "dorian";
    var bars = opts.bars || 4;
    var barLen = 4;
    var e = opts.euclidean || {};
    var pulses = Math.max(1, Math.min(16, e.pulses == null ? 5 : e.pulses));
    var steps = Math.max(4, Math.min(16, e.steps == null ? 8 : e.steps));
    var rotation = e.rotation == null ? 0 : e.rotation;
    var scalePulses = Math.max(1, Math.min(7, e.scalePulses == null ? 4 : e.scalePulses));
    var scaleRotation = e.scaleRotation == null ? 0 : e.scaleRotation;

    var rhythm = euclid.euclidean(pulses, steps, rotation);
    var degreePattern = euclid.euclidean(scalePulses, 7, scaleRotation);
    var activeDegrees = activeDegreesFromPattern(degreePattern);
    var stepDur = barLen / steps;
    var notes = [];
    var prevMidi = null;
    var pulseIdx = 0;
    var totalBeats = timeline ? totalBeatsFromChords(opts.chords) : bars * barLen;
    var beatCap = timeline ? totalBeats : bars * barLen;

    for (var bar = 0; bar < bars && bar * barLen < beatCap; bar++) {
      for (var step = 0; step < steps; step++) {
        var atBeat = bar * barLen + step * stepDur;
        if (atBeat >= beatCap) break;
        if (!rhythm[step % rhythm.length]) continue;

        var seg = timeline ? chords.chordAtBeat(timeline, atBeat) : null;
        var midi;
        if (seg) {
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId);
        } else {
          var degree = activeDegrees[pulseIdx % activeDegrees.length];
          if (rng() > 0.72) {
            degree = activeDegrees[Math.floor(rng() * activeDegrees.length)];
          }
          midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi);
        }

        notes.push({
          midi: midi,
          startBeat: atBeat,
          durationBeats: Math.max(stepDur * 0.85, 0.125),
          velocity: velocityForRole(pulseIdx % 2 === 0 ? "target" : "pass", rng, intensity),
          degree: activeDegrees[pulseIdx % activeDegrees.length],
          role: "euclid",
          chordIndex: seg ? seg.index : null,
        });
        prevMidi = midi;
        pulseIdx += 1;
      }
    }

    return {
      notes: notes,
      meta: {
        tonicPc: tonicPc,
        modeId: modeId,
        styleId: "euclidean",
        bars: timeline ? Math.ceil(totalBeats / barLen) : bars,
        beatsPerBar: barLen,
        totalBeats: beatCap,
        keyLabel: scale.keyLabel(tonicPc, modeId),
        chordAware: !!timeline,
        euclidean: {
          pulses: pulses,
          steps: steps,
          rotation: rotation,
          scalePulses: scalePulses,
          scaleRotation: scaleRotation,
          rhythmLabel: euclid.patternLabel(rhythm),
          scaleLabel: euclid.patternLabel(degreePattern),
        },
        progression: timeline
          ? opts.chords.map(function (c) { return chords.chordLabel(c); }).join(" – ")
          : undefined,
      },
    };
  }

  function generateEuclidean(opts, rng, intensity) {
    return generateEuclideanCore(opts, rng, intensity, null);
  }

  function generateEuclideanWithChords(opts, rng, intensity) {
    var total = totalBeatsFromChords(opts.chords);
    var next = Object.assign({}, opts, { bars: Math.max(1, Math.ceil(total / 4)) });
    return generateEuclideanCore(next, rng, intensity, chords.buildTimeline(opts.chords));
  }

  function generateFromChords(opts, pattern, rng, intensity) {
    var timeline = chords.buildTimeline(opts.chords);
    var totalBeats = totalBeatsFromChords(opts.chords);
    var barLen = 4;
    var bars = Math.max(1, Math.ceil(totalBeats / barLen));
    var tonicPc = scale.clampPc(opts.tonicPc == null ? 0 : opts.tonicPc);
    var modeId = opts.modeId || "dorian";
    var notes = [];
    var prevMidi = null;
    var beat = 0;

    while (beat < totalBeats) {
      var bar = Math.floor(beat / barLen);
      var cells = pattern.cells.slice();
      if (rng() > 0.65) {
        cells = cells.map(function (c) {
          return {
            degrees: c.degrees.map(function (d) { return (d + 1) % 7; }),
            dur: c.dur,
            role: c.role,
          };
        });
      }

      var barBeat = 0;
      var ci = 0;
      while (barBeat < barLen && beat + barBeat < totalBeats && ci < cells.length * 2) {
        var cell = cells[ci % cells.length];
        var atBeat = beat + barBeat;
        var seg = chords.chordAtBeat(timeline, atBeat);
        var dur = cell.dur;
        if (barBeat + dur > barLen) dur = barLen - barBeat;
        if (atBeat + dur > totalBeats) dur = totalBeats - atBeat;

        var midi;
        if (seg && cell.role === "target") {
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId);
        } else if (seg) {
          var degree = pick(rng, cell.degrees);
          midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi);
          if (rng() > 0.55) {
            midi = nearestMidi(seg.tones, prevMidi, 5);
          }
        } else {
          var deg = pick(rng, cell.degrees);
          midi = scalePassMidi(tonicPc, modeId, deg, bar, rng, prevMidi);
        }

        notes.push({
          midi: midi,
          startBeat: atBeat,
          durationBeats: dur,
          velocity: velocityForRole(cell.role, rng, intensity),
          degree: cell.degrees[0],
          role: cell.role,
          chordIndex: seg ? seg.index : null,
        });

        prevMidi = midi;
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
        styleId: opts.styleId || "modal-jazz",
        bars: bars,
        beatsPerBar: barLen,
        totalBeats: totalBeats,
        keyLabel: scale.keyLabel(tonicPc, modeId),
        chordAware: true,
        progression: opts.chords.map(function (c) {
          return chords.chordLabel(c);
        }).join(" – "),
      },
    };
  }

  /**
   * @param {{tonicPc:number, modeId:string, styleId:string, bars?:number, seed?:number, intensity?:number, chords?:Array}} opts
   * @returns {{notes:Array, meta:object}}
   */
  function generatePhrase(opts) {
    opts = opts || {};
    var tonicPc = scale.clampPc(opts.tonicPc == null ? 0 : opts.tonicPc);
    var modeId = opts.modeId || "dorian";
    var styleId = opts.styleId || "modal-jazz";
    var pattern = PATTERNS[styleId] || PATTERNS["modal-jazz"];
    var rng = mulberry32(opts.seed != null ? opts.seed : Date.now() & 0xffff);
    var intensity = opts.intensity == null ? 0.55 : opts.intensity;

    if (opts.euclidean && opts.euclidean.enabled) {
      if (opts.chords && opts.chords.length) {
        return generateEuclideanWithChords(opts, rng, intensity);
      }
      return generateEuclidean(opts, rng, intensity);
    }

    if (opts.chords && opts.chords.length) {
      return generateFromChords(
        {
          tonicPc: tonicPc,
          modeId: modeId,
          styleId: styleId,
          chords: opts.chords,
        },
        pattern,
        rng,
        intensity
      );
    }

    var bars = opts.bars || pattern.bars || 4;
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
        chordAware: false,
      },
    };
  }

  function buildElasticContext(result, bpm, extra) {
    extra = extra || {};
    var ctx = {
      v: 1,
      app: "elastic-phrase",
      bpm: Math.round(bpm || 100),
      key: { t: result.meta.tonicPc, m: result.meta.modeId },
      phrase: result.notes.map(function (n) {
        return { m: n.midi, s: n.startBeat, d: n.durationBeats, v: n.velocity };
      }),
    };
    if (extra.chords && extra.chords.length) {
      ctx.chords = extra.chords.map(function (c) {
        return { r: c.rootPc, q: c.qualityId, b: c.bassPc, t: c.beats !== 4 ? c.beats : undefined };
      }).map(function (entry) {
        if (entry.t === undefined) delete entry.t;
        return entry;
      });
    }
    return ctx;
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
