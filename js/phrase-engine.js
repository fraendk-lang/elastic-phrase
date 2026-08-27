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

  function resolveRegister(opts) {
    opts = opts || {};
    var minOct = Math.max(3, Math.min(6, opts.registerMin == null ? 4 : opts.registerMin));
    var maxOct = Math.max(minOct, Math.min(6, opts.registerMax == null ? 5 : opts.registerMax));
    return { minOct: minOct, maxOct: maxOct };
  }

  function clampMidiToRegister(midi, reg) {
    var pc = scale.clampPc(midi);
    var octNum = Math.floor(midi / 12) - 1;
    octNum = Math.max(reg.minOct, Math.min(reg.maxOct, octNum));
    return (octNum + 1) * 12 + pc;
  }

  function degreeToNearestMidi(tonicPc, modeId, degree, prevMidi, reg) {
    reg = reg || resolveRegister({});
    var best = scale.degreeToMidi(tonicPc, modeId, degree, reg.minOct);
    var bestDist = prevMidi == null ? Math.abs(best - 60) : Math.abs(best - prevMidi);
    for (var oct = reg.minOct; oct <= reg.maxOct; oct++) {
      var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
      var dist = prevMidi == null ? Math.abs(midi - 60) : Math.abs(midi - prevMidi);
      if (dist < bestDist) {
        bestDist = dist;
        best = midi;
      }
    }
    return clampMidiToRegister(best, reg);
  }

  function pickSmoothDegree(rng, degreeOptions, prevMidi, tonicPc, modeId, reg) {
    if (!degreeOptions || !degreeOptions.length) return 0;
    if (prevMidi == null) return pick(rng, degreeOptions);
    var ranked = degreeOptions
      .map(function (deg) {
        return {
          deg: deg,
          dist: Math.abs(degreeToNearestMidi(tonicPc, modeId, deg, prevMidi, reg) - prevMidi),
        };
      })
      .sort(function (a, b) {
        return a.dist - b.dist;
      });
    if (rng() > 0.68 && ranked.length > 1) {
      return pick(rng, ranked.slice(0, Math.min(3, ranked.length))).deg;
    }
    return ranked[0].deg;
  }

  function articulationRatio(role, styleId) {
    if (role === "target") {
      if (styleId === "bebop") return 0.86;
      if (styleId === "blues") return 0.9;
      return 0.92;
    }
    if (role === "pass") {
      if (styleId === "bebop") return 0.58;
      if (styleId === "blues") return 0.68;
      return 0.72;
    }
    if (role === "euclid") return 0.78;
    return 0.85;
  }

  function polishPhrase(notes, opts) {
    opts = opts || {};
    if (!notes || !notes.length) return notes || [];
    var styleId = opts.styleId || "modal-jazz";
    var timeline = opts.timeline || null;
    var gap = styleId === "bebop" ? 0.03 : 0.04;
    var sorted = notes
      .slice()
      .sort(function (a, b) {
        return a.startBeat - b.startBeat || a.midi - b.midi;
      });
    var out = [];

    for (var i = 0; i < sorted.length; i++) {
      var n = sorted[i];
      var nextStart = i + 1 < sorted.length ? sorted[i + 1].startBeat : null;
      var slotEnd = nextStart != null ? nextStart - gap : n.startBeat + n.durationBeats;
      var barEnd = Math.floor(n.startBeat / 4) * 4 + 4;
      if (nextStart == null || nextStart >= barEnd - 0.01) {
        slotEnd = Math.min(slotEnd, barEnd - 0.14);
      }
      var maxDur = Math.max(0.125, slotEnd - n.startBeat);
      var dur = Math.min(n.durationBeats, maxDur) * articulationRatio(n.role, styleId);
      dur = Math.max(0.125, Math.min(dur, maxDur));

      var pos = sorted.length <= 1 ? 0.5 : i / (sorted.length - 1);
      var arc = 1 + Math.sin(pos * Math.PI) * 0.12;
      var vel = Math.round(Math.max(48, Math.min(118, (n.velocity || 90) * arc)));

      if (beatInBar(n.startBeat) < 0.03) vel = Math.min(118, Math.round(vel * 1.12));
      if (timeline) {
        var seg = chords.chordAtBeat(timeline, n.startBeat);
        if (seg && Math.abs(n.startBeat - seg.startBeat) < 0.03) {
          vel = Math.min(118, Math.round(vel * 1.08));
        }
      }
      if (n.role === "target") vel = Math.min(118, vel + 2);
      if (i >= sorted.length - 2) vel = Math.round(vel * (i === sorted.length - 1 ? 0.86 : 0.93));

      out.push({
        midi: n.midi,
        startBeat: n.startBeat,
        durationBeats: dur,
        velocity: vel,
        degree: n.degree,
        role: n.role,
        chordIndex: n.chordIndex,
      });
    }

    return out;
  }

  function finalizePhrase(result, styleId, timeline) {
    if (!result || !result.notes) return result;
    result.notes = polishPhrase(result.notes, {
      styleId: styleId || (result.meta && result.meta.styleId),
      timeline: timeline || null,
    });
    return result;
  }

  function mergeMotifLock(result, preserveNotes, lockBeats) {
    if (!result || !preserveNotes || !preserveNotes.length || !lockBeats) return result;
    var kept = preserveNotes
      .filter(function (n) { return n.startBeat < lockBeats; })
      .map(function (n) {
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
    if (!kept.length) return result;
    var tail = result.notes.filter(function (n) { return n.startBeat >= lockBeats; });
    return {
      notes: kept.concat(tail).sort(function (a, b) { return a.startBeat - b.startBeat; }),
      meta: Object.assign({}, result.meta, { motifLockBeats: lockBeats }),
    };
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

  function bluesMidi(tonicPc, modeId, degree, bar, rng, prevMidi, role, reg) {
    var oct = bar < 2 ? reg.minOct : reg.maxOct;
    var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
    midi = applyBlueNotes(midi, degree, rng, role);
    midi = clampMidiToRegister(midi, reg);
    if (prevMidi != null && Math.abs(midi - prevMidi) > 8) {
      midi += midi > prevMidi ? -12 : 12;
      midi = clampMidiToRegister(midi, reg);
    }
    return midi;
  }

  function styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, role, targetHint, cellDegrees, reg) {
    if (isBebop(styleId) && role === "pass") {
      var targetMidi = scale.degreeToMidi(tonicPc, modeId, degree, octaveDrift(degree, bar, rng, reg));
      return bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint || targetMidi, reg);
    }
    if (isPopHook(styleId)) {
      return popHookMidi(tonicPc, modeId, popHookPickDegree(rng, cellDegrees || [degree]), bar, rng, prevMidi, reg);
    }
    if (isBlues(styleId)) {
      return bluesMidi(tonicPc, modeId, degree, bar, rng, prevMidi, role, reg);
    }
    return scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg);
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

  function popHookMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg) {
    var oct = reg.maxOct;
    var midi = scale.degreeToMidi(tonicPc, modeId, degree, oct);
    midi = clampMidiToRegister(midi, reg);
    if (prevMidi != null && Math.abs(midi - prevMidi) > 9) {
      midi += midi > prevMidi ? -12 : 12;
      midi = clampMidiToRegister(midi, reg);
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

  function bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint, reg) {
    if (targetHint != null && rng() > 0.25) {
      return bebopApproachMidi(targetHint, prevMidi, rng);
    }
    var midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg);
    if (rng() > 0.55) {
      midi = chromaticNeighbor(midi, rng() > 0.5 ? 1 : -1);
    }
    return midi;
  }

  function octaveDrift(degree, barIndex, rng, reg) {
    reg = reg || resolveRegister({});
    var span = reg.maxOct - reg.minOct;
    if (span <= 0) return reg.minOct;
    var bias = degree >= 5 ? 0.7 : (degree <= 2 ? 0.2 : 0.45);
    var oct = reg.minOct + Math.round(bias * span);
    if (rng() > 0.82) oct = Math.min(reg.maxOct, oct + 1);
    return Math.max(reg.minOct, Math.min(reg.maxOct, oct));
  }

  function beatInBar(beat) {
    return ((beat % 4) + 4) % 4;
  }

  function nextTimelineSegment(timeline, seg) {
    if (!timeline || !seg) return null;
    return timeline[seg.index + 1] || null;
  }

  function isDominantFamily(qualityId) {
    return qualityId === "7" || qualityId === "maj7" || qualityId === "m7" || qualityId === "m7b5";
  }

  function weightedPickPc(rng, entries) {
    var total = 0;
    entries.forEach(function (e) { total += e.w; });
    var roll = rng() * total;
    for (var i = 0; i < entries.length; i++) {
      roll -= entries[i].w;
      if (roll <= 0) return entries[i].pc;
    }
    return entries[entries.length - 1].pc;
  }

  function approachMidi(seg, nextSeg, prevMidi, rng, reg, styleId) {
    var entries = [];
    var third = seg.tones[1];
    var seventh = seg.tones[3];
    var nextRoot = nextSeg.tones[0];
    var nextThird = nextSeg.tones[1] || nextRoot;

    seg.tones.forEach(function (pc) {
      if (nextSeg.tones.indexOf(pc) !== -1) entries.push({ pc: pc, w: 4 });
    });
    if (third != null) entries.push({ pc: third, w: 3 });
    if (seventh != null && isDominantFamily(seg.chord.qualityId)) {
      entries.push({ pc: seventh, w: 5 });
      if (scale.clampPc(seventh + 1) === nextRoot || scale.clampPc(seventh - 1) === nextRoot) {
        entries.push({ pc: seventh, w: 2 });
      }
    }
    entries.push({ pc: seg.tones[0], w: 2 });

    if (styleId !== "pop-hook" && rng() > 0.28) {
      var halfStep = scale.clampPc(nextRoot + (rng() > 0.62 ? 1 : -1));
      return nearestMidi([halfStep], prevMidi, reg);
    }

    if (!entries.length) return nearestMidi(seg.tones, prevMidi, reg);
    var pc = weightedPickPc(rng, entries);
    var resolved = nearestMidi([pc], prevMidi, reg);
    if (Math.abs(resolved - nearestMidi([nextThird], prevMidi, reg)) <= 2 && rng() > 0.4) {
      return nearestMidi([nextThird], prevMidi, reg);
    }
    return resolved;
  }

  function chordTargetPhase(atBeat, seg, nextSeg) {
    if (atBeat == null || !seg) return "normal";
    if (Math.abs(atBeat - seg.startBeat) < 0.03) return "downbeat";
    if (nextSeg && atBeat >= seg.startBeat + seg.durationBeats - 1.02) return "approach";
    return "normal";
  }

  function nearestMidi(candidates, prevMidi, reg) {
    reg = reg || resolveRegister({});
    var center = ((reg.minOct + reg.maxOct) / 2 + 1) * 12;
    var best = candidates[0];
    var bestScore = Infinity;
    candidates.forEach(function (pc) {
      for (var oct = reg.minOct; oct <= reg.maxOct; oct++) {
        var midi = (oct + 1) * 12 + pc;
        var score = Math.abs(midi - (prevMidi || center)) + Math.abs(midi - center) * 0.12;
        if (score < bestScore) {
          bestScore = score;
          best = midi;
        }
      }
    });
    return best;
  }

  function chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, styleId, reg, ctx) {
    ctx = ctx || {};
    var atBeat = ctx.atBeat;
    var nextSeg = ctx.nextSeg != null ? ctx.nextSeg : nextTimelineSegment(ctx.timeline, seg);
    var phase = chordTargetPhase(atBeat, seg, nextSeg);

    if (phase === "approach" && nextSeg) {
      return approachMidi(seg, nextSeg, prevMidi, rng, reg, styleId);
    }

    var tones = seg.tones;
    var weighted = [];
    tones.forEach(function (pc, i) {
      var w = 1;
      if (phase === "downbeat") {
        if (i === 0) w = 6;
        else if (i === 1) w = 4;
        else if (i === 2) w = 2;
        else w = 1;
      } else if (i === 0) {
        w = isBebop(styleId) ? 2 : 3;
      } else if (i === 1) {
        w = isBebop(styleId) ? 4 : 2;
      } else if (i >= 3) {
        w = isBebop(styleId) ? 3 : 1;
      }
      for (var k = 0; k < w; k++) weighted.push(pc);
    });
    var pc = pick(rng, weighted);
    return nearestMidi([pc], prevMidi, reg);
  }

  function scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg) {
    var midi = degreeToNearestMidi(tonicPc, modeId, degree, prevMidi, reg);
    if (rng() > 0.92 && prevMidi != null) {
      var step = midi > prevMidi ? -1 : 1;
      var neighbor = clampMidiToRegister(midi + step, reg);
      if (Math.abs(neighbor - prevMidi) <= 2) midi = neighbor;
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
    var reg = resolveRegister(opts);

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
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, opts.styleId, reg, {
            atBeat: atBeat,
            timeline: timeline,
            nextSeg: nextTimelineSegment(timeline, seg),
          });
        } else {
          var degree = activeDegrees[pulseIdx % activeDegrees.length];
          if (rng() > 0.72) {
            degree = activeDegrees[Math.floor(rng() * activeDegrees.length)];
          }
          midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg);
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

  function generateFromChords(opts, pattern, rng, intensity, timeline) {
    timeline = timeline || chords.buildTimeline(opts.chords);
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
    var reg = resolveRegister(opts);

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
      } else if (rng() > (bebop ? 0.55 : popHook ? 0.68 : 0.78)) {
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
        var targetHint = seg ? nearestMidi(seg.tones, prevMidi, reg) : null;
        var nextSeg = seg ? nextTimelineSegment(timeline, seg) : null;
        var phase = seg ? chordTargetPhase(atBeat, seg, nextSeg) : "normal";
        var chordCtx = seg ? { atBeat: atBeat, timeline: timeline, nextSeg: nextSeg } : null;
        if (seg && (cell.role === "target" || phase === "downbeat" || phase === "approach")) {
          midi = chordTargetMidi(seg, rng, prevMidi, tonicPc, modeId, styleId, reg, chordCtx);
          if (blues && cell.role === "target") {
            midi = applyBlueNotes(midi, cell.degrees[0], rng, "target");
          }
        } else {
          var degree = popHook ? popHookPickDegree(rng, cell.degrees) : pickSmoothDegree(rng, cell.degrees, prevMidi, tonicPc, modeId, reg);
          if (seg && bebop) {
            midi = bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetHint, reg);
          } else if (seg && !popHook && !blues) {
            midi = scalePassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, reg);
            if (rng() > 0.55) {
              midi = nearestMidi(seg.tones, prevMidi, reg);
            }
          } else {
            midi = styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, cell.role, targetHint, cell.degrees, reg);
          }
        }

        notes.push({
          midi: midi,
          startBeat: atBeat,
          durationBeats: dur,
          velocity: Math.min(
            118,
            velocityForRole(phase === "downbeat" ? "target" : cell.role, rng, intensity, styleId) +
              (phase === "downbeat" ? 6 : beatInBar(atBeat) < 0.03 ? 4 : 0)
          ),
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
    var reg = resolveRegister(opts);
    var result;

    if (opts.euclidean && opts.euclidean.enabled) {
      var euclidTimeline = opts.chords && opts.chords.length ? chords.buildTimeline(opts.chords) : null;
      if (opts.chords && opts.chords.length) {
        result = generateEuclideanWithChords(opts, rng, intensity);
      } else {
        result = generateEuclidean(opts, rng, intensity);
      }
      return finalizePhrase(mergeMotifLock(result, opts.preserveNotes, opts.lockBeats), styleId, euclidTimeline);
    }

    if (opts.chords && opts.chords.length) {
      var chordTimeline = chords.buildTimeline(opts.chords);
      result = generateFromChords(opts, pattern, rng, intensity, chordTimeline);
      return finalizePhrase(mergeMotifLock(result, opts.preserveNotes, opts.lockBeats), styleId, chordTimeline);
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
      } else if (rng() > (bebop ? 0.55 : popHook ? 0.68 : 0.78)) {
        cells = cells.map(function (c) {
          return { degrees: c.degrees.map(function (d) { return (d + 1) % 7; }), dur: c.dur, role: c.role };
        });
      }

      var barBeat = 0;
      var ci = 0;
      var nextTargetDegree = cells[(ci + 2) % cells.length].degrees[0];
      while (barBeat < barLen && ci < cells.length) {
        var cell = cells[ci % cells.length];
        var degree;
        if (barBeat < 0.01 && cell.role === "target" && !popHook && !blues) {
          degree = 0;
        } else {
          degree = popHook ? popHookPickDegree(rng, cell.degrees) : pickSmoothDegree(rng, cell.degrees, prevMidi, tonicPc, modeId, reg);
        }
        var midi;
        if (bebop && cell.role === "pass") {
          var targetMidi = degreeToNearestMidi(tonicPc, modeId, nextTargetDegree, prevMidi, reg);
          midi = bebopPassMidi(tonicPc, modeId, degree, bar, rng, prevMidi, targetMidi, reg);
        } else if (popHook || blues) {
          midi = styleMidi(styleId, tonicPc, modeId, degree, bar, rng, prevMidi, cell.role, null, cell.degrees, reg);
        } else {
          midi = degreeToNearestMidi(tonicPc, modeId, degree, prevMidi, reg);
          if (rng() > 0.9 && cell.role === "pass" && prevMidi != null) {
            var chromatic = clampMidiToRegister(midi + (midi > prevMidi ? -1 : 1), reg);
            if (Math.abs(chromatic - prevMidi) <= 2) midi = chromatic;
          }
        }

        var dur = cell.dur;
        if (bebop && cell.role === "pass" && rng() > 0.5) dur = Math.max(0.25, dur * 0.85);
        if (barBeat + dur > barLen) dur = barLen - barBeat;

        notes.push({
          midi: midi,
          startBeat: beat + barBeat,
          durationBeats: dur,
          velocity: Math.min(
            118,
            velocityForRole(cell.role, rng, intensity, styleId) + (barBeat < 0.01 ? 6 : 0)
          ),
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

    result = {
      notes: notes,
      meta: {
        tonicPc: tonicPc,
        modeId: modeId,
        styleId: styleId,
        bars: bars,
        beatsPerBar: barLen,
        keyLabel: scale.keyLabel(tonicPc, modeId),
        chordAware: false,
        registerMin: reg.minOct,
        registerMax: reg.maxOct,
      },
    };
    return finalizePhrase(mergeMotifLock(result, opts.preserveNotes, opts.lockBeats), styleId);
  }

  function mutatePhrase(result, mutateMode, seed, lockBeats) {
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
        if (lockBeats && n.startBeat < lockBeats) return;
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
        if (lockBeats && n.startBeat < lockBeats) return;
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

    return finalizePhrase(
      {
        notes: notes,
        meta: Object.assign({}, result.meta, { mutated: mutateMode }),
      },
      result.meta.styleId
    );
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
    mergeMotifLock: mergeMotifLock,
    resolveRegister: resolveRegister,
    polishPhrase: polishPhrase,
    degreeToNearestMidi: degreeToNearestMidi,
    buildElasticContext: buildElasticContext,
  };

  global.ElasticPhraseEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
