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

test("euclidean phrase generates rhythm hits", function () {
  var res = engine.generatePhrase({
    seed: 3,
    bars: 2,
    euclidean: { enabled: true, pulses: 5, steps: 8, rotation: 0, scalePulses: 4 },
  });
  assert.equal(res.meta.euclidean.pulses, 5);
  assert.ok(res.notes.length >= 5);
});
