import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../server/api.js';
import { startMockGithub } from '../tools/mock-github.mjs';
import { detectBars, frameRect, outputSize, fitEncode } from '../admin/photos-logic.mjs';

/* Captură sintetică: bare uniforme și, pe mijloc, conținut cu zgomot. */
function shot(w, h, { top = 0, bottom = 0, left = 0, right = 0, topColor = [255, 255, 255], botColor = [0, 0, 0], sideColor = [250, 250, 250] } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    let c;
    if (y < top) c = topColor;
    else if (y >= h - bottom) c = botColor;
    else if (x < left || x >= w - right) c = sideColor;
    else c = [40 + rnd() * 160, 60 + rnd() * 150, 90 + rnd() * 140];
    d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
  }
  return d;
}

test('detectBars: bare sus și jos, culori diferite', () => {
  const r = detectBars(shot(200, 400, { top: 40, bottom: 30 }), 200, 400);
  assert.deepEqual(r, { top: 40, bottom: 30, left: 0, right: 0 });
});

test('detectBars: și bare laterale', () => {
  const r = detectBars(shot(200, 400, { top: 20, bottom: 20, left: 12, right: 8 }), 200, 400);
  assert.deepEqual(r, { top: 20, bottom: 20, left: 12, right: 8 });
});

test('detectBars: poză fără bare rămâne neatinsă', () => {
  assert.deepEqual(detectBars(shot(120, 160), 120, 160), { top: 0, bottom: 0, left: 0, right: 0 });
});

test('detectBars: toleranță mică la zgomot ușor în bară', () => {
  const d = shot(100, 200, { top: 30 });
  for (let i = 0; i < 100 * 30; i++) d[i * 4] -= (i % 7 === 0 ? 4 : 0);
  assert.equal(detectBars(d, 100, 200).top, 30);
});

test('detectBars: o bară cu un mic logo la mijloc tot se taie', () => {
  const d = shot(200, 300, { top: 30 });
  for (let y = 0; y < 30; y++) for (let x = 95; x < 100; x++) { const p = (y * 200 + x) * 4; d[p] = d[p + 1] = d[p + 2] = 20; }
  assert.equal(detectBars(d, 200, 300).top, 30);
});

test('detectBars: limita de siguranță de 25% pe margine', () => {
  const r = detectBars(shot(100, 200, { top: 120, bottom: 0 }), 100, 200);
  assert.equal(r.top, 50);
  const all = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  const u = detectBars(all, 100, 100);
  assert.ok(u.top <= 25 && u.bottom <= 25 && u.left <= 25 && u.right <= 25);
});

test('detectBars: barele diferite de culoarea de la margine opresc tăierea', () => {
  const d = shot(100, 200, { top: 20 });
  for (let y = 10; y < 20; y++) for (let x = 0; x < 100; x++) { const p = (y * 100 + x) * 4; d[p] = d[p + 1] = d[p + 2] = 120; }
  assert.equal(detectBars(d, 100, 200).top, 10);
});

test('detectBars: intrări prea mici sau lipsă nu strică nimic', () => {
  assert.deepEqual(detectBars(new Uint8ClampedArray(16), 2, 2), { top: 0, bottom: 0, left: 0, right: 0 });
});

test('frameRect: 4:5 centrat, pe zonă mai lată și pe zonă mai înaltă', () => {
  const wide = frameRect(1000, 1000);
  assert.equal(wide.h, 1000); assert.equal(wide.w, 800); assert.equal(wide.x, 100); assert.equal(wide.y, 0);
  const tall = frameRect(800, 2000);
  assert.equal(tall.w, 800); assert.equal(tall.h, 1000); assert.equal(tall.y, 500);
  for (const f of [wide, tall]) assert.ok(Math.abs(f.w / f.h - 0.8) < 1e-9);
});

test('frameRect: zoom micșorează cadrul, poziția rămâne în zonă', () => {
  const f = frameRect(1000, 1000, 2, 1, 1);
  assert.equal(f.w, 400); assert.equal(f.h, 500);
  assert.equal(f.x + f.w, 1000); assert.equal(f.y + f.h, 1000);
  const g = frameRect(1000, 1000, 99, -3, 7);
  assert.equal(g.w, 800 / 3);
  assert.ok(g.x >= 0 && g.y >= 0 && g.x + g.w <= 1000 && g.y + g.h <= 1000);
  assert.deepEqual(frameRect(1000, 1000, NaN, NaN, NaN), frameRect(1000, 1000, 1, 0.5, 0.5));
});

