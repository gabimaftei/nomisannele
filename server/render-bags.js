/* ═══════════════════════════════════════════════════════════════
   Paginile generate: genți, blog, /en/, sitemap, robots
   ───────────────────────────────────────────────────────────────
   buildSiteFiles() întoarce TOATE fișierele HTML/XML/TXT pe care le scrie
   publicarea (și tools/build-site.mjs): prima pagină RO și EN, câte o
   pagină pentru fiecare geantă și articol, în ambele limbi când există text
   englezesc, sitemap.xml și robots.txt. Aceeași funcție pentru server și
   pentru unealta locală, deci rezultatul e același.

   Adresa site-ului vine DOAR din <link rel="canonical"> din index.html.
   Orice text venit din panou trece prin esc() (HTML) sau jsonLd() (JSON-LD).
   Fără stiluri inline, fără scripturi inline, fără prețuri și fără
   recenzii: gențile se vând la mesaj, prețul se stabilește în DM.
   ═══════════════════════════════════════════════════════════════ */
import {
  esc, TXT, SITE_NAME, BRAND, IG_DM, IG_PROFILE, fmt, hasEn, postHasEn, bagPath, postPath, photoPath,
  dateText, truncate, jsonLd, pictureHtml, langSwitchHtml, cardHtml, siteInfo, renderIndex, renderIndexEn,
  renderNotFound, renderRedirect, renderSitemap, renderRobots, sortPosts,
} from './render.js';

const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'";

/* Pagini generate: se pot șterge fără grijă când nu mai sunt în rezultat. */
export const GENERATED_PAGE = /^(?:en\/)?(?:genti|blog)\/(?:[a-z0-9-]+\/)?index\.html$/;

const label = (content, lang, key, fallback) => (content[lang] && content[lang][key]) || (content.ro && content.ro[key]) || fallback;

/* ─────────────── cadrul comun: <head>, meniu, subsol ─────────────── */

function headHtml(c, p) {
  const { lang, site, ver } = c;
  const url = site + p.path;
  const alts = (p.alts || []).map((a) => `<link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(site + a.path)}">`);
  const image = p.image ? [
    `<meta property="og:image" content="${esc(p.image)}">`,
    `<meta property="og:image:alt" content="${esc(p.imageAlt || '')}">`,
    `<meta name="twitter:image" content="${esc(p.image)}">`,
  ] : [];
  const altLocale = (p.alts || []).some((a) => a.hreflang === (lang === 'en' ? 'ro' : 'en'))
    ? [`<meta property="og:locale:alternate" content="${lang === 'en' ? 'ro_RO' : 'en_US'}">`] : [];
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    ...alts,
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta name="theme-color" content="#1e3050">',
    '<meta name="color-scheme" content="light">',
    `<meta property="og:type" content="${p.ogType || 'website'}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ro_RO'}">`,
    ...altLocale,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    ...image,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(p.title)}">`,
    `<meta name="twitter:description" content="${esc(p.description)}">`,
    c.iconLink,
    '<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/jost-300-latin.woff2" crossorigin>',
    '<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-400-latin.woff2" crossorigin>',
    '<link rel="stylesheet" href="/assets/css/fonts.css">',
    `<link rel="stylesheet" href="/assets/css/styles.css?v=${esc(ver)}">`,
    ...(p.jsonld || []).map(jsonLd),
  ].join('\n');
}

function headerHtml(c, switchHtml) {
  const { lang, content } = c;
  const t = TXT[lang];
  const home = lang === 'en' ? '/en/' : '/';
  const L = (k, f) => esc(label(content, lang, k, f));
  const blog = c.blogHref ? `\n      <a href="${esc(c.blogHref)}" data-blog>${esc(t.blog)}</a>` : '';
  return `<header class="nav" id="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="${home}#top">
      <span class="nav__mark">${SITE_NAME}</span>
      <span class="nav__est">est. 2025</span>
    </a>
    <div class="nav__actions">
      ${c.igLink}
      <button class="nav__burger" type="button" aria-label="${esc(t.menu)}" aria-expanded="false" aria-controls="nav-links">
        <span></span><span></span>
      </button>
    </div>
    <nav class="nav__links" id="nav-links" aria-label="${esc(t.mainNav)}">
      <a href="${home}#collection">${L('nav.collection', t.bags)}</a>
      <a href="${home}#story">${L('nav.story', '')}</a>
      <a href="${home}#process">${L('nav.process', '')}</a>
      <a href="${home}#contact">${L('nav.contact', '')}</a>${blog}
      ${switchHtml}
    </nav>
  </div>
</header>`;
}

