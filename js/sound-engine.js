import Soundfont from "https://esm.sh/soundfont-player@0.12.0";

const PRESETS = {
  flute: { name: "flute", label: "Flöte", duration: 2.6 },
  grand: { name: "acoustic_grand_piano", label: "Konzertflügel", duration: 3.2 },
  upright: { name: "bright_acoustic_piano", label: "Klavier", duration: 2.8 },
  rhodes: { name: "electric_piano_1", label: "Rhodes", duration: 2.6 },
  pad: { name: "pad_2_warm", label: "Pad", duration: 3.6 },
};

let currentPreset = "flute";
let reverbMix = 0.28;
let ctxRef = null;
let instrument = null;
let instrumentSource = null;
let loadingPromise = null;
let usingFallback = false;
let output = null;

function presetSpec(id) {
  return PRESETS[id] || PRESETS.flute;
}

function setStatus(text) {
  var el = document.getElementById("soundLoadStatus");
  if (el) el.textContent = text || "";
}

function statusForSource(source) {
  if (!source) return "";
  if (source.indexOf("local") === 0) return presetSpec(currentPreset).label + " · MusyngKite (lokal)";
  if (source === "MusyngKite") return presetSpec(currentPreset).label + " · MusyngKite (CDN)";
  if (source === "FluidR3_GM") return presetSpec(currentPreset).label + " · FluidR3 Fallback";
  return presetSpec(currentPreset).label + " · Offline-Synth";
}

function createFallbackInstrument(ctx, presetId) {
  var spec = presetSpec(presetId);
  return {
    play: function (midiNote, startTime, opts) {
      opts = opts || {};
      var dest = opts.destination || ctx.destination;
      var dur = Math.max(0.08, opts.duration || spec.duration);
      var gainVal = Math.max(0.04, opts.gain || 0.5);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = presetId === "pad" ? 1800 : 3200;
      osc.type = presetId === "rhodes" ? "triangle" : "sine";
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

function buildImpulse(ctx, seconds) {
  var rate = ctx.sampleRate;
  var len = Math.floor(rate * seconds);
  var impulse = ctx.createBuffer(2, len, rate);
  for (var ch = 0; ch < 2; ch++) {
    var data = impulse.getChannelData(ch);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
  }
  return impulse;
}

function ensureOutput(ctx) {
  if (output && ctxRef === ctx) return output;

  var input = ctx.createGain();
  input.gain.value = 1;
  var dry = ctx.createGain();
  var wet = ctx.createGain();
  var convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx, 1.6);
  var limiter = ctx.createGain();
  limiter.gain.value = 0.92;
  limiter.connect(ctx.destination);
  input.connect(dry);
  input.connect(convolver);
  convolver.connect(wet);
  dry.connect(limiter);
  wet.connect(limiter);

  output = { destination: input, dry: dry, wet: wet };
  ctxRef = ctx;
  applyReverbMix();
  return output;
}

function applyReverbMix() {
  if (!output) return;
  output.wet.gain.value = reverbMix * 0.55;
  output.dry.gain.value = 1 - reverbMix * 0.25;
}

async function loadSoundfontInstrument(ctx, instrumentName) {
  var cfg = typeof window !== "undefined" && window.ElasticSoundfontConfig
    ? window.ElasticSoundfontConfig
    : null;
  var attempts = cfg
    ? cfg.instrumentLoadAttempts(instrumentName)
    : [{ url: instrumentName, label: "direct" }];

  var lastErr = null;
  for (var i = 0; i < attempts.length; i++) {
    try {
      var inst = await Soundfont.instrument(ctx, attempts[i].url);
      return { inst: inst, source: attempts[i].label };
    } catch (err) {
      lastErr = err;
      console.warn("Soundfont load failed (" + attempts[i].label + "):", instrumentName, err);
    }
  }
  throw lastErr || new Error("All soundfont load attempts failed for " + instrumentName);
}

export function invalidateInstrument() {
  instrument = null;
  instrumentSource = null;
  loadingPromise = null;
}

export async function ensureInstrument(ctx, presetId) {
  presetId = presetId || currentPreset;
  var spec = presetSpec(presetId);

  if (instrument && currentPreset === presetId && ctxRef === ctx) {
    return instrument;
  }

  if (loadingPromise && currentPreset === presetId && ctxRef === ctx) {
    return loadingPromise;
  }

  currentPreset = presetId;
  ctxRef = ctx;
  ensureOutput(ctx);
  setStatus("Klang wird geladen …");

  loadingPromise = loadSoundfontInstrument(ctx, spec.name).then(function (result) {
    instrument = result.inst;
    instrumentSource = result.source;
    usingFallback = false;
    loadingPromise = null;
    setStatus(statusForSource(result.source));
    return instrument;
  }).catch(function (err) {
    loadingPromise = null;
    usingFallback = true;
    instrumentSource = "synth-fallback";
    instrument = createFallbackInstrument(ctx, presetId);
    setStatus(statusForSource("synth-fallback"));
    console.warn("Soundfont unavailable, using synth fallback:", err);
    return instrument;
  });

  return loadingPromise;
}

export async function ensureReady(ctx, presetId) {
  ensureOutput(ctx);
  return ensureInstrument(ctx, presetId || currentPreset);
}

export function playMelodyNote(ctx, midiNote, startTime, durationSec, velocityMul) {
  var out = ensureOutput(ctx);
  var spec = presetSpec(currentPreset);
  var gain = Math.max(0.04, (velocityMul || 0.65) * 0.62);
  var dur = Math.max(0.08, durationSec || spec.duration);

  function schedule(inst) {
    inst.play(midiNote, startTime, { duration: dur, gain: gain, destination: out.destination });
  }

  if (instrument && ctxRef === ctx) {
    schedule(instrument);
    return Promise.resolve();
  }

  return ensureInstrument(ctx, currentPreset).then(schedule);
}

export function setPreset(presetId) {
  if (!PRESETS[presetId] || presetId === currentPreset) return Promise.resolve();
  invalidateInstrument();
  currentPreset = presetId;
  document.querySelectorAll(".sound-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.sound === presetId);
  });
  if (!ctxRef) {
    setStatus("Klang: " + presetSpec(presetId).label);
    return Promise.resolve();
  }
  return ensureInstrument(ctxRef, presetId);
}

export function setReverbMix(value) {
  reverbMix = Math.max(0, Math.min(1, value));
  applyReverbMix();
}

export function getSoundSource() {
  return usingFallback ? "synth-fallback" : (instrumentSource || "unknown");
}

export function getCurrentPreset() {
  return currentPreset;
}

window.ElasticSound = {
  PRESETS: PRESETS,
  ensureReady: ensureReady,
  ensureInstrument: ensureInstrument,
  playMelodyNote: playMelodyNote,
  setPreset: setPreset,
  setReverbMix: setReverbMix,
  getSoundSource: getSoundSource,
  getCurrentPreset: getCurrentPreset,
  invalidateInstrument: invalidateInstrument,
};
