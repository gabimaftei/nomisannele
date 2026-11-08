/* ═══════════════════════════════════════════════════════════════
   Generarea fișierelor site-ului
   ───────────────────────────────────────────────────────────────
   Tot ce se scrie în panou ajunge în fișiere de aici. Regula e una
   singură: ORICE text venit din panou trece prin esc() înainte să
   intre în HTML. Nu există nicăieri innerHTML cu text din panou.

   HTML-ul generat nu are stiluri inline și nici scripturi inline:
   site-ul are CSP strict (style-src 'self', script-src 'self').
   ═══════════════════════════════════════════════════════════════ */

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* U+2028 și U+2029 trec prin JSON.stringify neescapate: valide în JSON,
   dar multă vreme interzise într-un literal JavaScript. */
export function encJson(v) {
  const BS = String.fromCharCode(92);
  return JSON.stringify(v, null, 2)
    .split(String.fromCharCode(0x2028)).join(BS + 'u2028')
    .split(String.fromCharCode(0x2029)).join(BS + 'u2029');
}

/* Amprentă scurtă a unui text (FNV-1a). Intră în adresa scripturilor de
   date, ca browserul să nu țină în cache o versiune veche după o salvare. */
export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/* ─────────────── citirea fișierelor de date ─────────────── */

/* Parser pentru literalele din fișierele de date: JSON, dar îl acceptă și pe
   cel scris de mână — comentarii (de rând și de bloc), chei fără ghilimele,
   ghilimele simple, virgulă la sfârșit. Fără eval (în Worker nu există). */
function parseLiteral(src, pos) {
  let i = pos;
  const fail = (msg) => { throw new Error(`Fișier de date neînțeles (${msg}, poziția ${i}).`); };
  const skip = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src[i] === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src[i] === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2);
        if (e < 0) fail('comentariu nesfârșit');
        i = e + 2; continue;
      }
      return;
    }
  };
  const str = () => {
    const q = src[i++];
    let out = '';
    for (;;) {
      if (i >= src.length) fail('text nesfârșit');
      const c = src[i++];
      if (c === q) return out;
      if (c === '\n') fail('text pe mai multe rânduri');
      if (c !== '\\') { out += c; continue; }
      const n = src[i++];
      if (n === 'u') { out += String.fromCharCode(parseInt(src.slice(i, i + 4), 16)); i += 4; }
      else if (n === 'x') { out += String.fromCharCode(parseInt(src.slice(i, i + 2), 16)); i += 2; }
      else if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'r') out += '\r';
      else if (n === 'b') out += '\b';
      else if (n === 'f') out += '\f';
      else if (n === '0') out += '\0';
      else if (n === '\n') { /* continuare de rând */ }
      else out += n;
    }
  };
  const value = () => {
    skip();
    const c = src[i];
    if (c === '{') {
      i++;
      const o = {};
      for (;;) {
        skip();
        if (src[i] === '}') { i++; return o; }
        let key;
        if (src[i] === '"' || src[i] === "'") key = str();
        else {
          const m = /^[A-Za-z_$][\w$]*|^[0-9]+/.exec(src.slice(i, i + 80));
          if (!m) fail('cheie neașteptată');
          key = m[0]; i += key.length;
        }
        skip();
        if (src[i] !== ':') fail('lipsește „:"');
        i++;
        if (key === '__proto__') { value(); } else o[key] = value();
        skip();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === '}') { i++; return o; }
        fail('lipsește „," sau „}"');
      }
    }
    if (c === '[') {
      i++;
      const a = [];
      for (;;) {
        skip();
        if (src[i] === ']') { i++; return a; }
        a.push(value());
        skip();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ']') { i++; return a; }
        fail('lipsește „," sau „]"');
      }
    }
    if (c === '"' || c === "'") return str();
    if (c === '`') {
      const e = src.indexOf('`', i + 1);
      if (e < 0 || src.slice(i, e).includes('${')) fail('șablon neacceptat');
      const t = src.slice(i + 1, e); i = e + 1; return t;
    }
    const rest = src.slice(i, i + 40);
    let m = /^-?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/.exec(rest);
    if (m) { i += m[0].length; return Number(m[0]); }
    m = /^(true|false|null)\b/.exec(rest);
    if (m) { i += m[0].length; return m[1] === 'true' ? true : m[1] === 'false' ? false : null; }
    return fail('valoare neașteptată');
  };
  const v = value();
  return v;
}

