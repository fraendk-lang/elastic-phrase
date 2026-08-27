#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  INSTRUMENT_NAMES,
  instrumentFileName,
  PRIMARY_PACK,
  FORMAT,
} = require("../js/soundfont-config.js");

const DIR = path.join(__dirname, "..", "assets", "soundfonts", PRIMARY_PACK);
let ok = true;

for (const name of INSTRUMENT_NAMES) {
  const file = path.join(DIR, instrumentFileName(name, FORMAT));
  if (!fs.existsSync(file)) {
    console.error("Missing:", file);
    ok = false;
    continue;
  }
  if (fs.statSync(file).size < 50000) {
    console.error("Too small:", file);
    ok = false;
  }
}

if (!ok) {
  console.error("\nRun: npm run fetch:soundfonts");
  process.exit(1);
}

console.log("Soundfont assets OK (" + INSTRUMENT_NAMES.length + " instruments)");