test('outputSize: latura lungă ≤ 1400, raport 4:5 exact, fără mărire', () => {
  assert.deepEqual(outputSize(2400, 3000), { w: 1120, h: 1400 });
  assert.deepEqual(outputSize(400, 500), { w: 400, h: 500 });
  for (const rh of [1, 7, 333, 999, 1399, 1400, 1401, 5000]) {
    const o = outputSize(rh * 0.8, rh);
    assert.ok(o.h <= 1400 && o.h >= 5);
    assert.equal(o.w * 5, o.h * 4);
  }
  const s = outputSize(2400, 3000, 1400, 0.5);
  assert.deepEqual(s, { w: 560, h: 700 });
});

test('fitEncode: prima calitate dacă încape', async () => {
  const calls = [];
  const r = await fitEncode(async (w, h, q) => { calls.push(q); return { size: 100 }; }, 2400, 3000, { q0: 0.85, limit: 1000 });
  assert.equal(r.q, 0.85); assert.equal(r.shrunk, false); assert.equal(calls.length, 1);
  assert.deepEqual([r.w, r.h], [1120, 1400]);
});

test('fitEncode: coboară calitatea, apoi mărimea', async () => {
  const enc = async (w, h, q) => ({ size: w * h * q * 0.4 });
  const r = await fitEncode(enc, 2400, 3000, { q0: 0.85, limit: 400 * 1024 });
  assert.ok(r.blob.size <= 400 * 1024);
  assert.ok(r.shrunk || r.q < 0.85);
  assert.equal(r.w * 5, r.h * 4);
});

test('fitEncode: format neacceptat (null) → null; imposibil → null', async () => {
  assert.equal(await fitEncode(async () => null, 100, 125, { q0: 0.8, limit: 10 }), null);
  assert.equal(await fitEncode(async () => ({ size: 1e9 }), 100, 125, { q0: 0.8, limit: 10 }), null);
});

/* ───────── capturi realiste: bare cu oră, iconițe, titlu, butoane ───────── */

const WHITE = [255, 255, 255], BLACK = [0, 0, 0], INK = [30, 30, 30];

function canvas(w, h, bg = WHITE) {
  const d = new Uint8ClampedArray(w * h * 4);
  const c = {
    w, h, d,
    rect(x0, y0, x1, y1, col) {
      for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
        const p = (y * w + x) * 4; d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
      }
      return c;
    },
    /* conținut de fotografie: zgomot pe tot dreptunghiul */
    photo(x0, y0, x1, y1, seed = 3) {
      let s = seed; const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const p = (y * w + x) * 4;
        d[p] = 30 + r() * 190; d[p + 1] = 40 + r() * 170; d[p + 2] = 60 + r() * 150; d[p + 3] = 255;
      }
      return c;
    },
  };
  return c.rect(0, 0, w, h, bg);
}

const W = 390, H = 844;
/* status bar de 96 px: ora (stânga), semnal + wifi + baterie (dreapta). Pe un rând
   „murdare" sunt ~12–20% pixeli diferiți, text de ~10 px înălțime. */
function statusBar(c, barH = 96, bg = WHITE, ink = INK) {
  const y0 = Math.round(barH * 0.4), y1 = y0 + 10;
  c.rect(20, y0, 20 + 44, y1, ink);                 // „9:41"
  c.rect(W - 120, y0, W - 100, y1, ink);            // semnal
  c.rect(W - 92, y0, W - 70, y1, ink);              // wifi
  c.rect(W - 62, y0, W - 24, y1, ink);              // baterie
}
const approx = (v, want, tol, msg) => assert.ok(Math.abs(v - want) <= tol, `${msg}: ${v}, aștept ${want} ± ${tol}`);
const NONE = { top: 0, bottom: 0, left: 0, right: 0 };

test('detectBars (a): status bar de 96 px cu oră + semnal + wifi + baterie se taie aproape întreg', () => {
  const c = canvas(W, H).photo(0, 96, W, H - 150);
  statusBar(c);
  const r = detectBars(c.d, W, H);
  approx(r.top, 96, 2, 'sus');
  assert.equal(r.left, 0); assert.equal(r.right, 0);
});

