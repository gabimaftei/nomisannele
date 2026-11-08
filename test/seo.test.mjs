/* Teste pentru paginile generate (SEO): genți, blog, /en/, sitemap, robots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseConsts, renderProductsJs, renderContentJs, renderIndex, sortPosts } from '../server/render.js';
import { buildSiteFiles, stalePages } from '../server/render-bags.js';
import { checkProducts, checkPosts, checkImages, buildEntries } from '../server/api.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SHA = 'a'.repeat(40);
const SITE = 'https://gabimaftei.github.io/nomisannele';

const { PRODUCTS: REAL } = parseConsts(read('assets/js/products.js'), ['PRODUCTS']);
const { CONTENT } = parseConsts(read('assets/js/content.js'), ['CONTENT']);
const INDEX = read('index.html');

const bag = (over = {}) => ({
  id: 'xss', name: 'Test <script>alert(1)</script> & "co"', photos: 2, kind: 'rucsac', sold: false,
  dims: { h: 30, w: 20, d: 10 }, madeFrom: 3, tint: 'denim', badge: null,
  ro: { tagline: 'Subtitlu <b>', description: 'Descriere cu <img src=x onerror=alert(1)> și ș ț', pockets: '2 buzunare', closure: 'Fermoar' },
  en: { tagline: 'Tagline', description: 'English description', pockets: '2 pockets', closure: 'Zip' },
  ...over,
});
const post = (over = {}) => ({
  id: 'primul', date: '2026-03-04', photos: [{ w: 1200, h: 800 }, { w: 800, h: 1200 }],
  ro: { title: 'Titlu <script>alert(2)</script>', body: 'Primul paragraf <i>x</i>.\n\nAl doilea & ultimul.\nRând nou.' },
  en: { title: 'English title', body: 'First paragraph.\n\nSecond one.' },
  ...over,
});

function build({ products = checkProducts([...REAL, bag()]), posts = [], content = CONTENT, indexHtml = INDEX, hasFile } = {}) {
  const productsJs = renderProductsJs(products);
  const contentJs = renderContentJs(content);
  return buildSiteFiles({ indexHtml, products, content, posts: sortPosts(posts), productsJs, contentJs, hasFile });
}

/* etichetele din HTML, cu valorile atributelor golite: așa „onerror=” dintr-un text
   escapat nu se confundă cu un atribut real */
const bareTags = (html) => (html.match(/<[a-z][^>"']*(?:"[^"]*"|'[^']*'|[^>"'])*>/gi) || []).map((t) => t.replace(/"[^"]*"/g, '""'));
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g)].map((m) => JSON.parse(m[1]));
const attr = (html, re) => (re.exec(html) || [])[1];
const canonical = (html) => attr(html, /<link rel="canonical" href="([^"]+)"/);
const hreflangs = (html) => Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
const urlToFile = (u) => {
  const p = u.slice(SITE.length);
  return (p.endsWith('/') ? p + 'index.html' : p).replace(/^\//, '');
};

/* ───── pagina unei genți ───── */

test('pagina genții: titlu, descriere, canonical, hreflang reciproc, OG, un singur h1', () => {
  const pages = build();
  const ro = pages.get('genti/roz/index.html');
  const en = pages.get('en/genti/roz/index.html');
  assert.match(ro, /<html lang="ro">/);
  assert.match(en, /<html lang="en">/);
  assert.equal(canonical(ro), `${SITE}/genti/roz/`);
  assert.equal(canonical(en), `${SITE}/en/genti/roz/`);
  for (const html of [ro, en]) {
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.deepEqual(hreflangs(html), { ro: `${SITE}/genti/roz/`, en: `${SITE}/en/genti/roz/`, 'x-default': `${SITE}/genti/roz/` });
    assert.match(html, /<meta property="og:image" content="https:\/\/[^"]+\/assets\/images\/roz-1\.jpg">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/[^"]+roz-1\.jpg">/);
    assert.match(html, /<meta property="og:title" content="[^"]+">/);
    assert.match(html, /href="https:\/\/ig\.me\/m\/nomis\.annele"/);
    assert.match(html, /<nav class="crumbs"/);
    assert.match(html, /<img [^>]*width="800" height="1000"/);
  }
  /* titluri unice între genți */
  const titles = new Set(), descs = new Set();
  for (const p of checkProducts([...REAL, bag()])) {
    const h = pages.get(`genti/${p.id}/index.html`);
    titles.add(attr(h, /<title>([^<]+)<\/title>/));
    descs.add(attr(h, /<meta name="description" content="([^"]+)"/));
  }
  assert.equal(titles.size, REAL.length + 1);
  assert.equal(descs.size, REAL.length + 1);
  /* perechea: comutatorul duce la cealaltă limbă */
  assert.match(ro, /<a href="\/en\/genti\/roz\/" hreflang="en" lang="en">EN<\/a>/);
  assert.match(en, /<a href="\/genti\/roz\/" hreflang="ro" lang="ro">RO<\/a>/);
});