/* Citește `const NUME = <literal>;` dintr-un fișier de date. Textul NUME
   poate apărea și în comentariile din capul fișierului: contează doar
   declarația de la începutul unui rând, în afara comentariilor. */
export function parseConsts(text, names) {
  const out = {};
  for (const name of names) {
    const re = new RegExp(`^(?:const|let|var)\\s+${name}\\s*=\\s*`, 'gm');
    let m, found = false;
    while ((m = re.exec(text))) {
      if (text.lastIndexOf('/*', m.index) > text.lastIndexOf('*/', m.index)) continue;
      out[name] = parseLiteral(text, m.index + m[0].length);
      found = true;
      break;
    }
    if (!found) throw new Error(`Lipsește ${name} din fișier.`);
  }
  return out;
}

/* ─────────────── fișierele de date ─────────────── */

export function renderProductsJs(products) {
  return `/* ---------------------------------------------------------------
   NOMIS ANNELE — catalogul de genți
   ---------------------------------------------------------------
   FIȘIER GENERAT. Este rescris de fiecare dată când se salvează din
   panoul de la /admin, deci orice modificare făcută de mână aici se
   pierde la următoarea salvare. Pentru schimbări de conținut,
   folosește panoul.

   id        identificator scurt, fără spații; e și prefixul pozelor:
             assets/images/<id>-1.jpg, <id>-2.jpg …
   photos    câte poze are geanta
   kind      umar | rucsac | borseta | tote
   dims      h = înălțime, w = lățime, d = adâncime (cm)
   madeFrom  câte perechi de blugi au intrat în ea (null = ascuns)
   tint      culoarea de rezervă până apare poza:
             denim | dark | grey | pink | patchwork
   badge     etichetă mică pe card (null = fără)
   sold      true când geanta nu mai e disponibilă
   --------------------------------------------------------------- */

const PRODUCTS = ${encJson(products)};
`;
}

export function renderContentJs(content) {
  return `/* ---------------------------------------------------------------
   NOMIS ANNELE — textele site-ului
   ---------------------------------------------------------------
   FIȘIER GENERAT de panoul de la /admin, tabul „Texte". Orice
   modificare făcută de mână aici se pierde la următoarea salvare.

   CONTENT   textele, pe chei, în română și engleză. O cheie nouă se
             adaugă de mână aici ȘI în index.html (atributul data-i18n);
             panoul poate schimba doar cheile care există deja.
   --------------------------------------------------------------- */

const CONTENT = ${encJson(content)};
`;
}

export function renderPostsJson(posts) {
  return JSON.stringify({ posts }, null, 2) + '\n';
}

/* ─────────────── ajutoare de text ─────────────── */

