(function () {
  "use strict";

  var state = {
    tonicPc: 0,
    modeId: "dorian",
    styleId: "modal-jazz",
    bars: 4,
    intensity: 0.55,
    bpm: 100,
    seed: Date.now() & 0xffff,
    chords: null,
    importLabel: "",
    result: null,
    playing: false,
    soundPreset: "flute",
    reverb: 0.28,
    swing: 58,
    humanize: 35,
    chordInputText: "",
    euclidean: {
      enabled: false,
      pulses: 5,
      steps: 8,
      rotation: 0,
      scalePulses: 4,
      scaleRotation: 0,
    },
  };

  var tonicPicker = document.getElementById("tonicPicker");
  var modePicker = document.getElementById("modePicker");
  var stylePicker = document.getElementById("stylePicker");
  var barsSlider = document.getElementById("barsSlider");
  var barsVal = document.getElementById("barsVal");
  var intensitySlider = document.getElementById("intensitySlider");
  var intensityVal = document.getElementById("intensityVal");
  var generateBtn = document.getElementById("generateBtn");
  var playBtn = document.getElementById("playBtn");
  var exportMidiBtn = document.getElementById("exportMidiBtn");
  var shareComposerBtn = document.getElementById("shareComposerBtn");
  var seedBtn = document.getElementById("seedBtn");
  var bpmInput = document.getElementById("bpmInput");
  var phraseMeta = document.getElementById("phraseMeta");
  var noteList = document.getElementById("noteList");
  var pianoRoll = document.getElementById("pianoRoll");
  var chordRow = document.getElementById("chordRow");
  var importBanner = document.getElementById("importBanner");
  var clearChordsBtn = document.getElementById("clearChordsBtn");
  var openComposerBtn = document.getElementById("openComposerBtn");
  var euclidToggleBtn = document.getElementById("euclidToggleBtn");
  var euclidOnBtn = document.getElementById("euclidOnBtn");
  var euclidPulses = document.getElementById("euclidPulses");
  var euclidSteps = document.getElementById("euclidSteps");
  var euclidRotation = document.getElementById("euclidRotation");
  var euclidScalePulses = document.getElementById("euclidScalePulses");
  var euclidPulsesVal = document.getElementById("euclidPulsesVal");
  var euclidStepsVal = document.getElementById("euclidStepsVal");
  var euclidRotationVal = document.getElementById("euclidRotationVal");
  var euclidScalePulsesVal = document.getElementById("euclidScalePulsesVal");
  var euclidRhythmPreview = document.getElementById("euclidRhythmPreview");
  var euclidScalePreview = document.getElementById("euclidScalePreview");
  var soundPresetPicker = document.getElementById("soundPresetPicker");
  var reverbSlider = document.getElementById("reverbSlider");
  var reverbVal = document.getElementById("reverbVal");
  var shareLinkBtn = document.getElementById("shareLinkBtn");
  var shareToast = document.getElementById("shareToast");
  var chordInput = document.getElementById("chordInput");
  var applyChordsBtn = document.getElementById("applyChordsBtn");
  var chordParseError = document.getElementById("chordParseError");
  var swingSlider = document.getElementById("swingSlider");
  var swingVal = document.getElementById("swingVal");
  var humanizeSlider = document.getElementById("humanizeSlider");
  var humanizeVal = document.getElementById("humanizeVal");

  function feelOptions() {
    return { swing: state.swing, humanize: state.humanize, seed: state.seed };
  }

  function feltNotes(notes) {
    if (!notes || !window.ElasticFeel) return notes || [];
    return ElasticFeel.applyFeel(notes, feelOptions());
  }

  function euclidDrawOpts(res) {
    if (res && res.meta && res.meta.euclidean) {
      return {
        pulses: res.meta.euclidean.pulses,
        steps: res.meta.euclidean.steps,
        rotation: res.meta.euclidean.rotation,
        scalePulses: res.meta.euclidean.scalePulses,
        scaleRotation: res.meta.euclidean.scaleRotation,
      };
    }
    if (state.euclidean.enabled) {
      return state.euclidean;
    }
    return null;
  }

  function refreshPianoRoll(notes, rollBars, beatsPerBar, euclidOpts) {
    pianoRoll.classList.toggle("compact", !euclidOpts);
    ElasticPianoRoll.drawPianoRoll(pianoRoll, notes || [], {
      bars: rollBars,
      beatsPerBar: beatsPerBar || 4,
      euclidean: euclidOpts,
    });
  }

  function updateEuclidPreview() {
    var rhythm = ElasticEuclid.euclidean(state.euclidean.pulses, state.euclidean.steps, state.euclidean.rotation);
    var scalePat = ElasticEuclid.euclidean(state.euclidean.scalePulses, 7, state.euclidean.scaleRotation);
    euclidRhythmPreview.textContent = ElasticEuclid.patternLabel(rhythm);
    euclidScalePreview.textContent = ElasticEuclid.patternLabel(scalePat);
    euclidPulsesVal.textContent = String(state.euclidean.pulses);
    euclidStepsVal.textContent = String(state.euclidean.steps);
    euclidRotationVal.textContent = String(state.euclidean.rotation);
    euclidScalePulsesVal.textContent = state.euclidean.scalePulses + " / 7";

    if (state.result) {
      var rollBars = state.result.meta.chordAware
        ? Math.ceil((state.result.meta.totalBeats || state.result.meta.bars * 4) / 4)
        : state.result.meta.bars;
      refreshPianoRoll(
        state.result.notes,
        rollBars,
        state.result.meta.beatsPerBar,
        euclidDrawOpts(state.result)
      );
    } else if (state.euclidean.enabled) {
      refreshPianoRoll([], state.chords && state.chords.length ? Math.ceil(state.bars) : state.bars, 4, state.euclidean);
    } else {
      pianoRoll.classList.add("compact");
    }
  }

  function setEuclidEnabled(on) {
    state.euclidean.enabled = on;
    euclidToggleBtn.classList.toggle("active", !on);
    euclidOnBtn.classList.toggle("active", on);
    updateEuclidPreview();
  }

  function buildTonicPicker() {
    ElasticScale.NOTE_NAMES.forEach(function (name, pc) {
      var btn = document.createElement("button");
      btn.className = "key-btn" + (pc === state.tonicPc ? " active" : "");
      btn.textContent = name;
      btn.dataset.pc = String(pc);
      btn.addEventListener("click", function () {
        state.tonicPc = pc;
        document.querySelectorAll(".key-btn").forEach(function (b) {
          b.classList.toggle("active", Number(b.dataset.pc) === pc);
        });
      });
      tonicPicker.appendChild(btn);
    });
  }

  function buildModePicker() {
    Object.keys(ElasticScale.MODE_DEFS).forEach(function (modeId) {
      var btn = document.createElement("button");
      btn.className = "mode-btn" + (modeId === state.modeId ? " active" : "");
      btn.textContent = ElasticScale.MODE_DEFS[modeId].label;
      btn.dataset.mode = modeId;
      btn.addEventListener("click", function () {
        state.modeId = modeId;
        document.querySelectorAll(".mode-btn").forEach(function (b) {
          b.classList.toggle("active", b.dataset.mode === modeId);
        });
      });
      modePicker.appendChild(btn);
    });
  }

  function syncPickersFromState() {
    document.querySelectorAll(".key-btn").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.pc) === state.tonicPc);
    });
    document.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === state.modeId);
    });
    document.querySelectorAll(".style-btn[data-style]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.style === state.styleId);
    });
    document.querySelectorAll(".sound-btn[data-sound]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.sound === state.soundPreset);
    });
  }

  function syncSlidersFromState() {
    barsSlider.value = String(state.bars);
    if (!state.chords || !state.chords.length) {
      barsVal.textContent = state.bars + " Takte";
    }
    intensitySlider.value = String(Math.round(state.intensity * 100));
    intensityVal.textContent = Math.round(state.intensity * 100) + "%";
    bpmInput.value = String(state.bpm);
    reverbSlider.value = String(Math.round(state.reverb * 100));
    reverbVal.textContent = Math.round(state.reverb * 100) + "%";
    swingSlider.value = String(state.swing);
    swingVal.textContent = state.swing + "%";
    humanizeSlider.value = String(state.humanize);
    humanizeVal.textContent = state.humanize + "%";
    if (chordInput) chordInput.value = state.chordInputText || "";
    if (window.ElasticSound) ElasticSound.setReverbMix(state.reverb);
    euclidPulses.value = String(state.euclidean.pulses);
    euclidSteps.value = String(state.euclidean.steps);
    euclidRotation.value = String(state.euclidean.rotation);
    euclidScalePulses.value = String(state.euclidean.scalePulses);
    setEuclidEnabled(state.euclidean.enabled);
    if (window.ElasticSound) ElasticSound.setPreset(state.soundPreset);
  }

  function applyShareState(shared) {
    if (!shared) return;
    state.tonicPc = shared.tonicPc;
    state.modeId = shared.modeId;
    state.styleId = shared.styleId;
    state.bars = shared.bars;
    state.intensity = shared.intensity;
    state.bpm = shared.bpm;
    state.seed = shared.seed;
    state.soundPreset = shared.soundPreset;
    state.reverb = shared.reverb;
    state.swing = shared.swing == null ? 58 : shared.swing;
    state.humanize = shared.humanize == null ? 35 : shared.humanize;
    state.euclidean = shared.euclidean;
    state.chords = shared.chords;
    state.importLabel = shared.importLabel || "";
    state.chordInputText = shared.chords
      ? ElasticChords.progressionTextFromChords(shared.chords)
      : "";
    importBanner.hidden = !state.importLabel;
    if (state.importLabel) {
      importBanner.textContent = "Akkordfolge: " + state.importLabel + " · " + state.bpm + " BPM";
    }
    syncPickersFromState();
    syncSlidersFromState();
    renderChords();
    generatePhrase();
  }

  function renderChords() {
    chordRow.innerHTML = "";
    if (!state.chords || !state.chords.length) {
      var hint = document.createElement("span");
      hint.className = "mode-hint";
      hint.style.margin = "0";
      hint.textContent = "Keine Akkordfolge — freie Skalen-Melodie.";
      chordRow.appendChild(hint);
      clearChordsBtn.disabled = true;
      barsSlider.disabled = false;
      return;
    }

    state.chords.forEach(function (chord) {
      var chip = document.createElement("span");
      chip.className = "chord-chip";
      chip.textContent = ElasticChords.chordLabel(chord);
      chordRow.appendChild(chip);
    });
    clearChordsBtn.disabled = false;
    barsSlider.disabled = true;
    barsVal.textContent = "auto (Folge)";
  }

  function setChordProgression(chords, label, source) {
    state.chords = chords;
    state.importLabel = label || ElasticChords.formatProgression(chords);
    state.chordInputText = ElasticChords.progressionTextFromChords(chords);
    if (chordInput) chordInput.value = state.chordInputText;
    if (chordParseError) chordParseError.hidden = true;
    importBanner.hidden = false;
    importBanner.textContent =
      (source || "Akkordfolge") + ": " + state.importLabel + " · " + state.bpm + " BPM";
    renderChords();
    generatePhrase();
  }

  function applyChordsFromText() {
    var text = chordInput ? chordInput.value : "";
    state.chordInputText = text;
    var parsed = ElasticChords.parseProgressionText(text);
    if (!parsed.ok) {
      if (chordParseError) {
        chordParseError.hidden = false;
        chordParseError.textContent = parsed.errors.length
          ? "Unbekannter Akkord: " + parsed.errors.map(function (e) { return e.token; }).join(", ")
          : "Bitte mindestens einen Akkord eingeben.";
      }
      return;
    }
    setChordProgression(parsed.chords, null, "Eingegebene Folge");
  }

  function applyComposerImport(data) {
    state.chords = data.chords;
    state.bpm = data.bpm;
    bpmInput.value = String(state.bpm);
    if (data.key) {
      state.tonicPc = data.key.tonicPc;
      state.modeId = data.key.modeId || "major";
      document.querySelectorAll(".key-btn").forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.pc) === state.tonicPc);
      });
      document.querySelectorAll(".mode-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.mode === state.modeId);
      });
    }
    setChordProgression(data.chords, ElasticChords.formatProgression(data.chords), "Import aus Elastic Composer");
  }

  function clearChords() {
    state.chords = null;
    state.importLabel = "";
    state.chordInputText = "";
    if (chordInput) chordInput.value = "";
    if (chordParseError) chordParseError.hidden = true;
    importBanner.hidden = true;
    barsSlider.disabled = false;
    barsVal.textContent = state.bars + " Takte";
    renderChords();
    generatePhrase();
  }

  stylePicker.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-style]");
    if (!btn) return;
    state.styleId = btn.dataset.style;
    document.querySelectorAll(".style-btn[data-style]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.style === state.styleId);
    });
  });

  barsSlider.addEventListener("input", function () {
    if (state.chords && state.chords.length) return;
    state.bars = Number(barsSlider.value);
    barsVal.textContent = state.bars + " Takte";
  });

  intensitySlider.addEventListener("input", function () {
    state.intensity = Number(intensitySlider.value) / 100;
    intensityVal.textContent = intensitySlider.value + "%";
  });

  bpmInput.addEventListener("change", function () {
    state.bpm = Math.max(40, Math.min(240, Number(bpmInput.value) || 100));
    bpmInput.value = String(state.bpm);
  });

  seedBtn.addEventListener("click", function () {
    state.seed = (Math.random() * 0xffff) | 0;
    stopPlayback();
    generatePhrase();
  });

  clearChordsBtn.addEventListener("click", clearChords);
  applyChordsBtn.addEventListener("click", applyChordsFromText);
  if (chordInput) {
    chordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) applyChordsFromText();
    });
  }
  openComposerBtn.addEventListener("click", function () {
    window.open(ElasticHandoff.COMPOSER_APP_URL, "_blank", "noopener,noreferrer");
  });

  euclidToggleBtn.addEventListener("click", function () { setEuclidEnabled(false); });
  euclidOnBtn.addEventListener("click", function () { setEuclidEnabled(true); });
  euclidPulses.addEventListener("input", function () {
    state.euclidean.pulses = Number(euclidPulses.value);
    updateEuclidPreview();
  });
  euclidSteps.addEventListener("input", function () {
    state.euclidean.steps = Number(euclidSteps.value);
    updateEuclidPreview();
  });
  euclidRotation.addEventListener("input", function () {
    state.euclidean.rotation = Number(euclidRotation.value);
    updateEuclidPreview();
  });
  euclidScalePulses.addEventListener("input", function () {
    state.euclidean.scalePulses = Number(euclidScalePulses.value);
    updateEuclidPreview();
  });

  soundPresetPicker.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-sound]");
    if (!btn || !window.ElasticSound) return;
    state.soundPreset = btn.dataset.sound;
    ElasticSound.setPreset(state.soundPreset);
  });

  reverbSlider.addEventListener("input", function () {
    state.reverb = Number(reverbSlider.value) / 100;
    reverbVal.textContent = reverbSlider.value + "%";
    if (window.ElasticSound) ElasticSound.setReverbMix(state.reverb);
  });

  swingSlider.addEventListener("input", function () {
    state.swing = Number(swingSlider.value);
    swingVal.textContent = state.swing + "%";
  });

  humanizeSlider.addEventListener("input", function () {
    state.humanize = Number(humanizeSlider.value);
    humanizeVal.textContent = state.humanize + "%";
  });

  document.body.addEventListener(
    "pointerdown",
    function warmSoundOnce() {
      if (!window.ElasticSound) return;
      ElasticPlayback.ensureContext().then(function (audio) {
        ElasticSound.ensureReady(audio, state.soundPreset);
      });
    },
    { once: true }
  );

  function stopPlayback() {
    ElasticPlayback.stop();
    state.playing = false;
    playBtn.textContent = "▶ Abspielen";
    playBtn.classList.remove("playing");
  }

  function setPlayingUi(playing) {
    state.playing = playing;
    playBtn.textContent = playing ? "■ Stop" : "▶ Abspielen";
    playBtn.classList.toggle("playing", playing);
  }

  function renderResult() {
    var res = state.result;
    if (!res) {
      phraseMeta.textContent = "Noch keine Phrase — oben generieren.";
      noteList.textContent = "";
      exportMidiBtn.disabled = true;
      playBtn.disabled = true;
      shareComposerBtn.disabled = true;
      refreshPianoRoll([], state.bars, 4, state.euclidean.enabled ? state.euclidean : null);
      return;
    }

    var modeTag = res.meta.chordAware ? " · akkordbewusst" : "";
    if (res.meta.euclidean) {
      modeTag += " · E(" + res.meta.euclidean.pulses + "," + res.meta.euclidean.steps + ")";
    }
    phraseMeta.innerHTML =
      "Tonart: <b>" +
      res.meta.keyLabel +
      "</b> · " +
      res.notes.length +
      " Noten · Seed " +
      state.seed +
      modeTag;

    var lines = res.notes.slice(0, 24).map(function (n, i) {
      var beat = (n.startBeat + 1).toFixed(1);
      return (
        String(i + 1).padStart(2, "0") +
        ". Beat " +
        beat +
        " · MIDI " +
        n.midi +
        " · vel " +
        n.velocity
      );
    });
    if (res.notes.length > 24) lines.push("… +" + (res.notes.length - 24) + " weitere");
    noteList.textContent = lines.join("\n");

    var rollBars = res.meta.chordAware
      ? Math.ceil((res.meta.totalBeats || res.meta.bars * 4) / 4)
      : res.meta.bars;

    refreshPianoRoll(res.notes, rollBars, res.meta.beatsPerBar, euclidDrawOpts(res));
    exportMidiBtn.disabled = false;
    playBtn.disabled = false;
    shareComposerBtn.disabled = false;
  }

  function generatePhrase() {
    stopPlayback();
    var opts = {
      tonicPc: state.tonicPc,
      modeId: state.modeId,
      styleId: state.styleId,
      intensity: state.intensity,
      seed: state.seed,
    };
    if (state.chords && state.chords.length) {
      opts.chords = state.chords;
    } else {
      opts.bars = state.bars;
    }
    if (state.euclidean.enabled) {
      opts.euclidean = state.euclidean;
    }
    state.result = ElasticPhraseEngine.generatePhrase(opts);
    renderResult();
  }

  generateBtn.addEventListener("click", generatePhrase);

  playBtn.addEventListener("click", function () {
    if (!state.result) return;
    if (state.playing) {
      stopPlayback();
      return;
    }
    setPlayingUi(true);
    playBtn.disabled = true;
    ElasticPlayback.playPhrase(state.result.notes, state.bpm, {
      feel: feelOptions(),
      onEnd: function () {
        setPlayingUi(false);
        playBtn.disabled = false;
      },
    })
      .catch(function () {
        setPlayingUi(false);
        playBtn.disabled = false;
      })
      .then(function () {
        if (state.playing) playBtn.disabled = false;
      });
  });

  exportMidiBtn.addEventListener("click", function () {
    if (!state.result) return;
    var name =
      "elastic-phrase-" +
      ElasticScale.noteName(state.tonicPc).replace("#", "s") +
      "-" +
      state.modeId +
      ".mid";
    ElasticMidi.downloadMidi(feltNotes(state.result.notes), state.bpm, name);
  });

  shareComposerBtn.addEventListener("click", function () {
    if (!state.result) return;
    var ctx = ElasticPhraseEngine.buildElasticContext(state.result, state.bpm, {
      chords: state.chords,
    });
    window.open(ElasticHandoff.buildComposerUrl(ctx), "_blank", "noopener,noreferrer");
  });

  shareLinkBtn.addEventListener("click", function () {
    var url = ElasticHandoff.buildShareUrl(state, window.location.origin + window.location.pathname);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showShareToast).catch(function () {
        window.prompt("Link kopieren:", url);
      });
    } else {
      window.prompt("Link kopieren:", url);
      showShareToast();
    }
  });

  function showShareToast() {
    if (!shareToast) return;
    shareToast.hidden = false;
    clearTimeout(showShareToast._t);
    showShareToast._t = setTimeout(function () {
      shareToast.hidden = true;
    }, 2200);
  }

  buildTonicPicker();
  buildModePicker();
  renderChords();
  updateEuclidPreview();

  var imported = ElasticHandoff.importFromLocation();
  if (imported) {
    applyComposerImport(imported);
  } else {
    var shared = ElasticHandoff.importShareFromLocation();
    if (shared) {
      applyShareState(shared);
    } else {
      generatePhrase();
    }
  }

  window.addEventListener("resize", function () {
    if (state.result) renderResult();
  });
})();
