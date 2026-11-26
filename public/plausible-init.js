// Plausible's queue stub: calls made before the analytics script has loaded
// are queued, not lost. Lives in a file, not inline, so the Content Security
// Policy in public/_headers can allow scripts from this site and plausible.io
// only. Same pattern as ai-risk-training/public/plausible-init.js; the
// Baseline routes with real paths, so it needs no hash-routing option.
(function () {
  const p = (window.plausible = window.plausible || function () { (p.q = p.q || []).push(arguments); });
  p.init = p.init || function (i) { p.o = i || {}; };
  p.init();
})();
