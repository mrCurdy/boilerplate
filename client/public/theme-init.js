// Runs before first paint (see index.html) to avoid a flash of the wrong theme.
try {
  // 1. Light / dark mode
  var t = localStorage.getItem('theme') || 'system';
  var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';

  // 2. Appearance parameters cached by src/lib/appearance.ts
  var cache = JSON.parse(localStorage.getItem('appearance-cache') || 'null');
  if (cache) {
    for (var k in cache.vars) root.style.setProperty(k, cache.vars[k]);
    if (cache.fontUrl) {
      var link = document.createElement('link');
      link.id = 'appearance-font';
      link.rel = 'stylesheet';
      link.href = cache.fontUrl;
      document.head.appendChild(link);
    }
  }
} catch (e) {}