function footerHtml(c) {
  const { lang, content } = c;
  const t = TXT[lang];
  const home = lang === 'en' ? '/en/' : '/';
  const L = (k, f) => esc(label(content, lang, k, f));
  const blog = c.blogHref ? `\n      <a href="${esc(c.blogHref)}" data-blog>${esc(t.blog)}</a>` : '';
  return `<footer class="footer">
  <div class="footer__inner">
    <div>
      <p class="footer__mark">${SITE_NAME}</p>
      <p class="footer__tag">${L('footer.tag', '')}</p>
    </div>
    <nav class="footer__links" aria-label="${esc(t.footNav)}">
      <a href="${home}#collection">${L('nav.collection', t.bags)}</a>
      <a href="${home}#story">${L('nav.story', '')}</a>
      <a href="${home}#process">${L('nav.process', '')}</a>${blog}
      <a href="https://www.instagram.com/nomis.annele/" target="_blank" rel="noopener noreferrer">Instagram</a>
    </nav>
    <p class="footer__copy">© <span id="year"></span> ${SITE_NAME}</p>
  </div>
</footer>`;
}

function pageHtml(c, p, mainHtml) {
  const t = TXT[c.lang];
  return `<!DOCTYPE html>
<html lang="${c.lang}">
<head>
${headHtml(c, p)}
</head>
<body>

<a class="skip-link" href="#main">${esc(t.skipContent)}</a>

${headerHtml(c, p.switchHtml)}

${mainHtml}

${footerHtml(c)}

<script src="/assets/js/common.js?v=${esc(c.ver)}"></script>
</body>
</html>
`;
}

function crumbsHtml(c, items) {
  const lis = items.map((it, i) => (i === items.length - 1
    ? `<li aria-current="page">${esc(it.name)}</li>`
    : `<li><a href="${esc(it.path)}">${esc(it.name)}</a></li>`));
  return `<nav class="crumbs" aria-label="${esc(TXT[c.lang].crumbs)}"><ol>${lis.join('')}</ol></nav>`;
}

function crumbsLd(c, items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: c.site + it.path })),
  };
}

/* ─────────────── pagina unei genți ─────────────── */

