const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const themeRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(themeRoot, file), 'utf8');
const catalog = locale => JSON.parse(read('locales/' + locale + '.json')
  .replace(/^\s*\/\*[\s\S]*?\*\//, '')).helios;

test('both storefront catalogs cover the same keys and interpolation variables', () => {
  const en = catalog('en.default');
  const vi = catalog('vi');
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());
  const placeholders = value => [...String(value).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map(match => match[1]).sort();
  for (const key of Object.keys(en)) {
    if (typeof en[key] === 'object') {
      for (const plural of ['one', 'other']) {
        assert.deepEqual(placeholders(vi[key][plural]), placeholders(en[key][plural]), key);
      }
    } else {
      assert.ok(vi[key], key);
      assert.deepEqual(placeholders(vi[key]), placeholders(en[key]), key);
    }
  }
  // Languages without a custom translation have explicit English fallbacks.
  for (const file of fs.readdirSync(path.join(themeRoot, 'locales'))) {
    if (!file.endsWith('.json')) continue;
    assert.deepEqual(Object.keys(catalog(file.slice(0, -5))).sort(), Object.keys(en).sort(), file);
  }
});

test('custom JavaScript translations exist in both catalogs and are exposed in the head', () => {
  const en = catalog('en.default');
  const vi = catalog('vi');
  const snippet = read('snippets/helios-i18n.liquid');
  const exposed = new Set([...snippet.matchAll(/'helios\.([^']+)'/g)].map(match => match[1]));
  for (const folder of ['assets', 'snippets', 'sections', 'blocks']) {
    for (const file of fs.readdirSync(path.join(themeRoot, folder))) {
      if (!/\.(?:js|liquid)$/.test(file)) continue;
      const source = read(folder + '/' + file);
      for (const match of source.matchAll(/window\.theme\.t\('([^']+)'/g)) {
        assert.ok(en[match[1]], folder + '/' + file + ': ' + match[1]);
        assert.ok(vi[match[1]], match[1]);
        assert.ok(exposed.has(match[1]), 'Not exposed to JavaScript: ' + match[1]);
      }
    }
  }
  for (const key of exposed) assert.ok(en[key] && vi[key], key);
});

test('JavaScript uses the active language and escapes values inside translated HTML', () => {
  for (const locale of ['en', 'vi']) {
    const context = { window: { theme: { strings: { helios: catalog(locale === 'en' ? 'en.default' : 'vi') } } },
      document: { documentElement: { lang: locale } } };
    vm.runInNewContext(read('assets/helios-i18n.js'), context);
    const theme = context.window.theme;
    assert.equal(theme.locale, locale);
    assert.equal(theme.t('buy_now'), locale === 'en' ? 'Buy now' : 'Mua ngay');
    assert.match(theme.t('tier_progress_html', { amount: '100', tier: '<img src=x onerror=alert(1)>' }), /&lt;img/);
    assert.equal(theme.t('nonexistent'), '');
    const date = theme.bookingDateParts('Thu 2 Nov 02 2026');
    assert.match(date.weekday, locale === 'en' ? /Monday/ : /Thứ Hai/);
    assert.match(date.dayMonth, locale === 'en' ? /November/ : /11/);
  }
});

test('localized storefront assets parse as JavaScript', () => {
  for (const file of ['helios-i18n.js', 'booking-script.js', 'free-gift.js', 'quiz.js',
    'theme.js', 'tier-checkout-button.js', 'tier-draft-order.js', 'warrior-landing.js',
    'magazine-flipbook-webgl.js', 'shoppable-tiktok-stories.js']) {
    execFileSync(process.execPath, ['--check', path.join(themeRoot, 'assets', file)], { stdio: 'pipe' });
  }
});
