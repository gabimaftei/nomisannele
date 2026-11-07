/* Test cap-coadă: handleApi (server/api.js) + GitHub simulat
   (tools/mock-github.mjs), pornit din copia repo-ului. Fără rețea reală,
   fără token real, nimic scris în repo.  Rulare: node --test test/ */
import test from 'node:test';
import assert from 'node:assert/strict';

import { handleApi } from '../server/api.js';
import { startMockGithub } from '../tools/mock-github.mjs';
import { installCacheShim, removeCacheShim, makeLimiter } from '../tools/local-env.mjs';

const PASS = 'parola-de-test-' + Math.random().toString(36).slice(2);
let ipN = 0;

async function setup(extraEnv = {}) {
  const mock = await startMockGithub();
  const env = { ...mock.env, ADMIN_PASSWORD: PASS, ...extraEnv };
  const ip = `10.0.0.${++ipN}`;
  const call = async (route, body = {}, { password = PASS, headers = {} } = {}) => {
    const res = await handleApi(new Request('https://admin.test' + route, {
      method: 'POST', body: JSON.stringify({ password, ...body }),
      headers: { 'cf-connecting-ip': ip, ...headers },
    }), env);
    return { status: res.status, json: await res.json() };
  };
  const data = async () => (await call('/api/data')).json;
  return { mock, env, call, data };
}
const jpeg = (n = 64) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(n, 7)]).toString('base64');
const bag = (over = {}) => ({
  id: 'noua', name: 'Nouă', photos: 1, kind: 'umar', sold: false,
  dims: { h: 28, w: 31, d: 9 }, madeFrom: 6, tint: 'denim', badge: null,
  ro: { tagline: 'Siluetă', description: 'Descriere', pockets: '3 buzunare', closure: 'Buton' },
  en: { tagline: 'Shape', description: 'Description', pockets: '3 pockets', closure: 'Button' },
  ...over,
});
const blobPosts = (mock) => mock.state.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/git/blobs')).length;

test('parolă greșită: 401, fără nicio cerere către GitHub', async () => {
  const { mock, call } = await setup();
  try {
    for (const route of ['/api/data', '/api/blob', '/api/publish']) {
      const r = await call(route, {}, { password: 'nu-e-asta' });
      assert.equal(r.status, 401);
      assert.match(r.json.error, /Parolă greșită/);
    }
    assert.equal(mock.state.requests.length, 0);
  } finally { await mock.close(); }
});

test('limitarea: după prea multe greșeli, 429 și chiar parola bună e refuzată', async () => {
  installCacheShim();
  const { mock, call } = await setup({ PASSWORD_LIMIT: makeLimiter(2) });
  try {
    assert.equal((await call('/api/data', {}, { password: 'x' })).status, 401);
    assert.equal((await call('/api/data', {}, { password: 'x' })).status, 401);
    const third = await call('/api/data', {}, { password: 'x' });
    assert.equal(third.status, 429);
    assert.match(third.json.error, /Prea multe parole greșite/);
    /* adresa e blocată: parola bună nu mai trece */
    assert.equal((await call('/api/data')).status, 429);
  } finally { removeCacheShim(); await mock.close(); }
});