function bagPage(p, lang, c) {
  const t = TXT[lang];
  const loc = lang === 'en' ? p.en : p.ro;
  const kind = t.kinds[p.kind] || '';
  const path = bagPath(p.id, lang);
  const roPath = bagPath(p.id, 'ro');
  const enPath = hasEn(p) ? bagPath(p.id, 'en') : null;
  const home = lang === 'en' ? '/en/' : '/';
  const pics = [];
  for (let n = 1; n <= p.photos; n++) {
    pics.push(pictureHtml({
      src: photoPath(p.id, n), webp: c.hasFile(photoPath(p.id, n, 'webp').slice(1)),
      alt: fmt(t.photoAlt, { name: p.name, kind, n, total: p.photos }), width: 800, height: 1000, eager: n === 1,
    }));
  }
  const images = [];
  for (let n = 1; n <= p.photos; n++) images.push(c.site + photoPath(p.id, n));

  const rows = [[t.specPockets, loc.pockets], [t.specClosure, loc.closure]];
  if (p.madeFrom) rows.push([t.specMaterial, p.madeFrom === 1 ? t.madeFromOne : fmt(t.madeFrom, { n: p.madeFrom })]);
  const specs = rows.filter((r) => r[1]).map((r) => `<li><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></li>`).join('');
  const d = p.dims || {};
  const dims = d.h == null ? '' : `<div class="pm__dims">${[[t.dimH, d.h], [t.dimW, d.w], [t.dimD, d.d]]
    .map((x) => `<div><span class="k">${esc(x[0])}</span><span class="v">${esc(x[1])} cm</span></div>`).join('')}</div>`;

  const cta = p.sold
    ? `<span class="btn btn--primary btn--lg btn--full is-disabled" role="link" aria-disabled="true">${esc(t.soldTitle)}</span>\n        <p class="pm__note">${esc(t.soldNote)}</p>`
    : `<a class="btn btn--primary btn--lg btn--full" href="${IG_DM}" target="_blank" rel="noopener noreferrer">${esc(t.order)}</a>\n        <p class="pm__note">${esc(fmt(t.orderNote, { name: p.name }))}</p>`;

  /* vecinii: aceeași limbă, doar genți care au pagină în ea */
  const list = c.products.filter((x) => lang === 'ro' || hasEn(x));
  const i = list.findIndex((x) => x.id === p.id);
  const near = (x, rel) => `<a href="${esc(bagPath(x.id, lang))}" rel="${rel}"><span class="k">${esc(rel === 'prev' ? t.prev : t.next)}</span><span class="v">${esc(x.name)}</span></a>`;
  const neighbours = list.length > 1
    ? `${near(list[(i + list.length - 1) % list.length], 'prev')}${near(list[(i + 1) % list.length], 'next')}` : '';

  const eyebrow = [kind.charAt(0).toUpperCase() + kind.slice(1), p.sold ? t.sold : ''].filter(Boolean).join(' · ');
  const crumbs = [{ name: t.home, path: home }, { name: t.bags, path: `${home}#collection` }, { name: p.name, path }];

  const main = `<main id="main" class="page">
  ${crumbsHtml(c, crumbs)}
  <article class="bp">
    <div class="bp__grid">
      <div class="bp__photos">
        ${pics.join('\n        ')}
      </div>
      <div class="bp__info">
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h1 class="pm__title">${esc(p.name)}</h1>
        <p class="bp__tagline">${esc(loc.tagline)}</p>
        <p class="pm__desc">${esc(loc.description)}</p>
        ${specs ? `<ul class="pm__specs">${specs}</ul>` : ''}
        ${dims}
        ${cta}
      </div>
    </div>
  </article>
  <nav class="bp__nav" aria-label="${esc(t.moreBags)}">
    ${neighbours}
    <a href="${home}#collection"><span class="k">${esc(t.moreBags)}</span><span class="v">${esc(t.allBags)}</span></a>
  </nav>
</main>`;

  const title = fmt(t.titleBag, { name: p.name, kind });
  const description = truncate(`${p.name} — ${loc.description}`, 158);
  const product = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, description: loc.description, image: images, sku: p.id, url: c.site + path,
    brand: { '@type': 'Brand', name: BRAND },
    material: lang === 'en' ? 'Upcycled denim' : 'Denim reutilizat',
    inLanguage: lang,
  };
  if (d.h != null) {
    product.height = { '@type': 'QuantitativeValue', value: d.h, unitCode: 'CMT' };
    product.width = { '@type': 'QuantitativeValue', value: d.w, unitCode: 'CMT' };
    product.depth = { '@type': 'QuantitativeValue', value: d.d, unitCode: 'CMT' };
    product.size = `${d.h} × ${d.w} × ${d.d} cm`;
  }
  const alts = enPath ? [{ hreflang: 'ro', path: roPath }, { hreflang: 'en', path: enPath }, { hreflang: 'x-default', path: roPath }] : [];
  return pageHtml({ ...c, lang }, {
    path, title, description, alts, image: images[0], ogType: 'product',
    imageAlt: fmt(t.photoAlt, { name: p.name, kind, n: 1, total: p.photos }),
    jsonld: [product, crumbsLd(c, crumbs)],
    switchHtml: langSwitchHtml(lang, roPath, enPath),
  }, main);
}

/* ─────────────── blog ─────────────── */

function paragraphs(body) {
  return String(body).split(/\n[ \t]*\n/).map((x) => x.trim()).filter(Boolean)
    .map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('\n      ');
}

const firstPara = (body) => String(body).split(/\n[ \t]*\n/).map((x) => x.trim()).find(Boolean) || '';

/* titlul și textul într-o limbă (engleza doar dacă e completă) */
const postLoc = (post, lang) => (lang === 'en' ? post.en : post.ro);
const postImg = (post, n) => `/assets/blog/${post.id}/${n}.jpg`;