test('pagina genții: JSON-LD Product și BreadcrumbList, fără preț, oferte sau recenzii', () => {
  const pages = build();
  for (const file of ['genti/roz/index.html', 'en/genti/roz/index.html']) {
    const html = pages.get(file);
    const [product, crumbs] = ldOf(html);
    assert.equal(product['@type'], 'Product');
    assert.equal(product.sku, 'roz');
    assert.equal(product.brand.name, 'Nomis Annele');
    assert.ok(product.name && product.description && product.url.startsWith(SITE));
    assert.ok(Array.isArray(product.image) && product.image.length === 2 && product.image.every((u) => u.startsWith(SITE)));
    assert.ok(product.material);
    assert.ok(product.size && product.height.value > 0 && product.depth.unitCode === 'CMT');
    assert.equal(crumbs['@type'], 'BreadcrumbList');
    assert.ok(crumbs.itemListElement.length >= 3);
    assert.deepEqual(crumbs.itemListElement.map((x) => x.position), crumbs.itemListElement.map((_, i) => i + 1));
  }
  for (const [file, html] of build({ posts: [post()] })) {
    if (!file.endsWith('.html')) continue;
    assert.ok(!/"(?:offers|price|priceCurrency|aggregateRating|review)"/i.test(html), `${file}: fără offers/price/aggregateRating/review`);
    assert.ok(!/itemprop=|itemtype=/.test(html), file);
  }
});

test('pagina genții: vândută, diacritice, poze cu alt descriptiv, vecini', () => {
  const sold = checkProducts([{ ...REAL[0], sold: true }, ...REAL.slice(1)]);
  const pages = build({ products: sold });
  const html = pages.get(`genti/${REAL[0].id}/index.html`);
  assert.match(html, /is-disabled/);
  assert.match(html, /Geanta asta și-a găsit deja casa/);
  assert.ok(!/ş|ţ|Ş|Ţ/.test(html), 'doar ș și ț cu virgulă');
  assert.match(html, /<img [^>]*alt="[^"]{12,}"/);
  assert.match(html, /rel="prev"/);
  assert.match(html, /rel="next"/);
  assert.match(html, /href="\/#collection"/);
});

test('geantă fără engleză: nicio pagină EN, hreflang nu o pomenește, nu e în sitemap EN', () => {
  const noEn = bag({ id: 'fara-en', en: { tagline: '', description: '', pockets: '', closure: '' } });
  const pages = build({ products: checkProducts([...REAL, noEn]) });
  assert.ok(pages.has('genti/fara-en/index.html'));
  assert.ok(!pages.has('en/genti/fara-en/index.html'));
  const ro = pages.get('genti/fara-en/index.html');
  assert.deepEqual(hreflangs(ro), {});
  assert.ok(!/hreflang="en"/.test(ro));
  const sm = pages.get('sitemap.xml');
  assert.ok(!sm.includes('/en/genti/fara-en/'));
  assert.ok(sm.includes('/genti/fara-en/'));
  /* geanta vecină din EN nu trimite la ea */
  assert.ok(!pages.get('en/genti/roz/index.html').includes('fara-en'));
});

/* ───── escapare ───── */

