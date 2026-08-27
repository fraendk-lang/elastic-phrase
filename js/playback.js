(function (global) {
  "use strict";

  var activeNodes = [];
  var stopTimer = null;
  var ctx = null;

  function ensureContext() {
    if (!ctx || ctx.state === "closed") {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function scheduleNote(audio, midi, startTime, durationSec, velocity) {
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(midi);
    var peak = 0.08 + (velocity / 127) * 0.18;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
    activeNodes.push(osc, gain);
  }

  function stop() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    activeNodes.forEach(function (node) {
      try {
        node.stop && node.stop(0);
        node.disconnect && node.disconnect();
      } catch (e) {
        /* ignore */
      }
    });
    activeNodes = [];
  }

  function playPhrase(notes, bpm, callbacks) {
    stop();
    if (!notes || !notes.length) return 0;
    callbacks = callbacks || {};
    var audio = ensureContext();
    var beatSec = 60 / Math.max(40, Math.min(240, bpm || 100));
    var lead = 0.08;
    var endBeat = 0;

    notes.forEach(function (n) {
      var start = audio.currentTime + lead + n.startBeat * beatSec;
      var dur = Math.max(0.05, n.durationBeats * beatSec * 0.9);
      scheduleNote(audio, n.midi, start, dur, n.velocity || 90);
      endBeat = Math.max(endBeat, n.startBeat + n.durationBeats);
    });

    var totalMs = (lead + endBeat * beatSec + 0.2) * 1000;
    stopTimer = setTimeout(function () {
      stopTimer = null;
      if (callbacks.onEnd) callbacks.onEnd();
    }, totalMs);
    return totalMs;
  }

  var api = {
    playPhrase: playPhrase,
    stop: stop,
    ensureContext: ensureContext,
  };

  global.ElasticPlayback = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
