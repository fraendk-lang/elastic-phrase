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
        { degrees: [0], dur: 0.75, role: "target" },
        { degrees: [2], dur: 0.25, role: "pass" },
        { degrees: [3], dur: 0.75, role: "target" },
        { degrees: [2], dur: 0.25, role: "pass" },
        { degrees: [4], dur: 0.75, role: "target" },
        { degrees: [2], dur: 0.25, role: "pass" },
        { degrees: [0], dur: 0.75, role: "target" },
        { degrees: [4], dur: 0.25, role: "pass" },
      ],
    },
    bebop: {
      bars: 4,
      cells: [
        { degrees: [4], dur: 0.5, role: "pass" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [0], dur: 0.5, role: "target" },
        { degrees: [1], dur: 0.5, role: "pass" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "target" },
        { degrees: [6], dur: 0.5, role: "pass" },
        { degrees: [5], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [0], dur: 0.5, role: "target" },
        { degrees: [6], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [0], dur: 0.5, role: "target" },
        { degrees: [4], dur: 0.5, role: "pass" },
      ],
    },
    "pop-hook": {
      bars: 4,
      cells: [
        { degrees: [0], dur: 0.5, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 1, role: "target" },
        { degrees: [2], dur: 0.5, role: "pass" },
        { degrees: [0], dur: 0.5, role: "target" },
        { degrees: [4], dur: 1, role: "target" },
        { degrees: [5], dur: 0.5, role: "pass" },
        { degrees: [4], dur: 0.5, role: "target" },
        { degrees: [2], dur: 1, role: "target" },
        { degrees: [0], dur: 1, role: "target" },
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

  function velocityForRole(role, rng, intensity, styleId) {
    var base = role === "target" ? 92 : 72;
    if (styleId === "bebop") {
      base = role === "target" ? 98 : 64;
    } else if (styleId === "pop-hook") {
      base = role === "target" ? 96 : 76;
    } else if (styleId === "blues") {
      base = role === "target" ? 94 : 68;
    }
    var spread = Math.round((intensity || 0.5) * 18);
    if (styleId === "bebop") spread += 6;
    return Math.max(48, Math.min(118, base + Math.round((rng() - 0.5) * spread)));
  }

  function isBebop(styleId) {
    return styleId === "bebop";
  }

  function isPopHook(styleId) {
    return styleId === "pop-hook";
  }

  function isBlues(styleId) {
    return styleId === "blues";
  }

  function applyBlueNotes(midi, degree, rng, role) {
    if (role !== "pass" && rng() > 0.68) return midi;
    if (degree === 2 && rng() > 0.28) return midi - 1;
    if (degree === 4 && rng() > 0.42) return midi - 1;
    if (degree === 6 && rng() > 0.32) return midi - 1;
    return midi;
  }

  function bluesMidi(tonicPc, modeId, degree, bar, rng, prevMidi, role) {
    var oct = bar < 2 ? 4 : 5;
    var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
    midi = applyBlueNotes(midi, degree, rng, role);
    if (prevMidi != null && Math.abs(midi - prevMidi) > 8) {
      midi += midi > prevMidi ? -12 : 12;
    }
    return midi;
  }

  function styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, role, targetHint, cellDegrees) {
    if (isBebop(styleId) && role === "pass") {
      var targetMidi = scale.degreeToMidi(tonicPc, modeId, degree, octaveDrift(degree, bar, rng));
      return bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint || targetMidi);
    }
    if (isPopHook(styleId)) {
      return popHookMidi(tonicPc, modeId, popHookPickDegree(rng, cellDegrees || [degree]), bar, rng, prevMidi);
    }
    if (isBlues(styleId)) {
      return bluesMidi(tonicPc, modeId, degree, bar, rng, prevMidi, role);
    }
    return scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi);
  }

  function popHookDegrees() {
    return [0, 2, 4, 5, 6];
  }

  function popHookPickDegree(rng, cellDegrees) {
    var pent = popHookDegrees();
    var pool = cellDegrees.filter(function (d) {
      return pent.indexOf(d) !== -1;
    });
    return pick(rng, pool.length ? pool : pent);
  }

  function popHookMidi(tonicPc, modeId, degree, bar, rng, prevMidi) {
    var oct = bar % 2 === 0 ? 5 : 5;
    var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
    if (prevMidi != null && Math.abs(midi - prevMidi) > 9) {
      midi += midi > prevMidi ? -12 : 12;
    }
    return midi;
  }

  function chromaticNeighbor(midi, direction) {
    return midi + (direction > 0 ? 1 : -1);
  }

  function bebopApproachMidi(targetMidi, prevMidi, rng) {
    var below = chromaticNeighbor(targetMidi, -1);
    var above = chromaticNeighbor(targetMidi, 1);
    if (prevMidi == null) return rng() > 0.5 ? below : above;
    var dBelow = Math.abs(below - prevMidi);
    var dAbove = Math.abs(above - prevMidi);
    return dBelow <= dAbove ? below : above;
  }

  function bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint) {
    if (targetHint != null && rng() > 0.38) {
      return bebopApproachMidi(targetHint, prevMidi, rng);
    }
    var midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi);
    if (rng() > 0.55) {
      midi = chromaticNeighbor(midi, rng() > 0.5 ? 1 : -1);
    }
    return midi;
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

  function chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, styleId) {
    var tones = seg.tones;
    var weighted = [];
    tones.forEach(function (pc, i) {
      var w = 1;
      if (i === 0) w = isBebop(styleId) ? 1 : 3;
      else if (i === 1) w = isBebop(styleId) ? 4 : 1;
      else if (i >= 3) w = isBebop(styleId) ? 3 : 1;
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
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, opts.styleId);
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
          velocity: velocityForRole(
            pulseIdx % 2 === 0 ? "target" : "pass",
            rng,
            intensity,
            opts.styleId
          ),
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
    var styleId = opts.styleId || "modal-jazz";
    var notes = [];
    var prevMidi = null;
    var beat = 0;
    var bebop = isBebop(styleId);
    var popHook = isPopHook(styleId);
    var blues = isBlues(styleId);

    while (beat < totalBeats) {
      var bar = Math.floor(beat / barLen);
      var cells = pattern.cells.slice();
      if (popHook && bar >= 2 && rng() > 0.45) {
        cells = cells.map(function (c) {
          return {
            degrees: c.degrees.map(function (d) { return (d + 2) % 7; }),
            dur: c.dur,
            role: c.role,
          };
        });
      } else if (rng() > (bebop ? 0.45 : popHook ? 0.55 : 0.65)) {
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
        if (bebop && cell.role === "pass" && rng() > 0.5) dur = Math.max(0.25, dur * 0.85);
        if (barBeat + dur > barLen) dur = barLen - barBeat;
        if (atBeat + dur > totalBeats) dur = totalBeats - atBeat;

        var midi;
        var targetHint = seg ? nearestMidi(seg.tones, prevMidi, 5) : null;
        if (seg && cell.role === "target") {
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, styleId);
          if (blues) {
            midi = applyBlueNotes(midi, cell.degrees[0], rng, "target");
          }
        } else {
          var degree = popHook ? popHookPickDegree(rng, cell.degrees) : pick(rng, cell.degrees);
          if (seg && bebop) {
            midi = bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint);
          } else if (seg && !popHook && !blues) {
            midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi);
            if (rng() > 0.55) {
              midi = nearestMidi(seg.tones, prevMidi, 5);
            }
          } else {
            midi = styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, cell.role, targetHint, cell.degrees);
          }
        }

        notes.push({
          midi: midi,
          startBeat: atBeat,
          durationBeats: dur,
          velocity: velocityForRole(cell.role, rng, intensity, styleId),
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
    var prevMidi = null;

    var bebop = isBebop(styleId);
    var popHook = isPopHook(styleId);
    var blues = isBlues(styleId);

    for (var bar = 0; bar < bars; bar++) {
      var cells = pattern.cells.slice();
      if (popHook && bar >= 2 && rng() > 0.45) {
        cells = cells.map(function (c) {
          return {
            degrees: c.degrees.map(function (d) { return (d + 2) % 7; }),
            dur: c.dur,
            role: c.role,
          };
        });
      } else if (rng() > (bebop ? 0.45 : popHook ? 0.55 : 0.65)) {
        cells = cells.map(function (c) {
          return { degrees: c.degrees.map(function (d) { return (d + 1) % 7; }), dur: c.dur, role: c.role };
        });
      }

      var barBeat = 0;
      var ci = 0;
      var nextTargetDegree = cells[(ci + 2) % cells.length].degrees[0];
      while (barBeat < barLen && ci < cells.length) {
        var cell = cells[ci % cells.length];
        var degree = popHook ? popHookPickDegree(rng, cell.degrees) : pick(rng, cell.degrees);
        var oct = octaveDrift(degree, bar, rng);
        var midi;
        if (bebop && cell.role === "pass") {
          var targetMidi = scale.degreeToMidi(tonicPc, modeId, nextTargetDegree, oct);
          midi = bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetMidi);
        } else if (popHook || blues) {
          midi = styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, cell.role, null, cell.degrees);
        } else {
          midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
          if (rng() > 0.82 && cell.role === "pass") {
            midi += rng() > 0.5 ? 1 : -1;
          }
        }

        var dur = cell.dur;
        if (bebop && cell.role === "pass" && rng() > 0.5) dur = Math.max(0.25, dur * 0.85);
        if (barBeat + dur > barLen) dur = barLen - barBeat;

        notes.push({
          midi: midi,
          startBeat: beat + barBeat,
          durationBeats: dur,
          velocity: velocityForRole(cell.role, rng, intensity, styleId),
          degree: degree,
          role: cell.role,
        });

        prevMidi = midi;
        if (cell.role === "target") nextTargetDegree = degree;
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

  function mutatePhrase(result, mutateMode, seed) {
    if (!result || !result.notes || !result.notes.length) return result;
    mutateMode = mutateMode || "both";
    var rng = mulberry32(seed != null ? seed >>> 0 : Date.now() & 0xffff);
    var notes = result.notes.map(function (n) {
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
    var tonicPc = result.meta.tonicPc;
    var modeId = result.meta.modeId;

    if (mutateMode === "rhythm" || mutateMode === "both") {
      notes.forEach(function (n) {
        if (rng() > 0.2) {
          n.startBeat = Math.max(0, n.startBeat + pick(rng, [0.25, -0.25, 0.5, -0.5]));
        }
        if (rng() > 0.3) {
          n.durationBeats = Math.max(0.125, n.durationBeats * (0.72 + rng() * 0.56));
        }
        if (rng() > 0.55) {
          n.velocity = Math.max(48, Math.min(118, n.velocity + Math.round((rng() - 0.5) * 14)));
        }
      });
      notes.sort(function (a, b) {
        return a.startBeat - b.startBeat;
      });
    }

    if (mutateMode === "melody" || mutateMode === "both") {
      var pcs = scale.scalePcs(tonicPc, modeId);
      notes.forEach(function (n) {
        if (rng() > 0.32) return;
        var pc = scale.clampPc(n.midi);
        var idx = pcs.indexOf(pc);
        if (idx === -1) {
          n.midi += rng() > 0.5 ? 1 : -1;
          return;
        }
        var dir = rng() > 0.5 ? 1 : -1;
        var nextIdx = (idx + dir + 7) % 7;
        var oct = Math.floor(n.midi / 12);
        n.midi = oct * 12 + pcs[nextIdx];
        n.degree = nextIdx;
      });
    }

    return {
      notes: notes,
      meta: Object.assign({}, result.meta, { mutated: mutateMode }),
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
    mutatePhrase: mutatePhrase,
    buildElasticContext: buildElasticContext,
  };

  global.ElasticPhraseEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
