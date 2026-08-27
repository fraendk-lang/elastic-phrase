#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  INSTRUMENT_NAMES,
  cdnInstrumentUrl,
  instrumentFileName,
  PRIMARY_PACK,
  FORMAT,
} = require("../js/soundfont-config.js");

const OUT_DIR = path.join(__dirname, "..", "assets", "soundfonts", PRIMARY_PACK);

async function download(name) {
  const url = cdnInstrumentUrl(name, PRIMARY_PACK, FORMAT);
  const dest = path.join(OUT_DIR, instrumentFileName(name, FORMAT));
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50000) throw new Error("Suspiciously small file for " + name);
  fs.writeFileSync(dest, buf);
  return { name, bytes: buf.length, dest };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const name of INSTRUMENT_NAMES) {
    process.stdout.write("Fetching " + name + "… ");
    const r = await download(name);
    console.log((r.bytes / 1024 / 1024).toFixed(2) + " MB");
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