test('escapare: nimic din date nu ajunge ca HTML sau ca JSON-LD brut', () => {
  const pages = build({ posts: [post()] });
  for (const [file, html] of pages) {
    if (!file.endsWith('.html')) continue;
    assert.ok(!/<script>alert|<img src=x|<b>|<i>x/.test(html), `${file}: HTML necurat`);
    assert.ok(!bareTags(html).some((t) => /\son[a-z]+=/i.test(t)), `${file}: handler injectat`);
  }
  const html = pages.get('genti/xss/index.html');
  assert.ok(html.includes('Test &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;co&quot;'));
  const [product] = ldOf(html);
  assert.equal(product.name, bag().name, 'JSON-LD păstrează textul exact, doar fără < > în sursă');
  /* într-un bloc JSON-LD nu apare niciun „</script” în afară de închidere */
  for (const block of html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)) {
    assert.equal(block.slice(10).split('</script').length, 2);
  }
  const art = pages.get('blog/primul/index.html');
  assert.ok(art.includes('Titlu &lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(art.includes('Primul paragraf &lt;i&gt;x&lt;/i&gt;.'));
});

/* ───── prima pagină ───── */

test('/ și /en/: titlu, descriere, canonical, hreflang reciproc, Organization și WebSite', () => {
  const pages = build();
  const ro = pages.get('index.html');
  const en = pages.get('en/index.html');
  assert.equal(canonical(ro), `${SITE}/`);
  assert.equal(canonical(en), `${SITE}/en/`);
  assert.match(ro, /<html lang="ro">/);
  assert.match(en, /<html lang="en">/);
  assert.equal(attr(ro, /<title>([^<]+)<\/title>/), CONTENT.ro['seo.title']);
  assert.equal(attr(en, /<title>([^<]+)<\/title>/), CONTENT.en['seo.title']);
  assert.equal(attr(en, /<meta name="description" content="([^"]+)"/), CONTENT.en['seo.description']);
  assert.equal(attr(ro, /<meta property="og:title" content="([^"]+)"/), CONTENT.ro['seo.title']);
  assert.equal(attr(en, /<meta property="og:description" content="([^"]+)"/), CONTENT.en['seo.description']);
  for (const html of [ro, en]) {
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.deepEqual(hreflangs(html), { ro: `${SITE}/`, en: `${SITE}/en/`, 'x-default': `${SITE}/` });
    const [g] = ldOf(html);
    const types = g['@graph'].map((x) => x['@type']);
    assert.deepEqual(types, ['Organization', 'WebSite']);
    const org = g['@graph'][0];
    assert.equal(org.name, 'Nomis Annele');
    assert.deepEqual(org.sameAs, ['https://www.instagram.com/nomis.annele']);
    assert.ok(!/telephone|address|openingHours/.test(JSON.stringify(g)));
    /* carduri ca linkuri reale */
    assert.ok(REAL.every((p) => html.includes(`href="${html === en ? '/en' : ''}/genti/${p.id}/"`)));
  }
  assert.ok(en.includes(CONTENT.en['hero.title2']));
  assert.ok(en.includes('href="/assets/css/styles.css?v='), 'căi absolute pe /en/');
  assert.ok(!/(?:href|src)="assets\//.test(en));
  assert.match(en, /<a href="\/" hreflang="ro" lang="ro">RO<\/a>/);
  assert.match(ro, /<a href="\/en\/" hreflang="en" lang="en">EN<\/a>/);
  /* textul vizibil RO e cel din CONTENT */
  assert.ok(ro.includes(CONTENT.ro['hero.lede']));
  assert.ok(!/<[^>]+\sstyle=/.test(ro) && !/<[^>]+\sstyle=/.test(en));
});

test('domeniul vine dintr-un singur loc: canonical din index.html', () => {
  const other = INDEX.replace(/(<link rel="canonical" href=")[^"]*(")/, '$1https://exemplu.ro/$2');
  const pages = build({ indexHtml: other, posts: [post()] });
  for (const [file, text] of pages) {
    if (!/\.(html|xml|txt)$/.test(file) || file === '404.html') continue;
    assert.ok(!text.includes('gabimaftei.github.io'), `${file} mai conține domeniul vechi`);
  }
  assert.match(pages.get('robots.txt'), /Sitemap: https:\/\/exemplu\.ro\/sitemap\.xml/);
  assert.equal(canonical(pages.get('genti/roz/index.html')), 'https://exemplu.ro/genti/roz/');
});

/* ───── blog ───── */

test('blog: index, articole RO/EN, Article JSON-LD, breadcrumb, hreflang, link Blog doar când există articole', () => {
  const none = build();
  assert.ok(!none.get('index.html').includes('data-blog'));
  assert.match(none.get('blog/index.html'), /noindex/);
  assert.ok(!none.get('sitemap.xml').includes('/blog/'));

  const pages = build({ posts: [post(), post({ id: 'doar-ro', date: '2026-04-01', en: { title: '', body: '' } })] });
  assert.ok(pages.get('index.html').includes('<a href="/blog/" data-blog>Blog</a>'));
  assert.ok(pages.get('en/index.html').includes('<a href="/en/blog/" data-blog>Blog</a>'));
  assert.ok(pages.get('genti/roz/index.html').includes('data-blog'));

  const ro = pages.get('blog/primul/index.html');
  const en = pages.get('en/blog/primul/index.html');
  assert.equal(canonical(ro), `${SITE}/blog/primul/`);
  assert.equal(canonical(en), `${SITE}/en/blog/primul/`);
  assert.deepEqual(hreflangs(ro), { ro: `${SITE}/blog/primul/`, en: `${SITE}/en/blog/primul/`, 'x-default': `${SITE}/blog/primul/` });
  assert.deepEqual(hreflangs(en), hreflangs(ro));
  const [article, crumbs] = ldOf(ro);
  assert.equal(article['@type'], 'Article');
  assert.equal(article.datePublished, '2026-03-04');
  assert.equal(article.author.name, 'Nomis Annele');
  assert.equal(article.publisher['@type'], 'Organization');
  assert.equal(article.image.length, 2);
  assert.ok(article.headline.length <= 110);
  assert.equal(crumbs.itemListElement.length, 3);
  assert.equal((ro.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(ro.includes('<p>Al doilea &amp; ultimul.<br>Rând nou.</p>'));
  assert.match(ro, /<img [^>]*width="1200" height="800"/);
  assert.match(ro, /<time datetime="2026-03-04">4 martie 2026<\/time>/);
  assert.match(en, /<time datetime="2026-03-04">March 4, 2026<\/time>/);

  /* articol fără engleză: fără pagină EN, fără hreflang */
  assert.ok(pages.has('blog/doar-ro/index.html'));
  assert.ok(!pages.has('en/blog/doar-ro/index.html'));
  assert.deepEqual(hreflangs(pages.get('blog/doar-ro/index.html')), {});
  /* indexul EN listează doar articolele traduse; cel RO le listează pe toate */
  assert.ok(pages.get('blog/index.html').includes('/blog/doar-ro/'));
  assert.ok(!pages.get('en/blog/index.html').includes('doar-ro'));
  for (const f of ['blog/index.html', 'en/blog/index.html']) assert.equal(canonical(pages.get(f)), `${SITE}/${f.replace('index.html', '')}`);
  assert.ok(!/"(?:offers|price)"/.test(ro));
});

/* ───── sitemap și robots ───── */

/* verificare simplă de XML bine format: etichete închise corect, fără „<” sau „&” libere în text */
function wellFormed(xml) {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '');
  const stack = [];
  const re = /<(\/?)([A-Za-z:][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/g;
  let m, pos = 0;
  while ((m = re.exec(body))) {
    if (m.index !== pos) return false;
    pos = re.lastIndex;
    if (m[5] !== undefined) { if (/&(?!(?:amp|lt|gt|quot|apos);)/.test(m[5])) return false; continue; }
    if (m[4]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else stack.push(m[2]);
  }
  return pos === body.length && stack.length === 0;
}

test('sitemap.xml: XML valid, alternate hreflang reciproce, lastmod doar din date', () => {
  const pages = build({ posts: [post()] });
  const xml = pages.get('sitemap.xml');
  assert.ok(wellFormed(xml));
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const locs = urls.map((u) => attr(u, /<loc>([^<]+)<\/loc>/));
  assert.equal(new Set(locs).size, locs.length);
  const byLoc = new Map(urls.map((u, i) => [locs[i], u]));
  for (const loc of locs) {
    /* fiecare adresă din sitemap există ca fișier generat */
    assert.ok(pages.has(urlToFile(loc)), `${loc} nu are fișier`);
    const alts = [...byLoc.get(loc).matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)];
    for (const [, , href] of alts) {
      assert.ok(byLoc.has(href), `alternate către ${href} lipsește din sitemap`);
      const back = [...byLoc.get(href).matchAll(/hreflang="[^"]+" href="([^"]+)"/g)].map((x) => x[1]);
      assert.ok(back.includes(loc), `${href} nu trimite înapoi la ${loc}`);
    }
  }
  assert.ok(locs.includes(`${SITE}/`) && locs.includes(`${SITE}/en/`));
  assert.ok(locs.includes(`${SITE}/blog/primul/`) && locs.includes(`${SITE}/en/blog/primul/`));
  assert.match(byLoc.get(`${SITE}/blog/primul/`), /<lastmod>2026-03-04<\/lastmod>/);
  assert.ok(!/<lastmod>/.test(byLoc.get(`${SITE}/genti/roz/`)), 'fără lastmod inventat la genți');
  assert.ok(!locs.some((l) => /\/genti\/$|\/en\/genti\/$/.test(l)), 'fără ștampile de redirecționare în sitemap');
  const robots = pages.get('robots.txt');
  assert.match(robots, /^User-agent: \*/m);
  assert.ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`));
  assert.ok(wellFormed(build({ products: checkProducts([bag({ name: 'A & B <c>', id: 'amp' })]) }).get('sitemap.xml')));
});

/* ───── calitate ───── */

test('toate paginile: CSP strict, fără stiluri sau scripturi inline, fără CDN, lang, resurse locale', () => {
  const pages = build({ posts: [post()] });
  let html = 0;
  for (const [file, text] of pages) {
    if (!file.endsWith('.html')) continue;
    html++;
    assert.ok(!bareTags(text).some((t) => /\sstyle=/i.test(t)), `${file}: style=`);
    assert.ok(!/<style[\s>]/.test(text), `${file}: <style>`);
    assert.ok(!bareTags(text).some((t) => /\son[a-z]+=/i.test(t)), `${file}: handler inline`);
    assert.ok(!/<script(?![^>]*\b(?:src=|type="application\/ld\+json"))/.test(text), `${file}: script inline`);
    for (const m of text.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) assert.ok(!/^(?:https?:)?\/\//.test(m[1]), `${file}: script extern`);
    assert.ok(/<html lang="(?:ro|en)"/.test(text));
    assert.ok(/style-src 'self'/.test(text));
    assert.ok(!/cdn|googleapis|gstatic|unpkg|jsdelivr/.test(text.replace(/https:\/\/ig\.me|instagram\.com/g, '')), `${file}: CDN`);
    assert.ok(!/\b(?:lei|ron|eur)\b|[$€£]\s?\d|\d\s?(?:lei|ron)\b/i.test(text.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), `${file}: preț`);
  }
  assert.ok(html > 20);
  assert.ok(!/ş|ţ/.test([...pages.values()].join('')), 'ș/ț cu virgulă, nu cu sedilă');
});

test('ștampilele /genti/ și /en/genti/ duc la prima pagină, noindex', () => {
  const pages = build();
  assert.match(pages.get('genti/index.html'), /http-equiv="refresh" content="0;url=\/#collection"/);
  assert.match(pages.get('en/genti/index.html'), /http-equiv="refresh" content="0;url=\/en\/#collection"/);
  assert.match(pages.get('genti/index.html'), /noindex/);
});

/* ───── idempotență și ștergere ───── */

test('idempotență: a doua generare, pornind din rezultatul primei, dă aceleași fișiere', () => {
  const posts = [post(), post({ id: 'doar-ro', date: '2026-04-01', en: { title: '', body: '' } })];
  const products = checkProducts([...REAL, bag()]);
  const first = build({ products, posts });
  const second = build({ products, posts, indexHtml: first.get('index.html') });
  assert.deepEqual([...second.keys()], [...first.keys()]);
  for (const [k, v] of first) assert.equal(second.get(k), v, `${k} nu e idempotent`);
  /* și pe fișierul real din repo */
  const real = build({ products: checkProducts(REAL) });
  assert.equal(real.get('index.html'), renderIndex(real.get('index.html'), {
    content: CONTENT, productsJs: renderProductsJs(checkProducts(REAL)), contentJs: renderContentJs(CONTENT),
    products: checkProducts(REAL), posts: [],
  }));
});

function stateWith(pages, products, posts) {
  const files = new Map();
  for (const p of products) for (let n = 1; n <= p.photos; n++) {
    files.set(`assets/images/${p.id}-${n}.jpg`, SHA);
  }
  for (const po of posts) for (let n = 1; n <= po.photos.length; n++) files.set(`assets/blog/${po.id}/${n}.jpg`, SHA);
  for (const f of pages.keys()) files.set(f, SHA);
  return { products, posts, files, indexHtml: INDEX };
}
const emptyContent = { ro: {}, en: {} };

test('ștergerea unei genți sau a unui articol șterge paginile lui (RO și EN), din starea din repo', () => {
  const products = checkProducts([...REAL, bag()]);
  const posts = checkPosts([post(), post({ id: 'al-doilea', date: '2026-05-01' })]);
  const pages = build({ products, posts });
  const s = stateWith(pages, products, posts);
  const gone = REAL[0].id;
  const e = buildEntries({
    state: s, products: products.filter((p) => p.id !== gone), content: emptyContent,
    posts: posts.filter((p) => p.id !== 'primul'), images: new Map(), body: {},
  });
  const del = e.filter((x) => x.sha === null).map((x) => x.path);
  for (const f of [`genti/${gone}/index.html`, `en/genti/${gone}/index.html`, 'blog/primul/index.html', 'en/blog/primul/index.html']) {
    assert.ok(del.includes(f), `${f} trebuia șters`);
  }
  assert.ok(!del.includes('genti/roz/index.html'));
  assert.ok(!del.includes('blog/al-doilea/index.html'));
  const written = new Map(e.filter((x) => x.content !== undefined).map((x) => [x.path, x.content]));
  assert.ok(!written.has(`genti/${gone}/index.html`));
  assert.ok(written.get('sitemap.xml') && !written.get('sitemap.xml').includes(`/genti/${gone}/`));
  /* nu poate șterge nimic în afara paginilor generate */
  assert.ok(del.every((p) => /^assets\/(?:images|blog)\//.test(p) || /^(?:en\/)?(?:genti|blog)\/[a-z0-9-]+\/index\.html$/.test(p)));
  /* ștergerea ultimului articol readuce ștampila și scoate linkul Blog */
  const e2 = buildEntries({ state: s, products, content: emptyContent, posts: [], images: new Map(), body: {} });
  const w2 = new Map(e2.filter((x) => x.content !== undefined).map((x) => [x.path, x.content]));
  assert.match(w2.get('blog/index.html'), /noindex/);
  assert.ok(!w2.get('index.html').includes('data-blog'));
  assert.ok(e2.filter((x) => x.sha === null).some((x) => x.path === 'blog/al-doilea/index.html'));
});

test('o geantă care pierde textul englezesc își pierde pagina EN', () => {
  const products = checkProducts([...REAL, bag()]);
  const pages = build({ products });
  const s = stateWith(pages, products, []);
  const lost = checkProducts([...REAL, bag({ en: { tagline: '', description: '', pockets: '', closure: '' } })]);
  const e = buildEntries({ state: s, products: lost, content: emptyContent, posts: [], images: new Map(), body: {} });
  assert.ok(e.some((x) => x.path === 'en/genti/xss/index.html' && x.sha === null));
  assert.ok(!e.some((x) => x.path === 'genti/xss/index.html' && x.sha === null));
});

test('căile paginilor nu pot fi cerute din panou; stalePages ignoră tot ce nu e pagină generată', () => {
  const products = checkProducts(REAL);
  const s = stateWith(build({ products }), products, []);
  for (const bad of ['genti/roz/index.html', 'en/index.html', 'sitemap.xml', 'robots.txt']) {
    assert.throws(() => buildEntries({ state: s, products, content: emptyContent, posts: [], images: new Map(), body: { deletes: [bad] } }), /nepermisă/);
    assert.throws(() => checkImages({ [bad]: SHA }, s.files), (e) => e.expose === true);
  }
  assert.deepEqual(stalePages(['index.html', 'assets/js/app.js', 'genti/vechi/index.html', 'genti/roz/foto.html', 'en/blog/x/index.html'], new Map()),
    ['genti/vechi/index.html', 'en/blog/x/index.html']);
});

test('fără .webp în repo, paginile folosesc doar <img> (altfel o poză veche ar rămâne ruptă)', () => {
  const noWebp = build({ hasFile: () => false });
  assert.ok(!noWebp.get('genti/roz/index.html').includes('<picture>'));
  assert.ok(!noWebp.get('index.html').includes('<picture>'));
  const withWebp = build({ hasFile: (p) => /roz-1\.webp$/.test(p) });
  assert.match(withWebp.get('genti/roz/index.html'), /<picture><source type="image\/webp" srcset="\/assets\/images\/roz-1\.webp">/);
  assert.ok(!withWebp.get('genti/roz/index.html').includes('roz-2.webp'));
});
