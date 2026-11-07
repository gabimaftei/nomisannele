/* Teste pentru partea de server a panoului: node --test test/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  esc, inline, hash, parseConsts, renderProductsJs, renderContentJs, renderPostsJson,
  renderIndex, renderNotFound, renderSitemap, siteInfo,
} from '../server/render.js';
import {
  checkProducts, checkContent, checkPosts, checkImages, buildEntries, sameSecret, handleApi,
} from '../server/api.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SHA_A = 'a'.repeat(40);

const bag = (over = {}) => ({
  id: 'buton', name: 'Buton', photos: 2, kind: 'umar', sold: false,
  dims: { h: 28, w: 31, d: 9 }, madeFrom: 6, tint: 'denim', badge: null,
  ro: { tagline: 'Siluetă', description: 'Descriere', pockets: '3 buzunare', closure: 'Buton' },
  en: { tagline: 'Shape', description: 'Description', pockets: '3 pockets', closure: 'Button' },
  ...over,
});
const throwsMsg = (fn, re) => assert.throws(fn, (e) => e.expose === true && re.test(e.message));

/* ───── parser ───── */

test('parseConsts: JSON generat, cu comentarii în cap care pomenesc numele', () => {
  const txt = `/* const PRODUCTS = [ fals ]; */\nconst PRODUCTS = ${JSON.stringify([{ a: 1 }])};\n`;
  assert.deepEqual(parseConsts(txt, ['PRODUCTS']).PRODUCTS, [{ a: 1 }]);
});

test('parseConsts: literal scris de mână (comentarii, ghilimele simple, chei goale, virgule)', () => {
  const txt = `// antet\nconst X =[\n  { id: 'a', n: 3, // rând\n    t: "ș ț \\u00e9", b: null, /* bloc */ ok: true, },\n];\nconst Y = { "k": "v;\\n" };\n`;
  const r = parseConsts(txt, ['X', 'Y']);
  assert.deepEqual(r.X, [{ id: 'a', n: 3, t: 'ș ț é', b: null, ok: true }]);
  assert.deepEqual(r.Y, { k: 'v;\n' });
});

test('parseConsts: lipsă și nonsens dau eroare', () => {
  assert.throws(() => parseConsts('const A = 1;', ['B']), /Lipsește B/);
  assert.throws(() => parseConsts('const A = [1, ;', ['A']), /neînțeles/);
});

test('parseConsts: citește fișierele reale ale site-ului', () => {
  const { PRODUCTS } = parseConsts(read('assets/js/products.js'), ['PRODUCTS']);
  const { CONTENT } = parseConsts(read('assets/js/content.js'), ['CONTENT']);
  assert.ok(PRODUCTS.length >= 1);
  assert.deepEqual(Object.keys(CONTENT.ro).sort(), Object.keys(CONTENT.en).sort());
  /* ce citim din fișierele reale trece prin aceleași verificări ca ce vine din panou */
  const checked = checkProducts(PRODUCTS);
  assert.equal(checked.length, PRODUCTS.length);
  checkContent(CONTENT, Object.keys(CONTENT.ro));
});

test('generare apoi citire: aceleași date', () => {
  const products = checkProducts([bag(), bag({ id: 'roz', name: 'Roz', madeFrom: null, badge: 'Nou' })]);
  assert.deepEqual(parseConsts(renderProductsJs(products), ['PRODUCTS']).PRODUCTS, products);
  const content = { ro: { 'a.b': 'text „ș"  ' }, en: { 'a.b': '' } };
  assert.deepEqual(parseConsts(renderContentJs(content), ['CONTENT']).CONTENT, content);
  assert.ok(!renderContentJs(content).includes(' '));
  assert.deepEqual(JSON.parse(renderPostsJson([])), { posts: [] });
});

/* ───── verificări ───── */

test('checkProducts: o geantă bună trece și e curățată', () => {
  const [p] = checkProducts([bag({ name: '  Buton  ', extra: 'x', badge: '' })]);
  assert.equal(p.name, 'Buton');
  assert.equal(p.badge, null);
  assert.ok(!('extra' in p));
});

