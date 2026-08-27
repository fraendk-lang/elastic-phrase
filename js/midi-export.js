(function (global) {
  "use strict";

  var TPQ = 480;

  function varLen(value) {
    var buffer = value & 0x7f;
    var out = [];
    value >>= 7;
    while (value > 0) {
      out.unshift(buffer | 0x80);
      buffer = value & 0x7f;
      value >>= 7;
    }
    out.unshift(buffer);
    return out;
  }

  function pushStr(bytes, str) {
    for (var i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  }

  function pushU32(bytes, n) {
    bytes.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }

  function pushU16(bytes, n) {
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }

  /**
   * @param {Array<{startBeat:number,durationBeats:number,midi:number,velocity:number}>} notes
   * @param {number} bpm
   */
  function phraseToMidiBytes(notes, bpm) {
    var tempo = Math.round(60000000 / Math.max(40, Math.min(240, bpm || 100)));
    var events = [];

    events.push({ tick: 0, data: [0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff] });
    events.push({ tick: 0, data: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });

    (notes || []).forEach(function (n) {
      var onTick = Math.round(n.startBeat * TPQ);
      var offTick = Math.round((n.startBeat + n.durationBeats) * TPQ);
      var vel = Math.max(1, Math.min(127, Math.round(n.velocity || 90)));
      events.push({ tick: onTick, data: [0x90, n.midi & 0x7f, vel] });
      events.push({ tick: offTick, data: [0x80, n.midi & 0x7f, 0] });
    });

    events.sort(function (a, b) {
      if (a.tick !== b.tick) return a.tick - b.tick;
      return (a.data[0] & 0xf0) === 0x80 ? 1 : -1;
    });

    var track = [];
    var lastTick = 0;
    events.forEach(function (ev) {
      var delta = ev.tick - lastTick;
      varLen(delta).forEach(function (b) {
        track.push(b);
      });
      ev.data.forEach(function (b) {
        track.push(b);
      });
      lastTick = ev.tick;
    });
    varLen(0).forEach(function (b) {
      track.push(b);
    });
    track.push(0xff, 0x2f, 0x00);

    var header = [];
    pushStr(header, "MThd");
    pushU32(header, 6);
    pushU16(header, 0);
    pushU16(header, 1);
    pushU16(header, TPQ);

    var trackChunk = [];
    pushStr(trackChunk, "MTrk");
    pushU32(trackChunk, track.length);
    track.forEach(function (b) {
      trackChunk.push(b);
    });

    return new Uint8Array(header.concat(trackChunk));
  }

  function downloadMidi(notes, bpm, filename) {
    var bytes = phraseToMidiBytes(notes, bpm);
    var blob = new Blob([bytes], { type: "audio/midi" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "elastic-phrase.mid";
    a.click();
    URL.revokeObjectURL(url);
  }

  var api = {
    TPQ: TPQ,
    phraseToMidiBytes: phraseToMidiBytes,
    downloadMidi: downloadMidi,
  };

  global.ElasticMidi = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
