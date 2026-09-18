const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = ['en', 'fr', 'de', 'it', 'es', 'pt', 'th', 'ru', 'zh', 'ar'];
const DEFAULT_LOCALE = 'en';
const RTL_LOCALES = ['ar'];
const SITE_URL = 'https://construction.pages.dev';

const PAGES = [
  { slug: 'index', file: 'index.html', path: '' },
  { slug: 'construction', file: 'construction.html', path: 'construction' },
  { slug: 'renovation', file: 'renovation.html', path: 'renovation' },
  { slug: 'domotics', file: 'domotics.html', path: 'domotics' },
  { slug: 'contact', file: 'contact.html', path: 'contact' },
];

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function readPartial(dir, name) { return fs.readFileSync(path.join(dir, name), 'utf8'); }

function render(tpl, dict) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    console.warn(`  ! missing key: ${key}`);
    return '';
  });
}

function localeHref(locale, pagePath) {
  const base = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${base}/${pagePath}`.replace(/\/+$/, '') || '/';
}

function buildLangSwitcher(currentLocale, pagePath) {
  return LOCALES.map((loc) => {
    const href = localeHref(loc, pagePath);
    const active = loc === currentLocale ? ' aria-current="true" class="active"' : '';
    return `<a href="${href}" hreflang="${loc}"${active}>${loc.toUpperCase()}</a>`;
  }).join('\n');
}

function buildHreflangTags(pagePath) {
  return LOCALES.map((loc) => {
    const href = `${SITE_URL}${localeHref(loc, pagePath)}`;
    return `<link rel="alternate" hreflang="${loc}" href="${href}" />`;
  }).join('\n    ') + `\n    <link rel="alternate" hreflang="x-default" href="${SITE_URL}${localeHref(DEFAULT_LOCALE, pagePath)}" />`;
}

function copyStatic(DIST, assetsDirName) {
  const assetsSrc = path.join(ROOT, assetsDirName);
  const assetsDest = path.join(DIST, 'assets');
  fs.rmSync(assetsDest, { recursive: true, force: true });
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
  for (const f of ['robots.txt', 'CNAME', '_redirects', '_headers']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DIST, f));
  }
}

/**
 * @param {object} opts
 * @param {string} opts.distDirName  e.g. 'dist' or 'dist-v2'
 * @param {string} opts.templatesDirName e.g. 'templates' or 'templates-v2'
 * @param {string} opts.partialsDirName  e.g. 'partials' or 'partials-v2'
 * @param {string} opts.assetsDirName    e.g. 'assets' or 'assets-v2'
 * @param {string} opts.themeCss    e.g. '/assets/css/style.css'
 * @param {string} opts.themeColor  e.g. '#b5652e'
 * @param {string} opts.themeFonts  full <link> tag(s) for fonts
 */
function build(opts) {
  const DIST = path.join(ROOT, opts.distDirName);
  const templatesDir = path.join(SRC, opts.templatesDirName);
  const partialsDir = path.join(SRC, opts.partialsDirName);

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const header = readPartial(partialsDir, 'header.html');
  const footer = readPartial(partialsDir, 'footer.html');
  const sitemapUrls = [];

  // cache-bust CSS/JS on every build so browsers/CDN never serve stale assets after a deploy
  const assetVersion = crypto.createHash('md5').update(String(Date.now())).digest('hex').slice(0, 10);

  const enDict = loadJSON(path.join(SRC, 'i18n', 'en.json'));

  for (const locale of LOCALES) {
    const raw = loadJSON(path.join(SRC, 'i18n', `${locale}.json`));
    const dict = { ...enDict, ...raw };
    const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

    for (const page of PAGES) {
      const tplPath = path.join(templatesDir, page.file);
      if (!fs.existsSync(tplPath)) continue;
      const rawTpl = fs.readFileSync(tplPath, 'utf8');

      const metaMap = {
        index: ['meta.home.title', 'meta.home.description'],
        construction: ['page.construction.title', 'page.construction.desc'],
        renovation: ['page.renovation.title', 'page.renovation.desc'],
        domotics: ['page.domotics.title', 'page.domotics.desc'],
        contact: ['contact.title', 'contact.intro'],
      };
      const [titleKey, descKey] = metaMap[page.slug] || metaMap.index;

      const ctx = {
        ...dict,
        LOCALE: locale,
        LOCALE_UPPER: locale.toUpperCase(),
        META_TITLE: `${dict[titleKey]} | ${dict['site.name']}`,
        META_DESC: dict[descKey],
        THEME_CSS: opts.themeCss + '?v=' + assetVersion,
        THEME_COLOR: opts.themeColor,
        THEME_FONTS: opts.themeFonts,
        ASSET_VERSION: assetVersion,
        DIR: dir,
        SITE_URL,
        PAGE_PATH: page.path,
        CANONICAL: `${SITE_URL}${localeHref(locale, page.path)}`,
        HREFLANG_TAGS: buildHreflangTags(page.path),
        LANG_SWITCHER: buildLangSwitcher(locale, page.path),
        HOME_HREF: localeHref(locale, ''),
        CONSTRUCTION_HREF: localeHref(locale, 'construction'),
        RENOVATION_HREF: localeHref(locale, 'renovation'),
        DOMOTICS_HREF: localeHref(locale, 'domotics'),
        CONTACT_HREF: localeHref(locale, 'contact'),
        YEAR: String(new Date().getFullYear()),
      };

      let body = render(rawTpl, ctx);
      let full = render(header, ctx) + body + render(footer, ctx);
      full = render(full, ctx);

      const outDir = locale === DEFAULT_LOCALE
        ? path.join(DIST, page.path)
        : path.join(DIST, locale, page.path);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), full, 'utf8');

      sitemapUrls.push(ctx.CANONICAL);
      console.log(`built [${locale}] ${page.path || '/'}`);
    }
  }

  copyStatic(DIST, opts.assetsDirName);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`\nDone. ${sitemapUrls.length} pages built into ${opts.distDirName}/`);
}

module.exports = { build, ROOT, SRC };
