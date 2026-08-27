"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  INSTRUMENT_NAMES,
  instrumentLoadAttempts,
  localInstrumentUrl,
  PRIMARY_PACK,
} = require("../js/soundfont-config.js");

test("lists phrase melody instruments", () => {
  assert.ok(INSTRUMENT_NAMES.includes("flute"));
  assert.ok(INSTRUMENT_NAMES.includes("acoustic_grand_piano"));
  assert.equal(INSTRUMENT_NAMES.length, 5);
});

test("load attempts prefer local Musyng then CDN", () => {
  const attempts = instrumentLoadAttempts("flute");
  assert.equal(attempts.length, 3);
  assert.match(attempts[0].url, /^\/assets\/soundfonts\/MusyngKite\//);
  assert.match(attempts[1].url, /gleitz\.github\.io.*MusyngKite/);
});

test("local instrument path uses mp3 bundle", () => {
  assert.equal(
    localInstrumentUrl("flute"),
    "/assets/soundfonts/MusyngKite/flute-mp3.js"
  );
  assert.equal(PRIMARY_PACK, "MusyngKite");
});
