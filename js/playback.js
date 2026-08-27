(function (global) {
  "use strict";

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

  function scheduleSynthNote(audio, midi, startTime, durationSec, velocity) {
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    var filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2800;
    osc.type = "sine";
    osc.frequency.value = midiToFreq(midi);
    var peak = 0.06 + (velocity / 127) * 0.16;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.04);
  }

  function stop() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function playPhrase(notes, bpm, callbacks) {
    stop();
    if (!notes || !notes.length) return 0;
    callbacks = callbacks || {};
    var audio = ensureContext();
    var beatSec = 60 / Math.max(40, Math.min(240, bpm || 100));
    var lead = 0.08;
    var endBeat = 0;
    var useSoundfont = window.ElasticSound && window.ElasticSound.playMelodyNote;

    if (useSoundfont) {
      window.ElasticSound.ensureMelody(audio);
    }

    notes.forEach(function (n) {
      var start = audio.currentTime + lead + n.startBeat * beatSec;
      var dur = Math.max(0.05, n.durationBeats * beatSec * 0.9);
      var vel = (n.velocity || 90) / 127;
      if (useSoundfont) {
        window.ElasticSound.playMelodyNote(audio, audio.destination, n.midi, start, dur, vel);
      } else {
        scheduleSynthNote(audio, n.midi, start, dur, n.velocity || 90);
      }
      endBeat = Math.max(endBeat, n.startBeat + n.durationBeats);
    });

    var totalMs = (lead + endBeat * beatSec + 0.25) * 1000;
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