function postPage(post, lang, c) {
  const t = TXT[lang];
  const loc = postLoc(post, lang);
  const path = postPath(post.id, lang);
  const roPath = postPath(post.id, 'ro');
  const enPath = postHasEn(post) ? postPath(post.id, 'en') : null;
  const home = lang === 'en' ? '/en/' : '/';
  const blogPath = lang === 'en' ? '/en/blog/' : '/blog/';
  const total = post.photos.length;
  const figs = post.photos.map((ph, i) => `<figure>${pictureHtml({
    src: postImg(post, i + 1), webp: false, width: ph.w, height: ph.h, eager: i === 0,
    alt: fmt(t.photoOf, { title: loc.title, n: i + 1, total }),
  })}</figure>`);
  const crumbs = [{ name: t.home, path: home }, { name: t.blog, path: blogPath }, { name: loc.title, path }];
  const main = `<main id="main" class="page">
  ${crumbsHtml(c, crumbs)}
  <article class="article">
    <header class="article__head">
      <p class="eyebrow">${esc(t.published)} <time datetime="${esc(post.date)}">${esc(dateText(post.date, lang))}</time></p>
      <h1 class="section__title">${esc(loc.title)}</h1>
    </header>
    <div class="article__body">
      ${paragraphs(loc.body)}
    </div>
    <div class="article__photos">
      ${figs.join('\n      ')}
    </div>
    <p class="article__back"><a href="${blogPath}">${esc(t.backBlog)}</a></p>
  </article>
</main>`;
  const org = { '@type': 'Organization', name: BRAND, url: `${c.site}/`, sameAs: [IG_PROFILE] };
  const images = post.photos.map((_, i) => c.site + postImg(post, i + 1));
  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: truncate(loc.title, 110), datePublished: post.date, dateModified: post.date,
    image: images, author: org, publisher: org, inLanguage: lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': c.site + path },
  };
  const alts = enPath ? [{ hreflang: 'ro', path: roPath }, { hreflang: 'en', path: enPath }, { hreflang: 'x-default', path: roPath }] : [];
  return pageHtml({ ...c, lang }, {
    path, title: truncate(`${loc.title} | ${SITE_NAME}`, 70), description: truncate(firstPara(loc.body) || loc.title, 158), alts,
    image: images[0], imageAlt: fmt(t.photoOf, { title: loc.title, n: 1, total }), ogType: 'article',
    jsonld: [article, crumbsLd(c, crumbs)],
    switchHtml: langSwitchHtml(lang, roPath, enPath),
  }, main);
}

function blogIndexPage(posts, lang, c) {
  const t = TXT[lang];
  const home = lang === 'en' ? '/en/' : '/';
  const path = lang === 'en' ? '/en/blog/' : '/blog/';
  const cards = posts.map((post) => {
    const loc = postLoc(post, lang);
    const ph = post.photos[0];
    return `<a class="card" href="${esc(postPath(post.id, lang))}">`
      + `<div class="card__media">${pictureHtml({ src: postImg(post, 1), webp: false, alt: '', width: ph.w, height: ph.h, eager: false })}</div>`
      + `<div class="card__body"><h2 class="card__name">${esc(loc.title)}</h2><p class="card__tagline">${esc(truncate(firstPara(loc.body), 140))}</p>`
      + `<div class="card__meta"><span><time datetime="${esc(post.date)}">${esc(dateText(post.date, lang))}</time></span><span class="card__more">${esc(t.read)}</span></div></div></a>`;
  });
  const crumbs = [{ name: t.home, path: home }, { name: t.blog, path }];
  const main = `<main id="main" class="page">
  ${crumbsHtml(c, crumbs)}
  <div class="section__head">
    <h1 class="section__title">${esc(t.blog)}</h1>
    <p class="section__lede">${esc(t.blogDesc)}</p>
  </div>
  <div class="grid">
    ${cards.join('\n    ')}
  </div>
</main>`;
  const roOk = true;
  const enOk = c.enPosts.length > 0;
  const alts = roOk && enOk ? [{ hreflang: 'ro', path: '/blog/' }, { hreflang: 'en', path: '/en/blog/' }, { hreflang: 'x-default', path: '/blog/' }] : [];
  const first = posts[0];
  return pageHtml({ ...c, lang }, {
    path, title: t.blogTitle, description: t.blogDesc, alts,
    image: c.site + postImg(first, 1), imageAlt: postLoc(first, lang).title,
    jsonld: [crumbsLd(c, crumbs)],
    switchHtml: langSwitchHtml(lang, '/blog/', enOk ? '/en/blog/' : null),
  }, main);
}

/* ─────────────── toate fișierele ─────────────── */

/* hasFile(cale) spune dacă o poză există în repo după commit (fără „/” în
   față); e nevoie ca să nu cerem un .webp care nu există. */
