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
    result: null,
  };

  var tonicPicker = document.getElementById("tonicPicker");
  var modePicker = document.getElementById("modePicker");
  var stylePicker = document.getElementById("stylePicker");
  var barsSlider = document.getElementById("barsSlider");
  var barsVal = document.getElementById("barsVal");
  var intensitySlider = document.getElementById("intensitySlider");
  var intensityVal = document.getElementById("intensityVal");
  var generateBtn = document.getElementById("generateBtn");
  var exportMidiBtn = document.getElementById("exportMidiBtn");
  var seedBtn = document.getElementById("seedBtn");
  var bpmInput = document.getElementById("bpmInput");
  var phraseMeta = document.getElementById("phraseMeta");
  var noteList = document.getElementById("noteList");
  var pianoRoll = document.getElementById("pianoRoll");

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

  stylePicker.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-style]");
    if (!btn) return;
    state.styleId = btn.dataset.style;
    document.querySelectorAll(".style-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.style === state.styleId);
    });
  });

  barsSlider.addEventListener("input", function () {
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
    if (state.result) generatePhrase();
  });

  function renderResult() {
    var res = state.result;
    if (!res) {
      phraseMeta.textContent = "Noch keine Phrase — oben generieren.";
      noteList.textContent = "";
      exportMidiBtn.disabled = true;
      ElasticPianoRoll.drawPianoRoll(pianoRoll, [], { bars: state.bars });
      return;
    }

    phraseMeta.innerHTML =
      "Tonart: <b>" +
      res.meta.keyLabel +
      "</b> · " +
      res.notes.length +
      " Noten · Seed " +
      state.seed;

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

    ElasticPianoRoll.drawPianoRoll(pianoRoll, res.notes, {
      bars: res.meta.bars,
      beatsPerBar: res.meta.beatsPerBar,
    });
    exportMidiBtn.disabled = false;
  }

  function generatePhrase() {
    state.result = ElasticPhraseEngine.generatePhrase({
      tonicPc: state.tonicPc,
      modeId: state.modeId,
      styleId: state.styleId,
      bars: state.bars,
      intensity: state.intensity,
      seed: state.seed,
    });
    renderResult();
  }

  generateBtn.addEventListener("click", generatePhrase);

  exportMidiBtn.addEventListener("click", function () {
    if (!state.result) return;
    var name =
      "elastic-phrase-" +
      ElasticScale.noteName(state.tonicPc).replace("#", "s") +
      "-" +
      state.modeId +
      ".mid";
    ElasticMidi.downloadMidi(state.result.notes, state.bpm, name);
  });

  buildTonicPicker();
  buildModePicker();
  generatePhrase();

  window.addEventListener("resize", function () {
    if (state.result) renderResult();
  });
})();