test('checkProducts: respinge date greșite', () => {
  throwsMsg(() => checkProducts([]), /goală/);
  throwsMsg(() => checkProducts([bag({ id: '../x' })]), /Identificator/);
  throwsMsg(() => checkProducts([bag(), bag()]), /același identificator/);
  throwsMsg(() => checkProducts([bag({ kind: 'inel' })]), /Tip necunoscut/);
  throwsMsg(() => checkProducts([bag({ tint: 'roșu' })]), /Culoare/);
  throwsMsg(() => checkProducts([bag({ photos: 0 })]), /poze/);
  throwsMsg(() => checkProducts([bag({ photos: 2.5 })]), /poze/);
  throwsMsg(() => checkProducts([bag({ dims: { h: 0, w: 1, d: 1 } })]), /pozitiv/);
  throwsMsg(() => checkProducts([bag({ dims: { h: '28', w: 1, d: 1 } })]), /pozitiv/);
  throwsMsg(() => checkProducts([bag({ dims: { h: 1e9, w: 1, d: 1 } })]), /pozitiv/);
  throwsMsg(() => checkProducts([bag({ madeFrom: 0 })]), /perechi/);
  throwsMsg(() => checkProducts([bag({ name: '' })]), /nume/);
  throwsMsg(() => checkProducts([bag({ name: 5 })]), /nu e text/);
  throwsMsg(() => checkProducts([bag({ sold: 'da' })]), /Vândută/);
  throwsMsg(() => checkProducts([bag({ ro: { tagline: '', description: 'x' } })]), /subtitlul/);
  throwsMsg(() => checkProducts([bag({ ro: { ...bag().ro, description: 'x'.repeat(1501) } })]), /prea lung/);
});

test('checkContent: doar cheile existente', () => {
  const ok = checkContent({ ro: { a: ' x ' }, en: {} }, ['a']);
  assert.deepEqual(ok, { ro: { a: 'x' }, en: { a: '' } });
  throwsMsg(() => checkContent({ ro: { a: 'x', b: 'y' }, en: {} }, ['a']), /necunoscut/);
  throwsMsg(() => checkContent({ ro: {}, en: {} }, ['a']), /Lipsește/);
  throwsMsg(() => checkContent({ ro: { a: 1 }, en: {} }, ['a']), /nu e text/);
  throwsMsg(() => checkContent({ ro: { a: 'x' } }, ['a']), /Lipsesc/);
});

test('checkPosts: validări și ordine (cele noi primele)', () => {
  const post = (o = {}) => ({ id: 'p1', date: '2026-01-02', photos: [{ w: 800, h: 600 }], ro: { title: 'T', body: 'B' }, en: {}, ...o });
  const r = checkPosts([post(), post({ id: 'p2', date: '2026-05-01' })]);
  assert.deepEqual(r.map((p) => p.id), ['p2', 'p1']);
  throwsMsg(() => checkPosts([post({ date: '2026-02-30' })]), /Data/);
  throwsMsg(() => checkPosts([post({ photos: [] })]), /poze/);
  throwsMsg(() => checkPosts([post({ photos: [{ w: 0, h: 1 }] })]), /dimensiuni/);
  throwsMsg(() => checkPosts([post({ id: 'A B' })]), /Identificator/);
  throwsMsg(() => checkPosts([post(), post()]), /același/);
});

test('checkImages: căi și amprente', () => {
  const files = new Map([['assets/images/buton-1.jpg', SHA_A]]);
  const r = checkImages({
    'assets/images/roz-1.jpg': 'b'.repeat(40),
    'assets/images/roz-2.jpg': { from: 'assets/images/buton-1.jpg' },
    'assets/blog/p1/1.jpg': 'c'.repeat(40),
  }, files);
  assert.equal(r.get('assets/images/roz-2.jpg'), SHA_A);
  assert.equal(r.size, 3);
  throwsMsg(() => checkImages({ 'assets/images/../x.jpg': SHA_A }, files), /nepermisă/);
  throwsMsg(() => checkImages({ 'assets/js/app.js': SHA_A }, files), /nepermisă/);
  throwsMsg(() => checkImages({ 'assets/images/roz-1.jpg': 'zz' }, files), /nu e validă/);
  throwsMsg(() => checkImages({ 'assets/images/roz-1.jpg': { from: 'assets/images/nu-exista-1.jpg' } }, files), /nu e validă/);
  assert.equal(checkImages(undefined, files).size, 0);
});

