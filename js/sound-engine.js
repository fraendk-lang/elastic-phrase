import Soundfont from "https://esm.sh/soundfont-player@0.12.0";

const MELODY = { name: "flute", program: 73, duration: 2.4 };

let ctxRef = null;
let melodyInst = null;
let melodyLoading = null;
let melodySource = null;
let usingFallback = false;

function setStatus(text) {
  var el = document.getElementById("soundLoadStatus");
  if (el) el.textContent = text || "";
}

function createFallback(ctx) {
  return {
    play: function (midiNote, startTime, opts) {
      opts = opts || {};
      var dest = opts.destination || ctx.destination;
      var dur = Math.max(0.08, opts.duration || MELODY.duration);
      var gainVal = Math.max(0.04, opts.gain || 0.5);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2800;
      osc.type = "sine";
      osc.frequency.value = 440 * Math.pow(2, (midiNote - 69) / 12);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.04);
    },
  };
}

async function loadMelody(ctx) {
  var cfg = window.ElasticSoundfontConfig;
  var attempts = cfg ? cfg.instrumentLoadAttempts(MELODY.name) : [];
  var lastErr = null;
  for (var i = 0; i < attempts.length; i++) {
    try {
      var inst = await Soundfont.instrument(ctx, attempts[i].url);
      melodySource = attempts[i].label;
      usingFallback = false;
      setStatus(melodySource === "MusyngKite" ? "Flöte (MusyngKite)" : "Flöte (FluidR3)");
      return inst;
    } catch (err) {
      lastErr = err;
    }
  }
  usingFallback = true;
  melodySource = "synth-fallback";
  setStatus("Offline-Synth — Soundfont nicht verfügbar");
  return createFallback(ctx);
}

export async function ensureMelody(ctx) {
  if (melodyInst && ctxRef === ctx) return melodyInst;
  if (melodyLoading && ctxRef === ctx) return melodyLoading;
  ctxRef = ctx;
  setStatus("Flöte wird geladen …");
  melodyLoading = loadMelody(ctx).then(function (inst) {
    melodyInst = inst;
    melodyLoading = null;
    return inst;
  });
  return melodyLoading;
}

export function playMelodyNote(ctx, destination, midiNote, startTime, durationSec, velocityMul) {
  var gain = Math.max(0.04, (velocityMul || 0.6) * 0.55);
  function schedule(inst) {
    inst.play(midiNote, startTime, {
      duration: Math.max(0.08, durationSec),
      gain: gain,
      destination: destination,
    });
  }
  if (melodyInst && ctxRef === ctx) {
    schedule(melodyInst);
    return;
  }
  ensureMelody(ctx).then(schedule).catch(function () {});
}

window.ElasticSound = {
  ensureMelody: ensureMelody,
  playMelodyNote: playMelodyNote,
  getSoundSource: function () { return usingFallback ? "synth-fallback" : (melodySource || "unknown"); },
};
