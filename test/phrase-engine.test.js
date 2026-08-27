"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var scale = require("../js/scale.js");
var euclid = require("../js/euclid.js");
global.ElasticEuclid = euclid;
var chords = require("../js/chords.js");
var engine = require("../js/phrase-engine.js");
var midi = require("../js/midi-export.js");
var handoff = require("../js/handoff.js");

test("scale degreeToMidi stays in mode", function () {
  var pcs = scale.scalePcs(0, "dorian");
  assert.equal(pcs.length, 7);
  var m = scale.degreeToMidi(0, "dorian", 0, 5);
  assert.equal(m % 12, 0);
});

test("generatePhrase is deterministic with seed", function () {
  var a = engine.generatePhrase({ tonicPc: 2, modeId: "dorian", seed: 42, bars: 2 });
  var b = engine.generatePhrase({ tonicPc: 2, modeId: "dorian", seed: 42, bars: 2 });
  assert.equal(a.notes.length, b.notes.length);
  assert.deepEqual(
    a.notes.map(function (n) { return n.midi; }),
    b.notes.map(function (n) { return n.midi; })
  );
});

test("generatePhrase produces monophonic timeline", function () {
  var res = engine.generatePhrase({ seed: 1, bars: 4 });
  assert.ok(res.notes.length > 4);
  res.notes.forEach(function (n) {
    assert.ok(n.durationBeats > 0);
    assert.ok(n.velocity >= 48 && n.velocity <= 127);
  });
  for (var i = 1; i < res.notes.length; i++) {
    var prev = res.notes[i - 1];
    var cur = res.notes[i];
    assert.ok(prev.startBeat + prev.durationBeats <= cur.startBeat + 0.001);
  }
});

test("polishPhrase removes overlaps and shortens passing notes", function () {
  var raw = [
    { midi: 60, startBeat: 0, durationBeats: 1, velocity: 90, role: "target" },
    { midi: 62, startBeat: 0.5, durationBeats: 0.8, velocity: 80, role: "pass" },
  ];
  var out = engine.polishPhrase(raw, { styleId: "modal-jazz" });
  assert.ok(out[0].durationBeats <= 0.5);
  assert.ok(out[1].durationBeats < 0.8);
});

test("degreeToNearestMidi prefers small intervals", function () {
  var near = engine.degreeToNearestMidi(0, "dorian", 2, 62, { minOct: 4, maxOct: 5 });
  assert.ok(Math.abs(near - 62) <= 2);
});

test("phraseToMidiBytes returns valid header", function () {
  var res = engine.generatePhrase({ seed: 99, bars: 2 });
  var bytes = midi.phraseToMidiBytes(res.notes, 120);
  assert.equal(bytes[0], 0x4d);
  assert.equal(bytes[1], 0x54);
  assert.equal(bytes[2], 0x68);
  assert.equal(bytes[3], 0x64);
  assert.ok(bytes.length > 32);
});

test("buildElasticContext roundtrip shape", function () {
  var res = engine.generatePhrase({ seed: 7, bars: 2 });
  var ctx = engine.buildElasticContext(res, 100);
  assert.equal(ctx.app, "elastic-phrase");
  assert.equal(ctx.phrase.length, res.notes.length);
});

test("chord-aware phrase marks meta and uses chord tones", function () {
  var res = engine.generatePhrase({
    seed: 11,
    tonicPc: 0,
    modeId: "dorian",
    chords: [
      { rootPc: 0, qualityId: "m", bassPc: 0, beats: 4 },
      { rootPc: 7, qualityId: "7", bassPc: 7, beats: 4 },
    ],
  });
  assert.equal(res.meta.chordAware, true);
  assert.ok(res.notes.length > 4);
  var targets = res.notes.filter(function (n) { return n.role === "target"; });
  assert.ok(targets.length > 0);
});

test("importFromLocation parses composer query", function () {
  var payload = { b: 100, p: [{ r: 0, q: "m", b: 0 }] };
  var loc = {
    search: "?from=composer&bpm=100",
    hash: "#c=" + encodeURIComponent(JSON.stringify(payload)),
  };
  var data = handoff.importFromLocation(loc);
  assert.ok(data);
  assert.equal(data.chords.length, 1);
});

