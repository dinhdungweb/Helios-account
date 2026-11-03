/* Shared translations for custom storefront features. Catalogs are rendered by Liquid. */
(function () {
  'use strict';

  var theme = window.theme = window.theme || {};
  theme.locale = document.documentElement.lang || 'en';

  theme.escapeHtml = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  };

  // Values are escaped so the same interpolation is safe in translated HTML messages.
  theme.t = function (key, values) {
    var catalog = theme.strings && theme.strings.helios || {};
    var message = Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : '';
    return String(message).replace(/\{\{\s*(\w+)\s*\}\}/g, function (match, name) {
      return values && Object.prototype.hasOwnProperty.call(values, name)
        ? theme.escapeHtml(values[name]) : match;
    });
  };

  // Slot IDs are stored in the legacy "Thu 2 Nov 02" format. Localize only the display.
  theme.bookingDateParts = function (value) {
    var parts = String(value || '').split(' ');
    var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[2]);
    var day = Number(parts[3]);
    var year = Number(parts[4]) || new Date().getFullYear();
    if (month < 0 || !day) return { weekday: '', dayMonth: String(value || '') };
    var date = new Date(Date.UTC(year, month, day));
    return {
      weekday: new Intl.DateTimeFormat(theme.locale, { weekday: 'long', timeZone: 'UTC' }).format(date),
      dayMonth: new Intl.DateTimeFormat(theme.locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)
    };
  };
})();
