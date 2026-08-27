"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var scale = require("../js/scale.js");
global.ElasticScale = scale;
var chords = require("../js/chords.js");
global.ElasticChords = chords;
var handoff = require("../js/handoff.js");

test("serializeShareState and applySharePayload roundtrip", function () {
  var state = {
    tonicPc: 2,
    modeId: "mixolydian",
    styleId: "bebop",
    bars: 6,
    intensity: 0.7,
    bpm: 132,
    seed: 4242,
    soundPreset: "rhodes",
    reverb: 0.4,
    euclidean: {
      enabled: true,
      pulses: 7,
      steps: 12,
      rotation: 2,
      scalePulses: 5,
      scaleRotation: 1,
    },
    chords: [{ rootPc: 0, qualityId: "m7", bassPc: 0, beats: 4 }],
    motifLock: true,
    lockBars: 3,
  };

  var payload = handoff.serializeShareState(state);
  assert.equal(payload.v, 1);
  assert.equal(payload.s, "bebop");
  assert.equal(payload.lm, 1);
  assert.equal(payload.lb, 3);
  assert.ok(payload.e);

  var restored = handoff.applySharePayload(payload);
  assert.ok(restored);
  assert.equal(restored.styleId, "bebop");
  assert.equal(restored.seed, 4242);
  assert.equal(restored.motifLock, true);
  assert.equal(restored.lockBars, 3);
  assert.equal(restored.euclidean.pulses, 7);
  assert.equal(restored.chords.length, 1);
});

test("buildShareUrl encodes hash", function () {
  var url = handoff.buildShareUrl(
    { tonicPc: 0, modeId: "dorian", styleId: "modal-jazz", bars: 4, intensity: 0.5, bpm: 100, seed: 1 },
    "https://elastic-phrase.vercel.app"
  );
  assert.ok(url.includes("#s="));
  var hash = url.split("#")[1];
  var payload = handoff.parseShareHash("#" + hash);
  assert.equal(payload.sd, 1);
});
