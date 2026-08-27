(function (global) {
  "use strict";

  function getEuclidPatterns(euclid) {
    if (!euclid || !global.ElasticEuclid) return null;
    return {
      rhythm: global.ElasticEuclid.euclidean(
        euclid.pulses || 5,
        euclid.steps || 8,
        euclid.rotation || 0
      ),
      scale: global.ElasticEuclid.euclidean(
        euclid.scalePulses || 4,
        7,
        euclid.scaleRotation || 0
      ),
      steps: euclid.steps || 8,
      pulses: euclid.pulses || 5,
      scalePulses: euclid.scalePulses || 4,
    };
  }

  function stepIndexAtBeat(beat, beatsPerBar, steps) {
    var inBar = ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar;
    return Math.floor((inBar / beatsPerBar) * steps) % steps;
  }

  function drawPulseColumns(ctx, patterns, layout) {
    var padL = layout.padL;
    var padT = layout.padT;
    var gridW = layout.gridW;
    var gridH = layout.gridH;
    var bars = layout.bars;
    var beatsPerBar = layout.beatsPerBar;
    var totalBeats = layout.totalBeats;
    var steps = patterns.steps;
    var rhythm = patterns.rhythm;

    for (var bar = 0; bar < bars; bar++) {
      var barStart = bar * beatsPerBar;
      var barX0 = padL + (barStart / totalBeats) * gridW;
      var barX1 = padL + ((barStart + beatsPerBar) / totalBeats) * gridW;
      var cellW = (barX1 - barX0) / steps;

      for (var s = 0; s < steps; s++) {
        var x = barX0 + s * cellW;
        var isPulse = rhythm[s % rhythm.length];
        ctx.fillStyle = isPulse ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.015)";
        ctx.fillRect(x, padT, Math.max(1, cellW - 0.5), gridH);
        ctx.strokeStyle = isPulse ? "rgba(0,255,136,0.18)" : "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + gridH);
        ctx.stroke();
      }
    }
  }

  function drawRhythmLane(ctx, patterns, layout) {
    var lane = layout.rhythmLane;
    var padL = layout.padL;
    var gridW = layout.gridW;
    var bars = layout.bars;
    var beatsPerBar = layout.beatsPerBar;
    var totalBeats = layout.totalBeats;
    var steps = patterns.steps;
    var rhythm = patterns.rhythm;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText("E", padL - 26, lane.y + lane.h * 0.65);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(
      "E(" + patterns.pulses + "," + steps + ")",
      padL,
      lane.y - 4
    );

    for (var bar = 0; bar < bars; bar++) {
      var barStart = bar * beatsPerBar;
      var barX0 = padL + (barStart / totalBeats) * gridW;
      var barX1 = padL + ((barStart + beatsPerBar) / totalBeats) * gridW;
      var cellW = (barX1 - barX0) / steps;

      for (var s = 0; s < steps; s++) {
        var x = barX0 + s * cellW;
        var isPulse = rhythm[s % rhythm.length];
        ctx.fillStyle = isPulse ? "rgba(0,255,136,0.14)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(x, lane.y, Math.max(1, cellW - 1), lane.h);
        ctx.fillStyle = isPulse ? "#00FF88" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.arc(x + cellW * 0.5, lane.y + lane.h * 0.5, isPulse ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawScaleLane(ctx, patterns, layout) {
    var lane = layout.scaleLane;
    var padL = layout.padL;
    var gridW = layout.gridW;
    var scale = patterns.scale;
    var labels = ["I", "II", "III", "IV", "V", "VI", "VII"];
    var cellW = gridW / 7;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText("S", padL - 26, lane.y + lane.h * 0.65);
    ctx.fillStyle = "rgba(77,155,255,0.45)";
    ctx.fillText(
      "Skala E(" + patterns.scalePulses + ",7)",
      padL,
      lane.y - 4
    );

    for (var d = 0; d < 7; d++) {
      var x = padL + d * cellW;
      var on = scale[d];
      ctx.fillStyle = on ? "rgba(77,155,255,0.12)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(x, lane.y, Math.max(1, cellW - 1), lane.h);
      ctx.fillStyle = on ? "#4d9bff" : "rgba(255,255,255,0.15)";
      ctx.font = on ? "600 9px JetBrains Mono, monospace" : "9px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(labels[d], x + cellW * 0.5, lane.y + lane.h * 0.72);
      ctx.textAlign = "left";
    }
  }

  function lockRegionEndX(lockBeats, padL, gridW, totalBeats) {
    if (!lockBeats || lockBeats <= 0) return null;
    var endBeat = Math.min(lockBeats, totalBeats);
    return padL + (endBeat / totalBeats) * gridW;
  }

  function drawLockRegion(ctx, layout) {
    var x1 = lockRegionEndX(layout.lockBeats, layout.padL, layout.gridW, layout.totalBeats);
    if (x1 == null) return;

    var padL = layout.padL;
    var padT = layout.padT;
    var gridH = layout.gridH;

    ctx.fillStyle = "rgba(255, 140, 66, 0.08)";
    ctx.fillRect(padL, padT, x1 - padL, gridH);

    ctx.strokeStyle = "rgba(255, 140, 66, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, padT);
    ctx.lineTo(x1, padT + gridH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255, 140, 66, 0.85)";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText("Motiv", padL + 4, padT + 11);
  }

  function drawNotes(ctx, notes, layout) {
    var padL = layout.padL;
    var padT = layout.padT;
    var gridW = layout.gridW;
    var gridH = layout.gridH;
    var totalBeats = layout.totalBeats;
    var minMidi = layout.minMidi;
    var range = layout.range;
    var patterns = layout.patterns;

    (notes || []).forEach(function (n) {
      var x0 = padL + (n.startBeat / totalBeats) * gridW;
      var x1 = padL + ((n.startBeat + n.durationBeats) / totalBeats) * gridW;
      var y0 = padT + gridH - ((n.midi - minMidi + 1) / range) * gridH;
      var y1 = padT + gridH - ((n.midi - minMidi) / range) * gridH;
      var vel = n.velocity || 90;
      var alpha = 0.35 + (vel / 127) * 0.55;
      var isEuclid = n.role === "euclid";

      if (patterns) {
        var step = stepIndexAtBeat(n.startBeat, layout.beatsPerBar, patterns.steps);
        var pulse = patterns.rhythm[step % patterns.rhythm.length];
        if (pulse) {
          ctx.strokeStyle = "rgba(0,255,136,0.55)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(2, x1 - x0 - 2), y1 - y0 - 1);
        }
      }

      ctx.fillStyle = isEuclid
        ? "rgba(0,255,136," + alpha.toFixed(3) + ")"
        : "rgba(0,255,136," + (alpha * 0.85).toFixed(3) + ")";
      ctx.fillRect(x0, y0, Math.max(2, x1 - x0 - 1), y1 - y0);
    });
  }

  function drawPianoRoll(canvas, notes, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    opts = opts || {};
    var beatsPerBar = opts.beatsPerBar || 4;
    var bars = opts.bars || 4;
    var totalBeats = beatsPerBar * bars;
    var patterns = getEuclidPatterns(opts.euclidean);
    var lockBeats = opts.lockBeats || 0;
    var minMidi = 48;
    var maxMidi = 84;

    (notes || []).forEach(function (n) {
      minMidi = Math.min(minMidi, n.midi - 2);
      maxMidi = Math.max(maxMidi, n.midi + 2);
    });

    var dpr = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 800;
    var height = canvas.clientHeight || (patterns ? 240 : 180);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, height);

    var padL = 36;
    var padT = 12;
    var padB = patterns ? 72 : 20;
    var gridW = width - padL - 8;
    var gridH = height - padT - padB;

    var layout = {
      padL: padL,
      padT: padT,
      gridW: gridW,
      gridH: gridH,
      bars: bars,
      beatsPerBar: beatsPerBar,
      totalBeats: totalBeats,
      minMidi: minMidi,
      range: maxMidi - minMidi + 1,
      patterns: patterns,
      lockBeats: lockBeats,
    };

    if (patterns) {
      layout.rhythmLane = { y: padT + gridH + 10, h: 22 };
      layout.scaleLane = { y: padT + gridH + 38, h: 18 };
    }

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (var b = 0; b <= totalBeats; b++) {
      var x = padL + (b / totalBeats) * gridW;
      var isBar = b % beatsPerBar === 0;
      ctx.strokeStyle = isBar ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + gridH);
      ctx.stroke();
    }

    if (patterns) {
      drawPulseColumns(ctx, patterns, layout);
    }

    drawLockRegion(ctx, layout);

    for (var m = minMidi; m <= maxMidi; m++) {
      var y = padT + gridH - ((m - minMidi + 0.5) / layout.range) * gridH;
      ctx.strokeStyle = m % 12 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + gridW, y);
      ctx.stroke();
    }

    drawNotes(ctx, notes, layout);

    if (patterns) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(padL, padT + gridH + 4);
      ctx.lineTo(padL + gridW, padT + gridH + 4);
      ctx.stroke();
      drawRhythmLane(ctx, patterns, layout);
      drawScaleLane(ctx, patterns, layout);
    }

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "10px JetBrains Mono, monospace";
    for (var bar = 0; bar < bars; bar++) {
      var bx = padL + ((bar * beatsPerBar) / totalBeats) * gridW + 4;
      ctx.fillText(String(bar + 1), bx, height - 4);
    }
  }

  var api = {
    drawPianoRoll: drawPianoRoll,
    getEuclidPatterns: getEuclidPatterns,
    stepIndexAtBeat: stepIndexAtBeat,
    lockRegionEndX: lockRegionEndX,
  };

  global.ElasticPianoRoll = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
