(function (global) {
  "use strict";

  function drawPianoRoll(canvas, notes, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var beatsPerBar = (opts && opts.beatsPerBar) || 4;
    var bars = (opts && opts.bars) || 4;
    var totalBeats = beatsPerBar * bars;
    var minMidi = 48;
    var maxMidi = 84;

    (notes || []).forEach(function (n) {
      minMidi = Math.min(minMidi, n.midi - 2);
      maxMidi = Math.max(maxMidi, n.midi + 2);
    });

    var dpr = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 800;
    var height = canvas.clientHeight || 180;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, height);

    var padL = 36;
    var padT = 12;
    var padB = 20;
    var gridW = width - padL - 8;
    var gridH = height - padT - padB;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (var b = 0; b <= totalBeats; b++) {
      var x = padL + (b / totalBeats) * gridW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + gridH);
      ctx.stroke();
    }

    var range = maxMidi - minMidi + 1;
    for (var m = minMidi; m <= maxMidi; m++) {
      var y = padT + gridH - ((m - minMidi + 0.5) / range) * gridH;
      if (m % 12 === 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
      }
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + gridW, y);
      ctx.stroke();
    }

    (notes || []).forEach(function (n) {
      var x0 = padL + (n.startBeat / totalBeats) * gridW;
      var x1 = padL + ((n.startBeat + n.durationBeats) / totalBeats) * gridW;
      var y0 = padT + gridH - ((n.midi - minMidi + 1) / range) * gridH;
      var y1 = padT + gridH - ((n.midi - minMidi) / range) * gridH;
      var vel = n.velocity || 90;
      var alpha = 0.35 + (vel / 127) * 0.55;
      ctx.fillStyle = "rgba(0,255,136," + alpha.toFixed(3) + ")";
      ctx.fillRect(x0, y0, Math.max(2, x1 - x0 - 1), y1 - y0);
    });

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "10px JetBrains Mono, monospace";
    for (var bar = 0; bar < bars; bar++) {
      var bx = padL + ((bar * beatsPerBar) / totalBeats) * gridW + 4;
      ctx.fillText(String(bar + 1), bx, height - 4);
    }
  }

  var api = { drawPianoRoll: drawPianoRoll };

  global.ElasticPianoRoll = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
