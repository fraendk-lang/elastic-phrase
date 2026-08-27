"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var euclid = require("../js/euclid.js");

test("E(3,8) has three pulses", function () {
  var p = euclid.euclidean(3, 8, 0);
  assert.equal(p.length, 8);
  assert.equal(euclid.pulseCount(p), 3);
});

test("euclidean rotates pattern", function () {
  var a = euclid.euclidean(5, 8, 0);
  var b = euclid.euclidean(5, 8, 1);
  assert.notDeepEqual(a, b);
  assert.equal(euclid.pulseCount(a), euclid.pulseCount(b));
});

test("patternLabel renders dots", function () {
  assert.match(euclid.patternLabel([1, 0, 1, 0]), /●/);
});
