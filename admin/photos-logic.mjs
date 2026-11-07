/* ═══════════════════════════════════════════════════════════════
   Pozele genților — partea de calcul, fără nimic din browser
   ───────────────────────────────────────────────────────────────
   Modul ES, folosit și de panou (import dinamic din photos.js) și
   de teste (node --test). Nu atinge DOM-ul, canvasul sau fișierele:
   primește numere și octeți, întoarce numere.

     detectBars(rgba, w, h)       cât se taie din fiecare margine
     frameRect(cw, ch, zoom, px, py)   cadrul 4:5 în zona rămasă
     outputSize(rw, rh, maxSide, scale) dimensiunile finale, 4:5 exact
     fitEncode(...)               scade calitatea, apoi mărimea, până încape
   ═══════════════════════════════════════════════════════════════ */

export const ASPECT_W = 4;
export const ASPECT_H = 5;
export const MAX_SIDE = 1400;
export const MAX_ZOOM = 3;

function dist(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

/* Culoarea dominantă a unei linii (rând sau coloană) și ce parte din
   pixeli e aproape de ea. Culorile se grupează pe găleți de câte 8. */
function lineStat(data, start, step, count, tol) {
  const buckets = new Map();
  for (let i = 0, p = start; i < count; i++, p += step) {
    const key = (data[p] >> 3) * 1024 + (data[p + 1] >> 3) * 32 + (data[p + 2] >> 3);
    const b = buckets.get(key);
    if (b) b.n++; else buckets.set(key, { n: 1, c: [data[p], data[p + 1], data[p + 2]] });
  }
  let best = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  let near = 0;
  for (let i = 0, p = start; i < count; i++, p += step) {
    if (Math.abs(data[p] - best.c[0]) <= tol && Math.abs(data[p + 1] - best.c[1]) <= tol
        && Math.abs(data[p + 2] - best.c[2]) <= tol) near++;
  }
  return { color: best.c, frac: near / count };
}

/* Cât din linie e aproape (± tol) de culoarea `ref`. */
function lineNear(data, start, step, count, ref, tol) {
  let near = 0;
  for (let i = 0, p = start; i < count; i++, p += step) {
    if (Math.abs(data[p] - ref[0]) <= tol && Math.abs(data[p + 1] - ref[1]) <= tol
        && Math.abs(data[p + 2] - ref[2]) <= tol) near++;
  }
  return near / count;
}

/* Taie dinspre margine spre interior bara de aplicație (status bar, bară de
   navigare, margini laterale).
   Culoarea barei = cea dominantă pe linia de la margine, care trebuie să fie
   uniformă (≥ `frac`, 96%). De acolo, mergând spre interior, fiecare linie e:
     - CURATĂ  : ≥ `frac` (96%) din pixeli sunt de o singură culoare, iar
                 aceea e (aproape) culoarea barei (regula veche, neschimbată);
     - MURDARĂ : ≥ `dirty` (60%) din pixeli au culoarea barei (oră, iconițe,
                 titlu, butoane din bară; până la ~40% pixeli diferiți);
     - CONȚINUT: sub `dirty` → bara s-a terminat, ne oprim.
   Bara se termină la ULTIMA linie curată de dinaintea conținutului, cu
   condiția ca liniile murdare dintre două linii curate să fie cel mult
   `maxGap` la rând (implicit 12% din dimensiune, minimum 8), și dacă ultima
   linie curată e urmată direct de conținut (o margine tăioasă; în rest
   doar linii ≥ 90% de culoarea barei). Altfel
   (fundal de studio cu umbre sau gradient, geantă lipită de margine,
   linii murdare fără linii curate după ele) se taie doar porțiunea
   perfect uniformă de la margine, ca înainte. Maximum `maxFrac` (25%)
   din dimensiune pe fiecare margine. Întoarce { top, bottom, left, right }
   în pixeli. */
export function detectBars(data, w, h, opts = {}) {
  const tol = opts.tol ?? 10;
  const frac = opts.frac ?? 0.96;
  const dirty = opts.dirty ?? 0.6;
  const maxFrac = opts.maxFrac ?? 0.25;
  const out = { top: 0, bottom: 0, left: 0, right: 0 };
  if (!(w > 8 && h > 8) || data.length < w * h * 4) return out;
  const maxV = Math.floor(h * maxFrac), maxH = Math.floor(w * maxFrac);

  /* statAt(0) dă culoarea barei; nearAt(n, ref) dă ce parte din linia n e de acea culoare */
  const walk = (limit, statAt, nearAt, size) => {
    if (limit < 1) return 0;
    const first = statAt(0);
    if (first.frac < frac) return 0;
    const ref = first.color;
    const maxGap = opts.maxGap ?? Math.max(8, Math.round(size * 0.12));
    let end = 0, gap = 0, firstDirty = -1, tailOk = true;
    for (let n = 0; n < limit; n++) {
      const st = n ? statAt(n) : first;
      if (st.frac >= frac && dist(ref, st.color) <= tol * 1.5) { end = n + 1; gap = 0; tailOk = true; continue; }
      const f = nearAt(n, ref);
      if (firstDirty < 0) firstDirty = n;
      if (f >= dirty && ++gap <= maxGap) { if (f < 0.9) tailOk = false; continue; }
      /* Lungimea bare se acceptă doar dacă ultima linie curată e urmată DIRECT de
         conținut (sub `dirty`), eventual după câteva linii aproape curate
         (≥ 90%, de ex. zgomot JPEG): marginea unei bare e tăioasă. Un fundal de studio
         se strică treptat (umbre, gradient), nu brusc: acolo rămâne doar porțiunea
         de la margine fără nicio linie murdară. */
      return f < dirty && tailOk ? end : firstDirty;
    }
    return end;
  };
  const rowStat = (y) => lineStat(data, y * w * 4, 4, w, tol);
  const rowNear = (y, ref) => lineNear(data, y * w * 4, 4, w, ref, tol);
  out.top = walk(maxV, (n) => rowStat(n), (n, r) => rowNear(n, r), h);
  out.bottom = walk(maxV, (n) => rowStat(h - 1 - n), (n, r) => rowNear(h - 1 - n, r), h);

  const y0 = out.top, rows = h - out.top - out.bottom;
  const colStat = (x) => lineStat(data, (y0 * w + x) * 4, w * 4, rows, tol);
  const colNear = (x, ref) => lineNear(data, (y0 * w + x) * 4, w * 4, rows, ref, tol);
  out.left = walk(rows > 0 ? maxH : 0, (n) => colStat(n), (n, r) => colNear(n, r), w);
  out.right = walk(rows > 0 ? maxH : 0, (n) => colStat(w - 1 - n), (n, r) => colNear(w - 1 - n, r), w);
  return out;
}

/* Cadrul 4:5 în zona de lățime cw și înălțime ch (după tăiere).
   La zoom 1 cadrul e cel mai mare 4:5 care încape; zoom > 1 îl micșorează.
   px, py în [0,1]: 0 = lipit de stânga/sus, 0.5 = centrat, 1 = dreapta/jos. */
export function frameRect(cw, ch, zoom = 1, px = 0.5, py = 0.5) {
  const z = Math.min(MAX_ZOOM, Math.max(1, Number.isFinite(zoom) ? zoom : 1));
  const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
  let bw = cw, bh = cw * ASPECT_H / ASPECT_W;
  if (bh > ch) { bh = ch; bw = ch * ASPECT_W / ASPECT_H; }
  const w = bw / z, h = bh / z;
  return { x: (cw - w) * clamp01(px), y: (ch - h) * clamp01(py), w, h };
}

/* Dimensiunile finale: 4:5 exact (înălțimea multiplu de 5), latura lungă
   (înălțimea) maximum maxSide * scale, fără să mărim poza. */
export function outputSize(rw, rh, maxSide = MAX_SIDE, scale = 1) {
  const h0 = Math.min(rh, maxSide * scale);
  const h = Math.max(5, Math.floor(h0 / ASPECT_H) * ASPECT_H);
  return { w: h / ASPECT_H * ASPECT_W, h };
}

/* Caută cea mai bună variantă care încape sub `limit` octeți.
   encode(w, h, q) întoarce (promisiune de) un obiect cu `size`, sau null
   dacă formatul nu e acceptat. Se coboară calitatea de la q0 la qMin în
   pași, apoi se micșorează poza (× shrink) și se reia, de cel mult `rounds` ori.
   Întoarce { blob, w, h, q, shrunk } sau null. */
export async function fitEncode(encode, rw, rh, opts) {
  const { q0, limit } = opts;
  const qMin = opts.qMin ?? 0.5, qStep = opts.qStep ?? 0.08;
  const shrink = opts.shrink ?? 0.85, rounds = opts.rounds ?? 8;
  const maxSide = opts.maxSide ?? MAX_SIDE;
  let scale = 1;
  for (let r = 0; r < rounds; r++) {
    const { w, h } = outputSize(rw, rh, maxSide, scale);
    for (let q = q0; q >= qMin - 1e-9; q -= qStep) {
      const blob = await encode(w, h, Math.round(q * 100) / 100);
      if (!blob) return null;
      if (blob.size <= limit) return { blob, w, h, q: Math.round(q * 100) / 100, shrunk: r > 0 };
    }
    scale *= shrink;
  }
  return null;
}
