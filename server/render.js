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

/* ─────────────── pagina principală ─────────────── */

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function renderIndex(html, { content, productsJs, contentJs }) {
  const ro = content.ro;
  let out = html;

  /* textul românesc din fiecare element cu data-i18n — cel pe care îl văd
     Google, previzualizările și cine are JavaScript oprit */
  out = out.replace(
    /(<([a-z][a-z0-9]*)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, key, inner, close) => (has(ro, key) ? open + inline(ro[key]) + close : m),
  );

  if (has(ro, 'meta.description')) {
    const d = esc(ro['meta.description']);
    out = out.replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => a + d + b);
    out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => a + d + b);
  }

  /* adresele scripturilor de date poartă amprenta conținutului */
  out = out.replace(/assets\/js\/products\.js(?:\?[^"]*)?"/, () => `assets/js/products.js?h=${hash(productsJs)}"`);
  out = out.replace(/assets\/js\/content\.js(?:\?[^"]*)?"/, () => `assets/js/content.js?h=${hash(contentJs)}"`);
  return out;
}

/* ─────────────── 404 și sitemap ─────────────── */

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

export function renderSitemap({ site }) {
  if (!site) throw new Error('Lipsește adresa canonică din index.html.');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(site)}/</loc></url>
</urlset>
`;
}
