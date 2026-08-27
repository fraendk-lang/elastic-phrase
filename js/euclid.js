(function (global) {
  "use strict";

  /** Bjorklund / Euclidean rhythm — k pulses distributed over n steps. */
  function bjorklund(k, n) {
    k = Math.max(0, Math.min(n, Math.round(k)));
    if (n <= 0) return [];
    if (k === 0) return new Array(n).fill(0);
    if (k === n) return new Array(n).fill(1);

    var pattern = [];
    var counts = [];
    var remainders = [k];
    var divisor = n - k;
    var level = 0;

    while (true) {
      counts.push(Math.floor(divisor / remainders[level]));
      remainders.push(divisor % remainders[level]);
      divisor = remainders[level];
      level += 1;
      if (remainders[level] <= 1) break;
    }
    counts.push(divisor);

    function build(l) {
      if (l === -1) {
        pattern.push(0);
        return;
      }
      if (l === -2) {
        pattern.push(1);
        return;
      }
      var i;
      for (i = 0; i < counts[l]; i++) build(l - 1);
      if (remainders[l] !== 0) build(l - 2);
    }

    build(level);
    return pattern.slice(0, n);
  }

  function rotate(pattern, rotation) {
    if (!pattern.length) return pattern;
    var r = ((rotation % pattern.length) + pattern.length) % pattern.length;
    if (!r) return pattern.slice();
    return pattern.slice(r).concat(pattern.slice(0, r));
  }

  function euclidean(k, n, rotation) {
    n = Math.max(1, Math.round(n));
    k = Math.max(0, Math.min(n, Math.round(k)));
    return rotate(bjorklund(k, n), rotation || 0);
  }

  function pulseCount(pattern) {
    var c = 0;
    pattern.forEach(function (v) { if (v) c += 1; });
    return c;
  }

  function patternLabel(pattern) {
    return pattern.map(function (v) { return v ? "●" : "·"; }).join("");
  }

  var api = {
    bjorklund: bjorklund,
    rotate: rotate,
    euclidean: euclidean,
    pulseCount: pulseCount,
    patternLabel: patternLabel,
  };

  global.ElasticEuclid = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
