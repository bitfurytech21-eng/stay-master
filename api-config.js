/* The frontend and API are served from the same Stay Master origin. */
(function () {
  'use strict';
  var base = '';
  if (typeof window.STAY_MASTER_API_BASE === 'string') base = window.STAY_MASTER_API_BASE;
  else {
    var meta = document.querySelector('meta[name="stay-master-api"]');
    if (meta && meta.getAttribute('content')) base = meta.getAttribute('content');
  }
  base = String(base || '').replace(/\/+$/, '');
  window.STAY_MASTER_API = {
    base: base,
    url: function (path) {
      var p = String(path || '');
      if (!p) return base;
      if (p.charAt(0) !== '/') p = '/' + p;
      return base + p;
    },
    crossOrigin: base !== ''
  };
})();