test('sameSecret', async () => {
  assert.ok(await sameSecret('parolă', 'parolă'));
  assert.ok(!(await sameSecret('parolă', 'parola')));
  assert.ok(!(await sameSecret('a', '')));
  assert.ok(!(await sameSecret('x'.repeat(5000), 'x')));
  assert.ok(!(await sameSecret('', 'x'.repeat(5000))));
});

test('checkContent: fără HTML, în afară de linkul intern de la collection.note', () => {
  const mk = (key, v) => ({ ro: { [key]: v }, en: { [key]: 'ok' } });
  for (const bad of ['<img src=x onerror=alert(1)>', 'a <b>bold</b>', 'x > y', '<a href="https://rau.ro">x</a>',
    '<a href="//rau.ro">x</a>', '<a href="#a">x</a> <a href="#b">y</a>', '<a href="#a" onclick="x">x</a>']) {
    throwsMsg(() => checkContent(mk('hero.title1', bad), ['hero.title1']), /< sau >/);
    throwsMsg(() => checkContent(mk('collection.note', bad), ['collection.note']), /< sau >/);
  }
  throwsMsg(() => checkContent({ ro: { a: 'ok' }, en: { a: '<i>' } }, ['a']), /< sau >/);
  const link = 'Ai alt model? <a href="#contact">Scrie-ne</a>, facem geanta.';
  assert.equal(checkContent(mk('collection.note', link), ['collection.note']).ro['collection.note'], link);
  throwsMsg(() => checkContent(mk('hero.title1', link), ['hero.title1']), /< sau >/);
  /* [text](#ancoră) nu e HTML: trece validarea, ca text simplu */
  const brk = 'Scrie [aici](#contact) sau [x](/blog/).';
  assert.equal(checkContent(mk('collection.note', brk), ['collection.note']).ro['collection.note'], brk);
  assert.equal(checkContent(mk('hero.title1', brk), ['hero.title1']).ro['hero.title1'], brk);
});

/* ───── randare ───── */