test('detectBars (a2): la fel pe fundal închis (dark mode) și pe captură scurtă', () => {
  const c = canvas(W, 500, BLACK).photo(0, 96, W, 400);
  statusBar(c, 96, BLACK, [240, 240, 240]);
  approx(detectBars(c.d, W, 500).top, 96, 2, 'sus, dark');
});

test('detectBars (b): bară de navigare de 150 px cu 3–5 iconițe', () => {
  for (const icons of [3, 4, 5]) {
    const c = canvas(W, H, BLACK).photo(0, 0, W, H - 150);
    const y0 = H - 150 + 50;                         // iconițe pe la mijlocul barei
    for (let i = 0; i < icons; i++) { const x = 30 + i * Math.floor((W - 60) / icons); c.rect(x, y0, x + 24, y0 + 28, [235, 235, 235]); }
    const r = detectBars(c.d, W, H);
    approx(r.bottom, 150, 2, `jos, ${icons} iconițe`);
    assert.equal(r.top, 0);
  }
});

test('detectBars (c): bare sus + jos + laterale în același timp', () => {
  const c = canvas(W, H);
  c.photo(24, 96, W - 16, H - 150);
  statusBar(c);
  const y0 = H - 150 + 50;
  for (let i = 0; i < 4; i++) c.rect(60 + i * 80, y0, 84 + i * 80, y0 + 28, INK);
  const r = detectBars(c.d, W, H);
  approx(r.top, 96, 2, 'sus'); approx(r.bottom, 150, 2, 'jos');
  assert.equal(r.left, 24); assert.equal(r.right, 16);
});

test('detectBars (d): titlu/logo mare în bară (30–40% pixeli diferiți) face parte din bară și se taie', () => {
  /* Comportament ales: ce e în interiorul barei, înconjurat de fundalul barei și
     urmat de rânduri curate, e „aplicație" (titlu, logo, butoane). Un titlu pe
     care rândurile murdare ajung la ~38% pixeli diferiți tot se taie. */
  const c = canvas(W, H).photo(0, 130, W, H);
  statusBar(c);
  c.rect(100, 70, 100 + 148, 82, INK);               // titlu: 148 din 390 px ≈ 38%
  approx(detectBars(c.d, W, H).top, 130, 2, 'sus');
});

test('detectBars (d2): un bloc cu >40% pixeli diferiți nu e bară: conținutul real nu se taie', () => {
  /* după o bară curată de 40 px urmează un banner cu 55% pixeli diferiți, apoi
     fundalul curat revine — NU se taie bannerul (limita „murdar" e 60% culoare de fond) */
  const c = canvas(W, H).photo(0, 120, W, H);
  c.rect(0, 40, 215, 80, INK);                              // 215/390 = 55% diferit pe rândurile 40–79
  const r = detectBars(c.d, W, H);
  assert.equal(r.top, 40);
});

test('detectBars (e): fotografie reală simulată (gradient + zgomot pe margine) nu se taie', () => {
  const c = canvas(W, H);
  let s = 11; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, g = 120 + 90 * (y / H) + 30 * (x / W) + (rnd() - 0.5) * 16;
    c.d[p] = g; c.d[p + 1] = g * 0.8; c.d[p + 2] = g * 0.7;
  }
  assert.deepEqual(detectBars(c.d, W, H), NONE);
});

test('detectBars (f): fundal de studio uniform cu geantă lipită de margine nu mănâncă geanta', () => {
  const bg = [236, 232, 226];
  const c = canvas(400, 500, bg);
  c.photo(0, 160, 170, 420, 5);                       // geantă lipită de marginea stângă (43% din lățime)
  c.photo(120, 60, 330, 120, 6);                      // și un accesoriu sus, la 60 px de margine
  const r = detectBars(c.d, 400, 500);
  assert.equal(r.left, 0, 'geanta lipită de stânga nu se taie');
  assert.equal(r.top, 60, 'doar fundalul gol de deasupra (curat) se taie, nu accesoriul');
  /* geanta lipită chiar de margine, pe jos */
  const e = canvas(400, 500, bg).photo(60, 330, 340, 500, 7);
  assert.equal(detectBars(e.d, 400, 500).bottom, 0);
});

