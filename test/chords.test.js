"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var scale = require("../js/scale.js");
var chords = require("../js/chords.js");

test("parseComposerHash reads compact progression", function () {
  var payload = {
    b: 110,
    k: { t: 2, m: "dorian" },
    p: [
      { r: 0, q: "m", b: 0 },
      { r: 7, q: "7", b: 7, t: 4 },
    ],
  };
  var hash = "#c=" + encodeURIComponent(JSON.stringify(payload));
  var data = chords.parseComposerHash(hash);
  assert.equal(data.bpm, 110);
  assert.equal(data.chords.length, 2);
  assert.equal(data.key.tonicPc, 2);
  assert.equal(data.key.modeId, "dorian");
});

test("chordAtBeat maps beats to active chord", function () {
  var timeline = chords.buildTimeline([
    { rootPc: 0, qualityId: "m", bassPc: 0, beats: 4 },
    { rootPc: 7, qualityId: "7", bassPc: 7, beats: 4 },
  ]);
  assert.equal(chords.chordAtBeat(timeline, 0).chord.rootPc, 0);
  assert.equal(chords.chordAtBeat(timeline, 4).chord.rootPc, 7);
});