test('esc și inline: HTML din panou nu trece, linkul intern da', () => {
  assert.equal(esc(`<b a="1">'&`), '&lt;b a=&quot;1&quot;&gt;&#39;&amp;');
  assert.equal(inline('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(inline('Scrie <a href="#contact">Scrie-ne</a>.'), 'Scrie <a href="#contact">Scrie-ne</a>.');
  /* sintaxa cu paranteze nu mai e link: rămâne text simplu */
  assert.equal(inline('[mesaj](#contact) și [x](/blog/)'), '[mesaj](#contact) și [x](/blog/)');
  assert.ok(!inline('<a href="javascript:alert(1)">x</a>').includes('<a '));
  assert.ok(!inline('<a href="//evil.com">x</a>').includes('<a '));
  assert.ok(!inline('[x](//evil.com)').includes('<a '));
  assert.ok(!inline('[x](#a)').includes('<a '));
  assert.ok(!inline('<a href="#a" onclick="x">x</a>').includes('<a '));
});

test('renderIndex pe index.html real: texte, hash-uri, fără stiluri inline', () => {
  const html = read('index.html');
  const { CONTENT } = parseConsts(read('assets/js/content.js'), ['CONTENT']);
  const content = checkContent(CONTENT, Object.keys(CONTENT.ro));
  content.ro['hero.title1'] = 'Titlu <nou> & „bun"';
  const out = renderIndex(html, { content, productsJs: 'P', contentJs: 'C' });
  assert.ok(out.includes('Titlu &lt;nou&gt; &amp; „bun&quot;'));
  assert.ok(out.includes(`assets/js/products.js?h=${hash('P')}"`));
  assert.ok(out.includes(`assets/js/content.js?h=${hash('C')}"`));
  assert.ok(!/<[^>]+\sstyle=/.test(out), 'fără stiluri inline');
  /* nota cu link rămâne cu link */
  if (CONTENT.ro['collection.note']) assert.match(out, /<a href="#contact">/);
  /* idempotent: a doua trecere dă același rezultat */
  assert.equal(renderIndex(out, { content, productsJs: 'P', contentJs: 'C' }), out);
  /* aceleași etichete HTML ca originalul (nu s-a rupt structura) */
  const tags = (h) => (h.match(/<\/?[a-z0-9]+/g) || []).length;
  assert.equal(tags(out), tags(html));
});

test('renderNotFound și renderSitemap', () => {
  const html = renderNotFound({ site: 'https://exemplu.ro', ver: '28' });
  assert.ok(!/\sstyle=|<script/.test(html));
  assert.match(html, /404/);
  assert.match(html, /styles\.css\?v=28/);
  assert.ok(html.includes('href="https://exemplu.ro/"'));
  assert.match(renderSitemap({ site: 'https://exemplu.ro' }), /<loc>https:\/\/exemplu\.ro\/<\/loc>/);
  assert.throws(() => renderSitemap({ site: '' }));
  const real = siteInfo(read('index.html'));
  assert.match(real.site, /^https:\/\//);
  assert.match(real.ver, /^[0-9]+$/);
});

/* ───── ce intră în commit ───── */

function state() {
  const { PRODUCTS } = parseConsts(read('assets/js/products.js'), ['PRODUCTS']);
  const files = new Map([['story-1.jpg', SHA_A], ['assets/images/story-1.jpg', 'e'.repeat(40)]]);
  for (const p of PRODUCTS) for (let n = 1; n <= p.photos; n++) {
    files.set(`assets/images/${p.id}-${n}.jpg`, SHA_A);
    files.set(`assets/images/${p.id}-${n}.webp`, SHA_A);
  }
  return { products: PRODUCTS, posts: [], files, indexHtml: read('index.html') };
}
const emptyContent = { ro: {}, en: {} };

test('buildEntries: fișiere generate, fără blog/ și en/ în etapa asta', () => {
  const s = state();
  const products = checkProducts(s.products);
  const e = buildEntries({ state: s, products, content: emptyContent, posts: [], images: new Map(), body: {} });
  const paths = e.map((x) => x.path).sort();
  assert.deepEqual(paths, ['404.html', 'assets/js/content.js', 'assets/js/products.js', 'data/posts.json', 'index.html', 'sitemap.xml']);
});

test('buildEntries: geanta ștearsă își pierde pozele, dar story-1.jpg rămâne', () => {
  const s = state();
  const all = checkProducts(s.products);
  const gone = all[0].id;
  const e = buildEntries({ state: s, products: all.slice(1), content: emptyContent, posts: [], images: new Map(), body: {} });
  const del = e.filter((x) => x.sha === null).map((x) => x.path);
  assert.ok(del.includes(`assets/images/${gone}-1.jpg`));
  assert.ok(del.includes(`assets/images/${gone}-1.webp`));
  assert.ok(!del.includes('assets/images/story-1.jpg'));
});

test('buildEntries: poză lipsă, poze micșorate și ștergeri nepermise', () => {
  const s = state();
  const products = checkProducts(s.products);
  const more = checkProducts([{ ...s.products[0], photos: 3 }]);
  throwsMsg(() => buildEntries({ state: s, products: more, content: emptyContent, posts: [], images: new Map(), body: {} }), /Lipsește poza 3/);
  const ok = buildEntries({ state: s, products: more, content: emptyContent, posts: [],
    images: new Map([[`assets/images/${s.products[0].id}-3.jpg`, SHA_A]]), body: {} });
  assert.ok(ok.some((x) => x.path.endsWith('-3.jpg') && x.sha === SHA_A));
  throwsMsg(() => buildEntries({ state: s, products, content: emptyContent, posts: [], images: new Map(), body: { deletes: ['index.html'] } }), /nepermisă/);
  const shrunk = checkProducts([{ ...s.products[0], photos: 1 }]);
  const e = buildEntries({ state: s, products: shrunk, content: emptyContent, posts: [], images: new Map(), body: {} });
  assert.ok(e.some((x) => x.path === `assets/images/${s.products[0].id}-2.jpg` && x.sha === null));
});

/* ───── rutele, cu un GitHub simulat în memorie ───── */

function fakeGithub(initial) {
  const blobs = new Map();
  const db = { files: new Map(initial), head: 'h0', commits: 0, lastTree: null };
  let n = 0;
  const putBlob = (c) => { const sha = String(++n).padStart(40, '0'); blobs.set(sha, c); return sha; };
  for (const [p, c] of [...db.files]) if (typeof c === 'string' && !/^[0-9a-f]{40}$/.test(c)) db.files.set(p, putBlob(c));
  const reply = (o, status = 200) => new Response(JSON.stringify(o), { status });
  const fetchFn = async (url, init = {}) => {
    const u = new URL(url);
    const m = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    const p = u.pathname.replace('/repos/test/repo', '');
    if (p === '/git/ref/heads/main') return reply({ object: { sha: db.head } });
    if (p.startsWith('/git/commits/') && m === 'GET') return reply({ tree: { sha: 'tree-' + db.head } });
    if (p.startsWith('/git/trees/') && m === 'GET') {
      return reply({ truncated: false, tree: [...db.files].map(([path, sha]) => ({ path, sha, type: 'blob' })) });
    }
    if (p.startsWith('/git/blobs/') && m === 'GET') {
      return reply({ content: Buffer.from(blobs.get(p.split('/').pop())).toString('base64') });
    }
    if (p === '/git/blobs' && m === 'POST') return reply({ sha: putBlob(body.content) }, 201);
    if (p === '/git/trees' && m === 'POST') {
      db.lastTree = body.tree;
      return reply({ sha: 'newtree' }, 201);
    }
    if (p === '/git/commits' && m === 'POST') return reply({ sha: 'c' + (++db.commits) }, 201);
    if (p === '/git/refs/heads/main' && m === 'PATCH') {
      assert.equal(body.force, false);
      if (db.stale) return reply({ message: 'Update is not a fast forward' }, 422);
      for (const e of db.lastTree) {
        if (e.sha === null) db.files.delete(e.path); else db.files.set(e.path, e.sha || putBlob(e.content));
      }
      db.head = body.sha;
      return reply({});
    }
    return reply({ message: 'nu există: ' + p }, 404);
  };
  return { db, fetchFn, blobs };
}

const post = (route, body) => new Request('https://x.test' + route, {
  method: 'POST', body: JSON.stringify(body), headers: { 'cf-connecting-ip': '1.2.3.4' },
});

test('handleApi: parola, configurarea și metoda', async () => {
  const env = { ADMIN_PASSWORD: 'bună', GITHUB_TOKEN: 't', GITHUB_API_URL: 'http://gh.local', GITHUB_REPO: 'test/repo' };
  assert.equal((await handleApi(post('/api/nu-exista', {}), env)).status, 404);
  assert.equal((await handleApi(new Request('https://x.test/api/data'), env)).status, 405);
  assert.equal((await handleApi(post('/api/data', {}), { GITHUB_TOKEN: 't' })).status, 500);
  assert.equal((await handleApi(post('/api/data', { password: 'bună', check: true }), env)).status, 200);
  const bad = await handleApi(post('/api/data', { password: 'greșită' }), env);
  assert.equal(bad.status, 401);
  assert.equal((await handleApi(post('/api/publish', {}), env)).status, 401);
  assert.equal((await handleApi(post('/api/blob', { data: 'x' }), env)).status, 401);
  const raw = await handleApi(new Request('https://x.test/api/data', { method: 'POST', body: 'nu e json' }), env);
  assert.equal(raw.status, 400);
});

test('handleApi: publish fără `base` e 400, parola cu altă lungime e 401', async () => {
  const env = { ADMIN_PASSWORD: 'bună', GITHUB_TOKEN: 't', GITHUB_API_URL: 'http://gh.local', GITHUB_REPO: 'test/repo' };
  for (const base of [undefined, null, 5, '']) {
    const r = await handleApi(post('/api/publish', { password: 'bună', base }), env);
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /reîncărcat/);
  }
  for (const pw of ['', 'b', 'bună!', 'x'.repeat(3000)]) {
    const r = await handleApi(post('/api/data', { password: pw }), env);
    assert.equal(r.status, 401);
  }
});

test('handleApi: data, blob și publish cap-coadă cu GitHub simulat', async () => {
  const realFetch = globalThis.fetch;
  const productsTxt = read('assets/js/products.js');
  const contentTxt = read('assets/js/content.js');
  const s = state();
  const initial = new Map([
    ['assets/js/products.js', productsTxt], ['assets/js/content.js', contentTxt],
    ['index.html', read('index.html')],
  ]);
  const gh = fakeGithub(new Map([...initial]));
  for (const [p, sha] of s.files) if (p.startsWith('assets/images/')) gh.db.files.set(p, sha);
  globalThis.fetch = gh.fetchFn;
  const env = { ADMIN_PASSWORD: 'bună', GITHUB_TOKEN: 't', GITHUB_API_URL: 'http://gh.local', GITHUB_REPO: 'test/repo' };
  try {
    const d = await (await handleApi(post('/api/data', { password: 'bună' }), env)).json();
    assert.equal(d.ok, true);
    assert.equal(d.head, 'h0');
    assert.deepEqual(d.products, s.products);
    assert.deepEqual(d.posts, []);

    /* poză: doar JPEG */
    assert.equal((await handleApi(post('/api/blob', { password: 'bună', data: Buffer.from('GIF89aaaaaaa').toString('base64') }), env)).status, 400);
    const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5]).toString('base64');
    const b = await (await handleApi(post('/api/blob', { password: 'bună', data: jpg }), env)).json();
    assert.match(b.sha, /^[0-9a-f]{40}$/);

    /* publicare cu un text schimbat, o geantă nouă și o poză nouă */
    const content = { ro: { ...d.content.ro, 'hero.title1': 'Titlu nou' }, en: d.content.en };
    const products = [...d.products, bag({ id: 'noua', name: 'Nouă', photos: 1 })];
    const body = { password: 'bună', base: d.head, products, content, images: { 'assets/images/noua-1.jpg': b.sha }, message: 'Geantă nouă' };
    const r = await handleApi(post('/api/publish', body), env);
    assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
    assert.equal(gh.db.head, 'c1');
    const written = (p) => Buffer.from(gh.blobs.get(gh.db.files.get(p))).toString('utf8');
    assert.match(written('assets/js/products.js'), /"id": "noua"/);
    assert.match(written('index.html'), />Titlu nou</);
    assert.match(written('sitemap.xml'), /<urlset/);
    assert.match(written('404.html'), /404/);
    assert.equal(gh.db.files.get('assets/images/noua-1.jpg'), b.sha);

    /* același „base" vechi a doua oară: conflict, nimic scris */
    const again = await handleApi(post('/api/publish', body), env);
    assert.equal(again.status, 409);
    assert.equal(gh.db.head, 'c1');

    /* ramura s-a mișcat între timp: GitHub refuză, tot 409 */
    gh.db.stale = true;
    const stale = await handleApi(post('/api/publish', { ...body, base: 'c1', products: d.products }), env);
    assert.equal(stale.status, 409);

    /* date nevalide: 400 cu mesaj, nimic scris */
    gh.db.stale = false;
    const bad = await handleApi(post('/api/publish', { ...body, base: 'c1', products: [{ ...products[0], kind: 'x' }] }), env);
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /Tip necunoscut/);
    assert.equal(gh.db.head, 'c1');
  } finally {
    globalThis.fetch = realFetch;
  }
});