test('detectBars (f2): rânduri murdare fără rânduri curate după ele nu se taie', () => {
  const c = canvas(W, H).photo(0, 130, W, H);
  c.rect(0, 0, W, 40, WHITE);                         // 40 curate
  for (let y = 40; y < 130; y++) c.rect(0, y, 70, y + 1, INK);   // apoi 82% fond, dar niciodată curate
  assert.equal(detectBars(c.d, W, H).top, 40);
});

test('detectBars (i): pragul de uniformitate — 96% curat, 60% murdar; sub 60% oprește', () => {
  /* 80% fond + 20% zgomot pe toate rândurile de după bara curată de 30 px: nu se taie nimic în plus */
  const c = canvas(200, 400).photo(0, 100, 200, 400);
  for (let y = 30; y < 100; y++) c.rect(0, y, 40, y + 1, INK);            // 80% fond
  assert.equal(detectBars(c.d, 200, 400).top, 30, '80% fond, fără rând curat după: doar bara curată');
  /* dacă după ele revine un rând curat, tot blocul face parte din bară */
  const e = canvas(200, 400).photo(0, 100, 200, 400);
  for (let y = 30; y < 70; y++) e.rect(0, y, 40, y + 1, INK);
  assert.equal(detectBars(e.d, 200, 400).top, 100);
  /* 50% fond: sub prag, bara se oprește acolo, chiar dacă sub ele revine fundalul */
  const f = canvas(200, 400).photo(0, 100, 200, 400);
  for (let y = 30; y < 40; y++) f.rect(0, y, 100, y + 1, INK);
  assert.equal(detectBars(f.d, 200, 400).top, 30);
});

test('outputSize (h): mereu 4:5 exact (lățime = 4k, înălțime = 5k), inclusiv la dimensiuni impare', () => {
  let n = 0;
  for (const rh of [1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 99, 101, 333, 777, 1081, 1399, 1400, 1401, 2999, 4001, 5000, 12345]) {
    for (const rw of [1, 3, 777, 1081, rh]) for (const scale of [1, 0.85, 0.5, 0.3]) {
      const o = outputSize(rw, rh, 1400, scale);
      const k = o.h / 5;
      assert.ok(Number.isInteger(k) && k >= 1, `h=${o.h} multiplu de 5 (rh=${rh})`);
      assert.equal(o.w, 4 * k);
      assert.ok(o.h <= Math.max(5, 1400 * scale));
      n++;
    }
  }
  assert.ok(n > 100);
});

/* (g) JPEG validat pe primii 3 octeți, prin handleApi + GitHub simulat (doar local) */
test('server /api/blob (g): JPEG = FF D8 FF; FF D8 00, 00 D8 FF, FF D9 FF și FF D8 sunt respinse', async () => {
  const mock = await startMockGithub();
  const pass = 'parola-de-test-' + Math.random().toString(36).slice(2);
  const env = { ...mock.env, ADMIN_PASSWORD: pass };
  const call = async (bytes) => {
    const res = await handleApi(new Request('https://admin.test/api/blob', {
      method: 'POST', body: JSON.stringify({ password: pass, data: Buffer.from(bytes).toString('base64') }),
      headers: { 'cf-connecting-ip': '10.9.9.9' },
    }), env);
    return { status: res.status, json: await res.json() };
  };
  const posts = () => mock.state.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/git/blobs')).length;
  const tail = Array(40).fill(7);
  try {
    assert.equal((await call([0xFF, 0xD8, 0xFF, 0xE0, ...tail])).status, 200);
    assert.equal(posts(), 1);
    for (const head of [[0xFF, 0xD8, 0x00], [0x00, 0xD8, 0xFF], [0xFF, 0xD9, 0xFF], [0xFE, 0xD8, 0xFF]]) {
      const r = await call([...head, 0xE0, ...tail]);
      assert.equal(r.status, 400, head.join(','));
      assert.equal(r.json.error, 'Poza trebuie să fie JPEG sau WebP.');
    }
    assert.equal((await call([0xFF, 0xD8])).status, 400, 'prea scurt');
    assert.equal(posts(), 1, 'nimic fals n-a ajuns în GitHub');
  } finally { await mock.close(); }
});
