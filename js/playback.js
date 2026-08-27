(function (global) {
  "use strict";

  var stopTimer = null;
  var ctx = null;
  var playing = false;

  function ensureContext() {
    if (!ctx || ctx.state === "closed") {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx.resume().then(function () { return ctx; });
  }

  function stop() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    playing = false;
  }

  function playPhrase(notes, bpm, callbacks) {
    stop();
    if (!notes || !notes.length) return Promise.resolve(0);
    callbacks = callbacks || {};

    return ensureContext().then(function (audio) {
      var beatSec = 60 / Math.max(40, Math.min(240, bpm || 100));
      var lead = 0.1;
      var endBeat = 0;
      var ready = window.ElasticSound
        ? window.ElasticSound.ensureReady(audio)
        : Promise.resolve();

      return ready.then(function () {
        playing = true;
        var schedules = notes.map(function (n) {
          var start = audio.currentTime + lead + n.startBeat * beatSec;
          var dur = Math.max(0.05, n.durationBeats * beatSec * 0.92);
          var vel = (n.velocity || 90) / 127;
          endBeat = Math.max(endBeat, n.startBeat + n.durationBeats);
          if (window.ElasticSound) {
            return window.ElasticSound.playMelodyNote(audio, n.midi, start, dur, vel);
          }
          return Promise.resolve();
        });

        return Promise.all(schedules).then(function () {
          var totalMs = (lead + endBeat * beatSec + 0.3) * 1000;
          stopTimer = setTimeout(function () {
            stopTimer = null;
            playing = false;
            if (callbacks.onEnd) callbacks.onEnd();
          }, totalMs);
          return totalMs;
        });
      });
    });
  }

  var api = {
    playPhrase: playPhrase,
    stop: stop,
    ensureContext: ensureContext,
    isPlaying: function () { return playing; },
  };

  global.ElasticPlayback = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
