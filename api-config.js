/* Stay Master API configuration.
 * The website and its API must be served from the same origin.
 * No external API host or cross-origin override is accepted.
 */
(function () {
  'use strict';
  window.STAY_MASTER_API = {
    base: '',
    url: function (path) {
      var p = String(path || '');
      if (!p) return '';
      return p.charAt(0) === '/' ? p : '/' + p;
    },
    crossOrigin: false
  };
})();