test('HTML în texte și `base` lipsă: 400, nimic scris', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    const html = await call('/api/publish', {
      base: d.head, products: d.products, content: { ro: { ...d.content.ro, 'hero.title1': '<img src=x onerror=alert(1)>' }, en: d.content.en },
    });
    assert.equal(html.status, 400);
    assert.match(html.json.error, /< sau >/);
    const ext = await call('/api/publish', {
      base: d.head, products: d.products, content: { ro: { ...d.content.ro, 'collection.note': 'x <a href="https://rau.ro">y</a>' }, en: d.content.en },
    });
    assert.equal(ext.status, 400);
    const ok = await call('/api/publish', {
      base: d.head, products: d.products,
      content: { ro: { ...d.content.ro, 'collection.note': 'Scrie: <a href="#contact">acum</a>.' }, en: d.content.en },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const brk = await call('/api/publish', {
      base: (await data()).head, products: d.products,
      content: { ro: { ...d.content.ro, 'collection.note': 'Scrie [aici](#contact), mulțumim.' }, en: d.content.en },
    });
    assert.equal(brk.status, 200, JSON.stringify(brk.json));
    const idx = mock.readText('index.html');
    assert.ok(idx.includes('Scrie [aici](#contact), mulțumim.'), 'paranteze rămân text');
    assert.ok(!idx.includes('>aici</a>'), 'fără link din paranteze');
    const d2 = await data();
    const nobase = await call('/api/publish', { products: d2.products, content: d2.content });
    assert.equal(nobase.status, 400);
    assert.match(nobase.json.error, /reîncărcat/);
  } finally { await mock.close(); }
});

test('cap-coadă: date, modificare, poză, publicare, commit cu fișierele generate', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    assert.equal(d.head, mock.head);
    assert.ok(d.products.length >= 1);

    const b = await call('/api/blob', { data: jpeg() });
    assert.equal(b.status, 200);
    assert.match(b.json.sha, /^[0-9a-f]{40}$/);

    const products = d.products.map((p, i) => (i === 0 ? { ...p, name: 'Nume schimbat' } : p)).concat(bag());
    const content = { ro: { ...d.content.ro, 'hero.title1': 'Titlu & bun' }, en: d.content.en };
    const before = mock.head;
    const r = await call('/api/publish', {
      base: d.head, products, content, message: 'Geantă nouă',
      images: { 'assets/images/noua-1.jpg': b.json.sha },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.commit, mock.head);
    assert.equal(r.json.bags, products.length);
    const [top, prev] = mock.log;
    assert.equal(prev.sha, before);
    assert.match(top.message, /^Geantă nouă\n\nSalvat din panoul de la \/admin\./);

    const products_js = mock.readText('assets/js/products.js');
    assert.match(products_js, /"name": "Nume schimbat"/);
    assert.match(products_js, /"id": "noua"/);
    assert.match(mock.readText('index.html'), /Titlu &amp; bun/);
    assert.match(mock.readText('assets/js/content.js'), /Titlu & bun/);
    assert.deepEqual(JSON.parse(mock.readText('data/posts.json')), { posts: [] });
    assert.match(mock.readText('sitemap.xml'), /<urlset[\s\S]*<loc>https:\/\/[^<]+\/<\/loc>/);
    assert.match(mock.readText('404.html'), /Pagina asta nu există/);
    assert.equal(mock.readFile('assets/images/noua-1.jpg').toString('base64'), jpeg());

    /* citit înapoi prin API, aceleași date */
    const d2 = await data();
    assert.equal(d2.head, mock.head);
    assert.equal(d2.products.at(-1).id, 'noua');
    assert.equal(d2.content.ro['hero.title1'], 'Titlu & bun');
  } finally { await mock.close(); }
});

test('HTML-ul generat nu conține style= (CSP strict)', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    const r = await call('/api/publish', { base: d.head, products: d.products, content: d.content });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    for (const f of ['index.html', '404.html']) {
      assert.ok(!/<[^>]+\sstyle\s*=/i.test(mock.readText(f)), `${f} are style=`);
    }
  } finally { await mock.close(); }
});

test('conflict: al doilea publish cu `base` vechi dă 409 și nu suprascrie nimic', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    const mk = (name) => ({ base: d.head, content: d.content, products: d.products.map((p, i) => (i === 0 ? { ...p, name } : p)) });
    assert.equal((await call('/api/publish', mk('Primul'))).status, 200);
    const headAfter = mock.head;
    const snapshot = mock.readText('assets/js/products.js');
    const second = await call('/api/publish', mk('Al doilea'));
    assert.equal(second.status, 409);
    assert.match(second.json.error, /s-a publicat altceva/);
    assert.equal(mock.head, headAfter);
    assert.equal(mock.readText('assets/js/products.js'), snapshot);
    assert.match(snapshot, /"name": "Primul"/);
  } finally { await mock.close(); }
});

