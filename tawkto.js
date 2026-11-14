/* Stay Master live support — tawk.to
 *
 * Setup:
 * 1. Create a property at https://www.tawk.to/
 * 2. Open Administration -> Channels -> Chat Widget.
 * 3. Copy the Property ID and Widget ID into the two values below.
 *
 * The widget is deliberately inactive while either value is blank.
 * These IDs are public embed identifiers, not account passwords or API secrets.
 */
(function () {
  'use strict';

  var config = window.STAY_MASTER_TAWKTO || {
    propertyId: '6af8f37075c1dd3c38fc4878',
    widgetId: '1k7e7dso3'
  };

  var propertyId = String(config.propertyId || '').trim();
  var widgetId = String(config.widgetId || '').trim();
  var validId = /^[A-Za-z0-9_-]+$/;

  if (!propertyId || !widgetId ||
      !validId.test(propertyId) || !validId.test(widgetId)) {
    return;
  }

  if (document.getElementById('tawkto-widget-script')) return;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

  var script = document.createElement('script');
  script.id = 'tawkto-widget-script';
  script.async = true;
  script.src = 'https://embed.tawk.to/' +
    encodeURIComponent(propertyId) + '/' + encodeURIComponent(widgetId);
  script.charset = 'UTF-8';
  script.setAttribute('crossorigin', '*');

  var firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})();