export function sortPosts(posts) {
  return posts.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/* Adresa site-ului și versiunea stilurilor, luate din index.html, ca să
   existe un singur loc de schimbat când se leagă domeniul. */
export function siteInfo(indexHtml) {
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(indexHtml);
  const ver = /styles\.css\?v=([0-9]+)/.exec(indexHtml);
  return {
    site: canon ? canon[1].replace(/\/+$/, '') : '',
    ver: ver ? ver[1] : '1',
  };
}

/* Text escapat, cu o singură excepție: linkul intern, scris ca
   <a href="#ancoră">text</a> (așa e în content.js, la collection.note).
   Linkurile merg doar spre adrese din același site; orice alt HTML, ca și
   [text](…), rămâne text simplu, escapat. */
export function inline(t) {
  return esc(t)
    .replace(/&lt;a href=&quot;([#/](?!\/)[a-z0-9\/#-]{0,120})&quot;&gt;([^&<>]{1,120}(?:&(?:amp|quot|#39);[^&<>]{0,60})*)&lt;\/a&gt;/g,
      (m, href, label) => `<a href="${href}">${label}</a>`);
}

/* ─────────────── texte comune ale paginilor generate ─────────────── */

export const SITE_NAME = 'NOMIS ANNELE';
export const BRAND = 'Nomis Annele';
export const IG_DM = 'https://ig.me/m/nomis.annele';
export const IG_PROFILE = 'https://www.instagram.com/nomis.annele';

/* Textele de interfață ale paginilor generate (cele din app.js, plus ce
   trebuie paginilor statice). Nu sunt chei din content.js: panoul nu le
   poate strica. */
export const TXT = {
  ro: {
    skip: 'Sari la genți', skipContent: 'Sari la conținut',
    home: 'Acasă', crumbs: 'Calea de navigare', menu: 'Meniu',
    mainNav: 'Navigare principală', footNav: 'Navigare secundară', langs: 'Limbă / Language',
    unique: 'Unicat', sold: 'Vândută', first: 'Prima geantă', view: 'Vezi detalii',
    openBag: 'Vezi detalii despre geanta {name}', dimsPending: 'Dimensiuni la cerere',
    specPockets: 'Buzunare', specClosure: 'Închidere', specMaterial: 'Materiale',
    dimH: 'Înălțime', dimW: 'Lățime', dimD: 'Adâncime',
    madeFrom: 'Creată din {n} blugi upcycled', madeFromOne: 'Dintr-o singură pereche de blugi',
    order: 'Întreabă de geanta asta',
    orderNote: 'Se deschide conversația cu @nomis.annele. Zi-ne că e vorba de „{name}” și îți spunem prețul.',
    soldTitle: 'Geanta asta și-a găsit deja casa',
    soldNote: 'Scrie-ne dacă îți dorești ceva asemănător. Putem coase un model pe comandă.',
    photoAlt: '{name}: {kind} din blugi upcycled, fotografia {n} din {total}',
    allBags: 'Toate gențile', moreBags: 'Alte genți', prev: 'Geanta anterioară', next: 'Geanta următoare',
    bags: 'Genți', blog: 'Blog', read: 'Citește articolul', backBlog: 'Înapoi la blog',
    published: 'Publicat pe', posts: 'Articolele', redirect: 'Te ducem la pagina principală.',
    redirectLink: 'Mergi la pagina principală',
    kinds: { umar: 'geantă de umăr', rucsac: 'rucsac', borseta: 'borsetă', tote: 'geantă tote' },
    titleBag: '{name} — {kind} din blugi upcycled | NOMIS ANNELE',
    blogTitle: 'Blog | NOMIS ANNELE',
    blogDesc: 'Articole de la NOMIS ANNELE: genți din blugi purtați, lucrate manual, acasă.',
    months: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
    photoOf: '{title}, fotografia {n} din {total}',
  },
  en: {
    skip: 'Skip to the bags', skipContent: 'Skip to the content',
    home: 'Home', crumbs: 'Breadcrumb', menu: 'Menu',
    mainNav: 'Main navigation', footNav: 'Secondary navigation', langs: 'Limbă / Language',
    unique: 'One of a kind', sold: 'Sold', first: 'Our first bag', view: 'View details',
    openBag: 'View details of the {name} bag', dimsPending: 'Measurements on request',
    specPockets: 'Pockets', specClosure: 'Closure', specMaterial: 'Material',
    dimH: 'Height', dimW: 'Width', dimD: 'Depth',
    madeFrom: 'Made from {n} upcycled pairs of jeans', madeFromOne: 'From a single pair of jeans',
    order: 'Ask about this bag',
    orderNote: 'Opens a chat with @nomis.annele. Mention “{name}” and we will send you the price.',
    soldTitle: 'This bag has already found its home',
    soldNote: 'Write to us if you would like something similar. We can sew one to order.',
    photoAlt: '{name}: upcycled denim {kind}, photo {n} of {total}',
    allBags: 'All bags', moreBags: 'More bags', prev: 'Previous bag', next: 'Next bag',
    bags: 'Bags', blog: 'Blog', read: 'Read the article', backBlog: 'Back to the blog',
    published: 'Published on', posts: 'Articles', redirect: 'Taking you to the home page.',
    redirectLink: 'Go to the home page',
    kinds: { umar: 'shoulder bag', rucsac: 'backpack', borseta: 'belt bag', tote: 'tote bag' },
    titleBag: '{name} — upcycled denim {kind} | NOMIS ANNELE',
    blogTitle: 'Blog | NOMIS ANNELE',
    blogDesc: 'Articles from NOMIS ANNELE: handmade bags from worn jeans, sewn at home.',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    photoOf: '{title}, photo {n} of {total}',
  },
};

export const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] == null ? '' : String(v[k])));

/* o geantă are pagină în engleză doar dacă are text englezesc */
export const hasEn = (p) => !!(p && p.en && p.en.tagline && p.en.description);
export const postHasEn = (p) => !!(p && p.en && p.en.title && p.en.body);

