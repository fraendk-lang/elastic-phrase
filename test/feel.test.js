"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var feel = require("../js/feel.js");

test("applyFeel shifts offbeats with swing", function () {
  var notes = [
    { midi: 60, startBeat: 0, durationBeats: 0.5, velocity: 90 },
    { midi: 62, startBeat: 0.5, durationBeats: 0.5, velocity: 80 },
  ];
  var straight = feel.applyFeel(notes, { swing: 0, humanize: 0, seed: 1 });
  var swung = feel.applyFeel(notes, { swing: 80, humanize: 0, seed: 1 });
  assert.equal(straight[1].startBeat, 0.5);
  assert.ok(swung[1].startBeat > 0.5);
});

test("applyFeel varies velocity with humanize", function () {
  var notes = [{ midi: 60, startBeat: 0, durationBeats: 1, velocity: 90 }];
  var out = feel.applyFeel(notes, { swing: 0, humanize: 100, seed: 42 });
  assert.notEqual(out[0].velocity, 90);
});