test("bebop style produces denser eighth-note lines", function () {
  var modal = engine.generatePhrase({ seed: 21, bars: 2, styleId: "modal-jazz" });
  var bebop = engine.generatePhrase({ seed: 21, bars: 2, styleId: "bebop" });
  assert.equal(bebop.meta.styleId, "bebop");
  assert.ok(bebop.notes.length >= modal.notes.length);
  var chromatic = bebop.notes.filter(function (n, i) {
    if (i === 0) return false;
    var prev = bebop.notes[i - 1].midi;
    return Math.abs(n.midi - prev) === 1;
  });
  assert.ok(chromatic.length > 0);
});

test("bebop chord-aware favors chord tones on targets", function () {
  var res = engine.generatePhrase({
    seed: 33,
    styleId: "bebop",
    chords: [
      { rootPc: 0, qualityId: "m7", bassPc: 0, beats: 4 },
      { rootPc: 7, qualityId: "7", bassPc: 7, beats: 4 },
    ],
  });
  assert.equal(res.meta.chordAware, true);
  assert.ok(res.notes.length > 8);
});

test("blues style applies shuffle cells", function () {
  var res = engine.generatePhrase({ seed: 55, bars: 2, styleId: "blues", tonicPc: 0, modeId: "mixolydian" });
  assert.equal(res.meta.styleId, "blues");
  assert.ok(res.notes.length >= 8);
  assert.ok(res.notes.some(function (n) { return n.durationBeats >= 0.55 && n.durationBeats <= 0.85; }));
  assert.ok(res.notes.some(function (n) { return n.durationBeats >= 0.12 && n.durationBeats <= 0.32; }));
});

test("mutatePhrase changes rhythm without full regen", function () {
  var base = engine.generatePhrase({ seed: 12, bars: 2, styleId: "modal-jazz" });
  var rhythm = engine.mutatePhrase(base, "rhythm", 99);
  assert.equal(rhythm.meta.mutated, "rhythm");
  assert.equal(rhythm.notes.length, base.notes.length);
  var moved = rhythm.notes.some(function (n, i) {
    return Math.abs(n.startBeat - base.notes[i].startBeat) > 0.001;
  });
  assert.ok(moved);
});

test("mutatePhrase changes melody steps", function () {
  var base = engine.generatePhrase({ seed: 18, bars: 2, styleId: "pop-hook" });
  var melody = engine.mutatePhrase(base, "melody", 101);
  var changed = melody.notes.some(function (n, i) {
    return n.midi !== base.notes[i].midi;
  });
  assert.ok(changed);
});

test("mutatePhrase respects motif lock beats", function () {
  var base = engine.generatePhrase({ seed: 12, bars: 4, styleId: "modal-jazz" });
  var locked = engine.mutatePhrase(base, "melody", 99, 8);
  base.notes.forEach(function (orig) {
    if (orig.startBeat >= 8) return;
    var next = locked.notes.find(function (n) {
      return Math.abs(n.startBeat - orig.startBeat) < 0.001;
    });
    assert.ok(next);
    assert.equal(next.midi, orig.midi);
  });
});

test("mergeMotifLock preserves opening bars", function () {
  var a = engine.generatePhrase({ seed: 1, bars: 4, styleId: "modal-jazz" });
  var b = engine.generatePhrase({ seed: 2, bars: 4, styleId: "modal-jazz" });
  var merged = engine.mergeMotifLock(b, a.notes, 8);
  assert.equal(merged.meta.motifLockBeats, 8);
  assert.equal(merged.notes[0].midi, a.notes[0].midi);
  assert.ok(merged.notes.some(function (n) { return n.startBeat >= 8; }));
});

test("register range limits generated midi", function () {
  var low = engine.generatePhrase({ seed: 5, bars: 2, registerMin: 3, registerMax: 3 });
  low.notes.forEach(function (n) {
    assert.ok(Math.floor(n.midi / 12) - 1 <= 3);
  });
});

test("pop hook style uses pentatonic motion", function () {
  var res = engine.generatePhrase({ seed: 44, bars: 4, styleId: "pop-hook" });
  assert.equal(res.meta.styleId, "pop-hook");
  assert.ok(res.notes.length >= 8);
});

test("euclidean phrase generates rhythm hits", function () {
  var res = engine.generatePhrase({
    seed: 3,
    bars: 2,
    euclidean: { enabled: true, pulses: 5, steps: 8, rotation: 0, scalePulses: 4 },
  });
  assert.equal(res.meta.euclidean.pulses, 5);
  assert.ok(res.notes.length >= 5);
});
