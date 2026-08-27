"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var euclid = require("../js/euclid.js");

global.ElasticEuclid = euclid;
var pianoRoll = require("../js/piano-roll.js");

test("stepIndexAtBeat maps beat to euclidean step", function () {
  assert.equal(pianoRoll.stepIndexAtBeat(0, 4, 8), 0);
  assert.equal(pianoRoll.stepIndexAtBeat(2, 4, 8), 4);
});

test("getEuclidPatterns returns rhythm and scale arrays", function () {
  var p = pianoRoll.getEuclidPatterns({ pulses: 3, steps: 8, rotation: 0, scalePulses: 4 });
  assert.equal(p.rhythm.length, 8);
  assert.equal(p.scale.length, 7);
  assert.equal(euclid.pulseCount(p.rhythm), 3);
});
