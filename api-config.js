/* Where the frontend finds the backend — the single place a host is declared.
 *
 * Default is SAME-ORIGIN (''): the Node backend serves the frontend files and
 * the /api routes from one Render service and one public origin.
 *
 * For an intentional external frontend deployment, set the API origin in ONE
 * place, either:
 *   <meta name="stay-master-api" content="https://stay-master-backend2.onrender.com">
 * or, before this file loads:
 *   <script>window.STAY_MASTER_API_BASE = 'https://stay-master-backend2.onrender.com';</script>
 *
 * Nothing else in the codebase hard-codes a host.
 */
(function () {
  'use strict';

  // Frontend and API are served from the same Render origin. Keep this empty
  // unless a deliberate external API origin is configured at deployment time.
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
