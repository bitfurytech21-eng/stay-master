/* Where the frontend finds the backend — the single place a host is declared.
 *
 * Default is a SAME-ORIGIN base (''): the site is served by the Render static
 * service, which rewrites /api/* to the API service, so '' is always correct
 * there and no CORS or cookie setup is needed.
 *
 * When the HTML is served by a host that does NOT proxy /api (GitHub Pages, a
 * CDN, a preview URL), set the API origin in ONE place, either:
 *   <meta name="stay-master-api" content="https://stay-master-api.onrender.com">
 * or, before this file loads:
 *   <script>window.STAY_MASTER_API_BASE = 'https://stay-master-api.onrender.com';</script>
 *
 * Nothing else in the codebase hard-codes a host.
 */
(function () {
  'use strict';

  var base = '';
  if (typeof window.STAY_MASTER_API_BASE === 'string') {
    base = window.STAY_MASTER_API_BASE;
  } else {
    var meta = document.querySelector('meta[name="stay-master-api"]');
    if (meta && meta.getAttribute('content')) base = meta.getAttribute('content');
  }

  // Strip a trailing slash so callers always pass '/api/...'.
  base = String(base || '').replace(/\/+$/, '');

  window.STAY_MASTER_API = {
    base: base,
    /** Build the URL for an API path, e.g. '/api/booking/properties'. */
    url: function (path) {
      var p = String(path || '');
      if (!p) return base;
      if (p.charAt(0) !== '/') p = '/' + p;
      return base + p;
    },
    /** True when the API lives on a different origin than the page. */
    crossOrigin: base !== ''
  };
})();
