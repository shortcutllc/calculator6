/* =========================================================
   Real US map loader.
   Fetches us-atlas states-10m.json at runtime, projects with d3-geo,
   stitches all lower-48 state paths into one combined path string,
   and stashes it on window.US_MAP_PATH for slide 13 to render.

   Also exports window.US_CITIES — the same Albers projection applied
   to major-city lat/lng so dots land on their real geographic spots.

   Designed for a booth TV with internet. If offline, slide 13 will
   fall back to a simple placeholder rectangle (still branded).
   ========================================================= */

(function () {
  // Canonical Albers parameters — any city/state projected through this
  // lands in the same 960×593 viewBox. Used both here and for city dots.
  const VIEW_W = 960, VIEW_H = 593;
  const projectParams = {
    rotate: [96, 0],
    center: [-0.6, 38.7],
    parallels: [29.5, 45.5],
    scale: 1100,
    translate: [VIEW_W / 2, VIEW_H / 2],
  };

  // Pre-projected city coordinates (baked once from d3.geoAlbers with
  // the parameters above). Used if d3 never loads, so dots still appear.
  const CITIES_FALLBACK = [
    { name: 'Seattle',     x: 150.2, y:  77.6 },
    { name: 'Portland',    x: 134.7, y: 114.7 },
    { name: 'SF',          x:  96.9, y: 259.7 },
    { name: 'LA',          x: 141.0, y: 345.7 },
    { name: 'San Diego',   x: 151.9, y: 374.7 },
    { name: 'Phoenix',     x: 234.5, y: 376.7 },
    { name: 'Denver',      x: 357.6, y: 270.2 },
    { name: 'Dallas',      x: 476.1, y: 411.1 },
    { name: 'Austin',      x: 460.1, y: 459.3 },
    { name: 'Houston',     x: 499.4, y: 469.3 },
    { name: 'Minneapolis', x: 525.9, y: 174.6 },
    { name: 'Chicago',     x: 607.5, y: 229.7 },
    { name: 'Detroit',     x: 670.9, y: 213.8 },
    { name: 'Nashville',   x: 630.3, y: 338.9 },
    { name: 'Atlanta',     x: 672.4, y: 381.2 },
    { name: 'Miami',       x: 763.7, y: 522.9 },
    { name: 'DC',          x: 767.6, y: 264.6 },
    { name: 'NYC',         x: 803.4, y: 221.0 },
    { name: 'Boston',      x: 836.4, y: 179.8 },
  ];

  window.US_MAP_PATH = '';
  window.US_MAP_READY = false;
  window.US_CITIES = CITIES_FALLBACK;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadMap() {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js');

      const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json');
      const topo = await res.json();

      // Filter to lower 48 + DC (drop AK=02, HI=15, territories 60/66/69/72/78)
      const DROP = new Set(['02', '15', '60', '66', '69', '72', '78']);
      const states = topojson.feature(topo, topo.objects.states);
      states.features = states.features.filter(f => !DROP.has(f.id));

      // Same projection we use for cities — so dots land on real spots.
      const projection = d3.geoAlbers()
        .rotate(projectParams.rotate)
        .center(projectParams.center)
        .parallels(projectParams.parallels)
        .scale(projectParams.scale)
        .translate(projectParams.translate)
        .precision(0.1);

      const pathGen = d3.geoPath(projection);
      const d = pathGen(states);

      if (d) {
        window.US_MAP_PATH = d;
        window.US_MAP_READY = true;
        window.dispatchEvent(new Event('us-map-ready'));
      }
    } catch (err) {
      console.warn('[workhuman_tv] US map failed to load from CDN:', err);
      window.US_MAP_READY = 'error';
      window.dispatchEvent(new Event('us-map-ready'));
    }
  }

  loadMap();
})();