test('cursă: ramura se mișcă între citire și PATCH → 422 de la GitHub, 409 la panou', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    mock.state.beforePatch = () => mock.advance();
    const r = await call('/api/publish', {
      base: d.head, products: d.products.map((p, i) => (i === 0 ? { ...p, name: 'Cursă' } : p)), content: d.content,
    });
    assert.equal(r.status, 409);
    /* au rămas doar commit-ul străin; al nostru nu a devenit capul ramurii */
    assert.equal(mock.log[0].message, 'Commit din altă parte');
    assert.doesNotMatch(mock.readText('assets/js/products.js'), /"name": "Cursă"/);
  } finally { await mock.close(); }
});

test('mock: PATCH non-fast-forward → 422, ref inexistent → 404', async () => {
  const mock = await startMockGithub();
  try {
    const h = { authorization: 'Bearer fals', 'content-type': 'application/json' };
    const old = mock.head;
    mock.advance();
    const mkCommit = async (parent) => {
      const c = await (await fetch(`${mock.url}/repos/o/r/git/commits/${old}`, { headers: h })).json();
      const r = await fetch(`${mock.url}/repos/o/r/git/commits`, { method: 'POST', headers: h, body: JSON.stringify({ message: 'x', tree: c.tree.sha, parents: [parent] }) });
      return (await r.json()).sha;
    };
    const stale = await mkCommit(old);
    const patch = (sha) => fetch(`${mock.url}/repos/o/r/git/refs/heads/main`, { method: 'PATCH', headers: h, body: JSON.stringify({ sha, force: false }) });
    const bad = await patch(stale);
    assert.equal(bad.status, 422);
    assert.match((await bad.json()).message, /not a fast forward/);
    assert.equal((await fetch(`${mock.url}/repos/o/r/git/ref/heads/alta`, { headers: h })).status, 404);
    assert.equal((await fetch(`${mock.url}/repos/o/r/git/blobs/${'a'.repeat(40)}`, { headers: h })).status, 404);
    assert.equal((await fetch(`${mock.url}/repos/o/r/git/ref/heads/main`)).status, 401);
  } finally { await mock.close(); }
});

test('poze respinse: prea mare, ne-JPEG, cale nepermisă, amprentă falsă', async () => {
  const { mock, call, data } = await setup();
  try {
    const big = await call('/api/blob', { data: jpeg(1024 * 1024) });
    assert.equal(big.status, 413);
    assert.match(big.json.error, /prea mare/);
    const png = await call('/api/blob', { data: Buffer.from([0x89, 0x50, 0x4E, 0x47, 1, 2, 3, 4, 5]).toString('base64') });
    assert.equal(png.status, 400);
    assert.match(png.json.error, /JPEG/);
    assert.equal((await call('/api/blob', { data: 'nu e base64!' })).status, 400);
    assert.equal(blobPosts(mock), 0, 'nimic nu a ajuns în GitHub');

    const d = await data();
    const pub = (images) => call('/api/publish', { base: d.head, products: d.products, content: d.content, images });
    const sha = 'a'.repeat(40);
    for (const path of ['assets/js/app.js', 'index.html', 'assets/images/../x.jpg', 'assets/images/UN-1.jpg', 'assets/images/x-1.png']) {
      const r = await pub({ [path]: sha });
      assert.equal(r.status, 400, path);
      assert.match(r.json.error, /nepermisă/);
    }
    assert.equal((await pub({ 'assets/images/buton-1.jpg': 'nu-e-sha' })).status, 400);
    assert.equal((await pub({ 'assets/images/buton-1.jpg': { from: 'assets/images/nu-exista-1.jpg' } })).status, 400);
    assert.equal(mock.log.length, 1, 'niciun commit nou');
  } finally { await mock.close(); }
});