export function buildSiteFiles({ indexHtml, products, content, posts, productsJs, contentJs, hasFile = () => true }) {
  const { site, ver } = siteInfo(indexHtml);
  if (!site) throw new Error('Lipsește adresa canonică din index.html.');
  const sorted = sortPosts(posts);
  const enPosts = sorted.filter(postHasEn);
  const out = new Map();
  const opts = { content, productsJs, contentJs, products, posts: sorted, hasFile };

  const ro = renderIndex(indexHtml, opts);
  out.set('index.html', ro);
  out.set('en/index.html', renderIndexEn(ro, opts));
  out.set('404.html', renderNotFound({ site, ver }));

  const iconLink = (/<link rel="icon"[^>]*>/.exec(indexHtml) || [''])[0];
  const igLink = (/<a class="nav__ig"[\s\S]*?<\/a>/.exec(indexHtml) || [''])[0];
  const base = {
    site, ver, content, products, iconLink, igLink, hasFile, enPosts,
  };
  const ctx = (lang) => ({
    ...base, lang,
    blogHref: (lang === 'en' ? enPosts.length : sorted.length) ? (lang === 'en' ? '/en/blog/' : '/blog/') : null,
  });

  const entries = [];
  const pair = (roPath, enPath) => (enPath
    ? [{ hreflang: 'ro', path: roPath }, { hreflang: 'en', path: enPath }, { hreflang: 'x-default', path: roPath }] : []);
  entries.push({ path: '/', alts: pair('/', '/en/') }, { path: '/en/', alts: pair('/', '/en/') });

  for (const p of products) {
    out.set(`genti/${p.id}/index.html`, bagPage(p, 'ro', { ...ctx('ro') }));
    const en = hasEn(p);
    entries.push({ path: bagPath(p.id, 'ro'), alts: pair(bagPath(p.id, 'ro'), en ? bagPath(p.id, 'en') : null) });
    if (en) {
      out.set(`en/genti/${p.id}/index.html`, bagPage(p, 'en', { ...ctx('en') }));
      entries.push({ path: bagPath(p.id, 'en'), alts: pair(bagPath(p.id, 'ro'), bagPath(p.id, 'en')) });
    }
  }
  out.set('genti/index.html', renderRedirect({ site, ver, lang: 'ro', to: '/#collection', canonical: '/' }));
  out.set('en/genti/index.html', renderRedirect({ site, ver, lang: 'en', to: '/en/#collection', canonical: '/en/' }));

  if (sorted.length) {
    out.set('blog/index.html', blogIndexPage(sorted, 'ro', ctx('ro')));
    entries.push({ path: '/blog/', lastmod: sorted[0].date, alts: pair('/blog/', enPosts.length ? '/en/blog/' : null) });
  } else out.set('blog/index.html', renderRedirect({ site, ver, lang: 'ro', to: '/', canonical: '/' }));
  if (enPosts.length) {
    out.set('en/blog/index.html', blogIndexPage(enPosts, 'en', ctx('en')));
    entries.push({ path: '/en/blog/', lastmod: enPosts[0].date, alts: pair('/blog/', '/en/blog/') });
  } else out.set('en/blog/index.html', renderRedirect({ site, ver, lang: 'en', to: '/en/', canonical: '/en/' }));

  for (const post of sorted) {
    out.set(`blog/${post.id}/index.html`, postPage(post, 'ro', ctx('ro')));
    const en = postHasEn(post);
    entries.push({ path: postPath(post.id, 'ro'), lastmod: post.date, alts: pair(postPath(post.id, 'ro'), en ? postPath(post.id, 'en') : null) });
    if (en) {
      out.set(`en/blog/${post.id}/index.html`, postPage(post, 'en', ctx('en')));
      entries.push({ path: postPath(post.id, 'en'), lastmod: post.date, alts: pair(postPath(post.id, 'ro'), postPath(post.id, 'en')) });
    }
  }

  out.set('sitemap.xml', renderSitemap({ site, entries }));
  out.set('robots.txt', renderRobots({ site }));
  return out;
}

/* Paginile generate care există în repo dar nu mai sunt în rezultat
   (geantă sau articol șters, articol rămas fără engleză): se șterg. */
export function stalePages(existingPaths, built) {
  const stale = [];
  for (const path of existingPaths) if (GENERATED_PAGE.test(path) && !built.has(path)) stale.push(path);
  return stale;
}