export const bagPath = (id, lang) => `${lang === 'en' ? '/en' : ''}/genti/${id}/`;
export const postPath = (id, lang) => `${lang === 'en' ? '/en' : ''}/blog/${id}/`;
export const photoPath = (id, n, ext = 'jpg') => `/assets/images/${id}-${n}.${ext}`;

export function dateText(date, lang) {
  const [y, m, d] = date.split('-').map(Number);
  const months = TXT[lang].months;
  return lang === 'en' ? `${months[m - 1]} ${d}, ${y}` : `${d} ${months[m - 1]} ${y}`;
}

/* Text scurtat la un cuvânt întreg, cu „…” la sfârșit. */
export function truncate(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  let cut = t.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  if (sp > n * 0.6) cut = cut.slice(0, sp);
  return cut.replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/* JSON-LD într-un <script>: textul vine din panou, deci „<”, „>”, „&” și
   separatorii de rând Unicode se scriu ca \uXXXX (JSON-ul rămâne la fel). */
export function jsonLd(obj) {
  const json = JSON.stringify(obj, null, 2)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

export function pictureHtml({ src, webp, alt, width, height, eager }) {
  const img = `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}" decoding="async"`
    + (eager ? ' fetchpriority="high">' : ' loading="lazy">');
  return webp
    ? `<picture><source type="image/webp" srcset="${esc(src.replace(/\.jpg$/, '.webp'))}">${img}</picture>`
    : img;
}

/* Comutatorul de limbă: linkuri către perechea din cealaltă limbă. Fără
   pereche (geantă sau articol netradus) nu apare linkul spre limba lipsă. */
export function langSwitchHtml(cur, roHref, enHref) {
  const a = (code, href, label) => `<a href="${esc(href)}" hreflang="${code}" lang="${code}"${cur === code ? ' class="is-active" aria-current="true"' : ''}>${label}</a>`;
  const parts = [a('ro', roHref, 'RO')];
  if (enHref) parts.push('<span class="langswitch__sep" aria-hidden="true">/</span>', a('en', enHref, 'EN'));
  return `<div class="langswitch" role="group" aria-label="Limbă / Language">${parts.join('')}</div>`;
}

export function cardHtml(p, lang, hasFile) {
  const t = TXT[lang];
  const loc = lang === 'en' && hasEn(p) ? p.en : p.ro;
  const flag = p.sold ? t.sold : p.badge === 'first' ? t.first : t.unique;
  const d = p.dims || {};
  const dims = d.h == null ? t.dimsPending : `${d.h} × ${d.w} × ${d.d} cm`;
  const src = photoPath(p.id, 1);
  const href = lang === 'en' && hasEn(p) ? bagPath(p.id, 'en') : bagPath(p.id, 'ro');
  return `<a class="card" href="${esc(href)}" aria-label="${esc(fmt(t.openBag, { name: p.name }))}">`
    + `<div class="card__media">${pictureHtml({ src, webp: !hasFile || hasFile(photoPath(p.id, 1, 'webp').slice(1)), alt: '', width: 800, height: 1000, eager: false })}`
    + `<span class="card__flag${p.sold ? ' card__flag--sold' : ''}">${esc(flag)}</span></div>`
    + `<div class="card__body"><h3 class="card__name">${esc(p.name)}</h3><p class="card__tagline">${esc(loc.tagline || p.ro.tagline)}</p>`
    + `<div class="card__meta"><span>${esc(dims)}</span><span class="card__more">${esc(t.view)}</span></div></div></a>`;
}

/* ─────────────── pagina principală ─────────────── */

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const setMeta = (out, attr, name, value) => out.replace(
  new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`), (m, a, b) => a + esc(value) + b);

/* Blocul de SEO din <head> (hreflang, Twitter, JSON-LD). E între două
   marcaje, ca să poată fi rescris la fiecare generare. */
function seoBlock({ lang, site, title, desc, image, products }) {
  const t = (x) => esc(x);
  const org = {
    '@type': 'Organization', '@id': `${site}/#organization`, name: BRAND, url: `${site}/`,
    description: desc, sameAs: [IG_PROFILE],
  };
  if (image) org.image = image;
  const graph = [org, {
    '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: SITE_NAME,
    inLanguage: lang, publisher: { '@id': `${site}/#organization` },
  }];
  return [
    '<!-- seo:start -->',
    `<link rel="alternate" hreflang="ro" href="${t(site + '/')}">`,
    `<link rel="alternate" hreflang="en" href="${t(site + '/en/')}">`,
    `<link rel="alternate" hreflang="x-default" href="${t(site + '/')}">`,
    `<meta name="twitter:title" content="${t(title)}">`,
    `<meta name="twitter:description" content="${t(desc)}">`,
    image ? `<meta name="twitter:image" content="${t(image)}">` : '',
    jsonLd({ '@context': 'https://schema.org', '@graph': graph }),
    '<!-- seo:end -->',
  ].filter(Boolean).join('\n');
}

const INDEX_UI_EN = {
  skip: 'Skip to the bags',
};

/* Linkul „Blog” din meniu și din subsol: doar când există articole. */
function withBlogLinks(html, lang, href) {
  let out = html.replace(/[ \t]*<a [^>]*data-blog[^>]*>[^<]*<\/a>\n?/g, '');
  if (href) {
    out = out.replace(/([ \t]*)(<a href="#process"[^>]*>[^<]*<\/a>)/g,
      (m, ind, a) => `${ind}${a}\n${ind}<a href="${esc(href)}" data-blog>${esc(TXT[lang].blog)}</a>`);
  }
  return out;
}

function renderHome(html, lang, { content, productsJs, contentJs, products = [], posts = [], hasFile }) {
  const ro = content.ro || {};
  const en = content.en || {};
  const texts = lang === 'en' ? { ...ro, ...INDEX_UI_EN, ...Object.fromEntries(Object.entries(en).filter(([, v]) => v)) } : ro;
  const { site } = siteInfo(html);
  const t = TXT[lang];
  let out = html;

  /* textul din fiecare element cu data-i18n — cel pe care îl văd Google,
     previzualizările și cine are JavaScript oprit */
  out = out.replace(
    /(<([a-z][a-z0-9]*)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, key, inner, close) => (has(texts, key) ? open + inline(texts[key]) + close : m),
  );

  out = out.replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`);
  const title = texts['seo.title'], desc = texts['seo.description'];
  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
    out = setMeta(out, 'property', 'og:title', title);
  }
  if (desc) {
    out = setMeta(out, 'name', 'description', desc);
    out = setMeta(out, 'property', 'og:description', desc);
  }
  out = setMeta(out, 'property', 'og:locale', lang === 'en' ? 'en_US' : 'ro_RO');

  if (site) {
    const url = lang === 'en' ? `${site}/en/` : `${site}/`;
    out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + esc(url) + b);
    out = setMeta(out, 'property', 'og:url', url);
    let image = null;
    if (products[0]) {
      image = `${site}${photoPath(products[0].id, 1)}`;
      out = setMeta(out, 'property', 'og:image', image);
      const kind = t.kinds[products[0].kind] || '';
      out = setMeta(out, 'property', 'og:image:alt', lang === 'en' ? `${products[0].name}: upcycled denim ${kind}` : `${products[0].name}: ${kind} din blugi upcycled`);
    }
    const block = seoBlock({ lang, site, title: title || '', desc: desc || '', image, products });
    if (/<!-- seo:start -->/.test(out)) out = out.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, () => block);
    else out = out.replace(/(<link rel="icon")/, (m) => `${block}\n\n${m}`);
  }

  /* grila de genți, ca linkuri reale (app.js o reface la încărcare) */
  const cards = products.map((p) => cardHtml(p, lang, hasFile)).join('\n    ');
  out = out.replace(/<!-- cards:start -->[\s\S]*?<!-- cards:end -->/, () => `<!-- cards:start -->\n    ${cards}\n    <!-- cards:end -->`);

  /* comutatorul de limbă: link către perechea din cealaltă limbă */
  out = out.replace(/<div class="langswitch"[\s\S]*?<\/div>/, () => langSwitchHtml(lang, '/', '/en/'));

  /* Blog în meniu, doar dacă există articole în limba paginii */
  const blogCount = lang === 'en' ? posts.filter(postHasEn).length : posts.length;
  out = withBlogLinks(out, lang, blogCount ? (lang === 'en' ? '/en/blog/' : '/blog/') : null);

  /* adresele scripturilor de date poartă amprenta conținutului */
  out = out.replace(/assets\/js\/products\.js(?:\?[^"]*)?"/, () => `assets/js/products.js?h=${hash(productsJs)}"`);
  out = out.replace(/assets\/js\/content\.js(?:\?[^"]*)?"/, () => `assets/js/content.js?h=${hash(contentJs)}"`);
  return out;
}

export function renderIndex(html, opts) {
  return renderHome(html, 'ro', opts);
}

/* /en/index.html: aceeași pagină, cu textele englezești, calea resurselor
   absolută (pagina stă într-un subfolder) și etichetele de accesibilitate
   traduse. */
export function renderIndexEn(roHtml, opts) {
  let out = renderHome(roHtml, 'en', opts);
  out = out.replace(/(href|src)="assets\//g, '$1="/assets/');
  const t = TXT.en;
  const tr = (from, to) => { out = out.split(from).join(to); };
  tr('aria-label="Meniu"', `aria-label="${t.menu}"`);
  tr('aria-label="Navigare principală"', `aria-label="${t.mainNav}"`);
  tr('aria-label="Navigare secundară"', `aria-label="${t.footNav}"`);
  tr('aria-label="Închide"', 'aria-label="Close"');
  out = out.replace(/(<a class="nav__brand" href=")#top(")/, '$1/en/#top$2');
  return out;
}

/* ─────────────── 404, redirecționări, sitemap, robots ─────────────── */


/* Pagina de „nu există". Stă la orice adresă greșită, deci căile sunt
   absolute. Textele sunt scrise aici (nu sunt chei din content.js, ca
   panoul să nu poată strica pagina). Nicio resursă din afară, niciun stil
   inline. */
export function renderNotFound({ site, ver }) {
  const url = site ? esc(site + '/') : '/';
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Pagina nu există — NOMIS ANNELE</title>
<meta name="robots" content="noindex">
<!-- Pagină generată de panoul de la /admin. Orice modificare făcută de mână se pierde la următoarea salvare. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'">
<meta name="theme-color" content="#1e3050">
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/styles.css?v=${esc(ver)}">
</head>
<body>
<main class="section">
  <div class="section__head">
    <p class="eyebrow">404</p>
    <h1 class="section__title">Pagina asta nu există</h1>
    <p class="section__lede">Poate adresa a fost scrisă greșit sau pagina a fost mutată. Gențile sunt tot pe prima pagină.</p>
    <p><a class="btn btn--primary" href="${url}">Înapoi la genți</a></p>
    <p class="section__lede"><em>This page does not exist. <a href="${url}">Back to the bags.</a></em></p>
  </div>
</main>
</body>
</html>
`;
}

/* Pagină-ștampilă pentru adrese fără conținut propriu (/genti/, /blog/ când
   nu sunt articole): trimite la prima pagină. noindex: nu e un document. */
export function renderRedirect({ site, ver, lang, to, canonical }) {
  const t = TXT[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(SITE_NAME)}</title>
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0;url=${esc(to)}">
${site ? `<link rel="canonical" href="${esc(site + canonical)}">\n` : ''}<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'">
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/styles.css?v=${esc(ver)}">
</head>
<body>
<main class="section">
  <div class="section__head">
    <h1 class="section__title">${esc(SITE_NAME)}</h1>
    <p class="section__lede">${esc(t.redirect)}</p>
    <p><a class="btn btn--primary" href="${esc(to)}">${esc(t.redirectLink)}</a></p>
  </div>
</main>
</body>
</html>
`;
}

/* sitemap.xml: fiecare intrare are, dacă există și pereche în cealaltă
   limbă, linkurile alternate (inclusiv spre ea însăși și x-default).
   entries: [{ path, lastmod?, alts?: [{ hreflang, path }] }] */
export function renderSitemap({ site, entries }) {
  if (!site) throw new Error('Lipsește adresa canonică din index.html.');
  const list = entries || [{ path: '/', alts: [{ hreflang: 'ro', path: '/' }, { hreflang: 'en', path: '/en/' }, { hreflang: 'x-default', path: '/' }] },
    { path: '/en/', alts: [{ hreflang: 'ro', path: '/' }, { hreflang: 'en', path: '/en/' }, { hreflang: 'x-default', path: '/' }] }];
  const rows = list.map((e) => {
    const alts = (e.alts || []).map((a) => `\n    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(site + a.path)}"/>`).join('');
    return `  <url>\n    <loc>${esc(site + e.path)}</loc>${e.lastmod ? `\n    <lastmod>${esc(e.lastmod)}</lastmod>` : ''}${alts}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>
`;
}

export function renderRobots({ site }) {
  if (!site) throw new Error('Lipsește adresa canonică din index.html.');
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`;
}