test('prețul și cheile necunoscute nu ajung în fișiere; textele cu cheie nouă sunt respinse', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    /* cheie necunoscută în texte: respinsă */
    const badContent = await call('/api/publish', {
      base: d.head, products: d.products, content: { ro: { ...d.content.ro, 'cheie.noua': 'x' }, en: d.content.en },
    });
    assert.equal(badContent.status, 400);
    assert.match(badContent.json.error, /Text necunoscut: cheie\.noua/);
    assert.equal(mock.log.length, 1);

    /* preț / câmpuri străine pe geantă: curățate (nu intră în fișiere) */
    const withPrice = d.products.map((p, i) => (i === 0 ? { ...p, price: 999, pret: '999 lei', onclick: 'x()', dims: { ...p.dims, z: 1 } } : p));
    const r = await call('/api/publish', { base: d.head, products: withPrice, content: d.content, price: 5 });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    for (const f of ['assets/js/products.js', 'index.html', 'data/posts.json']) {
      assert.doesNotMatch(mock.readText(f), /price|pret|999|onclick/i, f);
    }
    /* tipuri greșite: respinse */
    const d2 = await data();
    const wrong = await call('/api/publish', { base: d2.head, content: d2.content, products: [{ ...d2.products[0], kind: 'inel' }] });
    assert.equal(wrong.status, 400);
    const nul = await call('/api/publish', { base: d2.head, content: d2.content, products: [{ ...d2.products[0], dims: { h: 'mare', w: 1, d: 1 } }] });
    assert.equal(nul.status, 400);
  } finally { await mock.close(); }
});

test('ștergerea unei genți șterge și pozele ei (jpg + webp), dar nu alte poze', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    const gone = d.products.find((p) => p.id === 'roz') || d.products.at(-1);
    const startFiles = mock.filesAtHead();
    const mine = [...startFiles.keys()].filter((p) => new RegExp(`^assets/images/${gone.id}-\\d+\\.(jpg|webp)$`).test(p));
    assert.ok(mine.length >= gone.photos, 'geanta are poze în copia repo-ului');

    const r = await call('/api/publish', {
      base: d.head, content: d.content, products: d.products.filter((p) => p.id !== gone.id),
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const after = mock.filesAtHead();
    for (const p of mine) assert.ok(!after.has(p), `${p} ar fi trebuit șters`);
    assert.doesNotMatch(mock.readText('assets/js/products.js'), new RegExp(`"id": "${gone.id}"`));
    /* celelalte poze rămân neatinse */
    for (const [p, buf] of startFiles) {
      if (p.startsWith('assets/images/') && !mine.includes(p)) assert.ok(after.get(p)?.equals(buf), `${p} atins`);
    }
  } finally { await mock.close(); }
});

test('reordonarea (poze și genți) nu reîncarcă pozele: `from`, zero POST /git/blobs', async () => {
  const { mock, call, data } = await setup();
  try {
    const d = await data();
    const p0 = d.products.find((p) => p.photos >= 2);
    assert.ok(p0, 'o geantă cu cel puțin 2 poze');
    const a = `assets/images/${p0.id}-1.jpg`, b = `assets/images/${p0.id}-2.jpg`;
    const [bytesA, bytesB] = [mock.readFile(a), mock.readFile(b)];
    assert.ok(!bytesA.equals(bytesB), 'pozele diferă, altfel testul nu dovedește nimic');

    const r = await call('/api/publish', {
      base: d.head, content: d.content,
      products: d.products.slice().reverse(),              // ordinea gențile schimbată
      images: { [a]: { from: b }, [b]: { from: a } },      // pozele 1 și 2 schimbate
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(blobPosts(mock), 0, 'nicio poză retrimisă');
    assert.ok(mock.readFile(a).equals(bytesB));
    assert.ok(mock.readFile(b).equals(bytesA));
    const order = mock.readText('assets/js/products.js').match(/"id": "[a-z0-9-]+"/g).map((s) => s.slice(7, -1));
    assert.deepEqual(order, d.products.map((p) => p.id).reverse());
  } finally { await mock.close(); }
});
