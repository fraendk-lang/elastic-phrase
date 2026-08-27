"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");

var scale = require("../js/scale.js");
global.ElasticScale = scale;
var chords = require("../js/chords.js");

test("parseProgressionText reads space-separated chords", function () {
  var res = chords.parseProgressionText("Am7 Dm7 Em7 G#7");
  assert.equal(res.ok, true);
  assert.equal(res.chords.length, 4);
  assert.equal(res.chords[3].rootPc, 8);
  assert.equal(res.chords[3].qualityId, "7");
});

test("parseProgressionText reads pipe-separated chords", function () {
  var res = chords.parseProgressionText("Am7 | D7 | Gmaj7 | C");
  assert.equal(res.ok, true);
  assert.equal(res.chords.length, 4);
  assert.equal(res.chords[0].qualityId, "m7");
  assert.equal(res.chords[1].qualityId, "7");
  assert.equal(res.chords[2].qualityId, "maj7");
});

test("parseChordSymbol supports slash bass", function () {
  var c = chords.parseChordSymbol("G/B");
  assert.ok(c);
  assert.equal(c.rootPc, 7);
  assert.equal(c.bassPc, 11);
});

test("parseProgressionText reports unknown symbols", function () {
  var res = chords.parseProgressionText("Am7 | XYZ");
  assert.equal(res.ok, false);
  assert.equal(res.errors.length, 1);
  assert.equal(res.errors[0].token, "XYZ");
});

test("progressionTextFromChords roundtrip labels", function () {
  var res = chords.parseProgressionText("Dm7 | G7 | Cmaj7");
  var text = chords.progressionTextFromChords(res.chords);
  assert.ok(text.indexOf("Dm7") !== -1);
  assert.ok(text.indexOf("|") !== -1);
});
