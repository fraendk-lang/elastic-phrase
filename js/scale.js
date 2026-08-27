(function (global) {
  "use strict";

  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  var MODE_DEFS = {
    major: { label: "Dur", intervals: [0, 2, 4, 5, 7, 9, 11] },
    minor: { label: "Nat. Moll", intervals: [0, 2, 3, 5, 7, 8, 10] },
    dorian: { label: "Dorisch", intervals: [0, 2, 3, 5, 7, 9, 10] },
    phrygian: { label: "Phrygisch", intervals: [0, 1, 3, 5, 7, 8, 10] },
    lydian: { label: "Lydisch", intervals: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian: { label: "Mixolydisch", intervals: [0, 2, 4, 5, 7, 9, 10] },
    locrian: { label: "Lokrisch", intervals: [0, 1, 3, 5, 6, 8, 10] },
  };

  function clampPc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function noteName(pc) {
    return NOTE_NAMES[clampPc(pc)];
  }

  function scalePcs(tonicPc, modeId) {
    var mode = MODE_DEFS[modeId] || MODE_DEFS.dorian;
    return mode.intervals.map(function (iv) {
      return clampPc(tonicPc + iv);
    });
  }

  /** Degree 0–6 → MIDI in register around middle C */
  function degreeToMidi(tonicPc, modeId, degree, octave) {
    var mode = MODE_DEFS[modeId] || MODE_DEFS.dorian;
    var deg = ((degree % 7) + 7) % 7;
    var oct = octave == null ? 5 : octave;
    var iv = mode.intervals[deg];
    var pc = clampPc(tonicPc + iv);
    return (oct + 1) * 12 + pc;
  }

  function keyLabel(tonicPc, modeId) {
    var mode = MODE_DEFS[modeId] || MODE_DEFS.dorian;
    return noteName(tonicPc) + " " + mode.label;
  }

  function isInScale(midi, tonicPc, modeId) {
    var pc = clampPc(midi);
    return scalePcs(tonicPc, modeId).indexOf(pc) !== -1;
  }

  var api = {
    NOTE_NAMES: NOTE_NAMES,
    MODE_DEFS: MODE_DEFS,
    clampPc: clampPc,
    noteName: noteName,
    scalePcs: scalePcs,
    degreeToMidi: degreeToMidi,
    keyLabel: keyLabel,
    isInScale: isInScale,
  };

  global.ElasticScale = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
