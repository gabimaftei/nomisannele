/* ═══════════════════════════════════════════════════════════════
   Rutele panoului
   ───────────────────────────────────────────────────────────────
   POST /api/data      ce e ACUM în repo: genți, texte, articole. Panoul
                       citește de aici, nu de pe site, ca să nu pornească
                       niciodată de la o versiune veche (cache, sau un
                       deploy încă neterminat).
   POST /api/blob      urcă O poză (JPEG) și întoarce amprenta ei. Pozele
                       pleacă una câte una, deci nicio cerere nu devine
                       atât de mare încât să depășească limita de
                       procesor a planului gratuit.
   POST /api/publish   scrie totul într-un singur commit.

   Toate cer parola. Nimic din ce vine din browser nu e crezut pe
   cuvânt: se verifică tot, iar în fișiere ajung doar câmpurile
   cunoscute, curățate.
   ═══════════════════════════════════════════════════════════════ */
import { readHead, listFiles, readText, createBlob, commitTree } from './github.js';
import {
  parseConsts, renderProductsJs, renderContentJs, renderPostsJson,
  renderIndex, renderNotFound, renderSitemap, siteInfo, sortPosts,
} from './render.js';
import { LOCK_SECONDS, isLocked, noteFailure } from './limit.js';

const MAX_BODY = 3 * 1024 * 1024;
const MAX_BLOB = 900 * 1024;

export const KINDS = ['umar', 'rucsac', 'borseta', 'tote'];
export const TINTS = ['denim', 'dark', 'grey', 'pink', 'patchwork'];
const SAFE_ID = /^[a-z0-9-]{1,60}$/;
const PIECE_IMG = /^assets\/images\/[a-z0-9-]{1,60}-[0-9]{1,2}\.(?:jpg|webp)$/;
const BLOG_IMG = /^assets\/blog\/[a-z0-9-]{1,60}\/[0-9]{1,2}\.jpg$/;
const SHA = /^[0-9a-f]{40}$/;

const CONFLICT = 'Între timp s-a publicat altceva (poate dintr-un alt tab). Ca să nu se piardă '
  + 'nimic, salvarea a fost oprită. Copiază ce ai scris, reîncarcă panoul și publică din nou.';

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function tooManyTries() {
  return json(
    { error: `Prea multe parole greșite. Încearcă din nou peste ${LOCK_SECONDS / 60} minute.` },
    429,
    { 'retry-after': String(LOCK_SECONDS) },
  );
}

/* O eroare al cărei mesaj e pentru om, nu pentru programator. */
function fail(message, status = 400) {
  const e = new Error(message);
  e.expose = true;
  e.status = status;
  throw e;
}

/* Comparație în timp constant: fără ea, parola s-ar putea ghici caracter
   cu caracter, măsurând cât durează răspunsul. */
export async function sameSecret(a, b) {
  /* Hash-uri SHA-256 (32 de octeți mereu): nu mai depinde nimic de lungimea parolei. */
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  const ua = new Uint8Array(ha), ub = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function str(v, max, label) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') fail(`${label} nu e text.`);
  const s = v.replace(/\r\n?/g, '\n').trim();
  if (s.length > max) fail(`${label} e prea lung (maximum ${max} de caractere).`);
  return s;
}

function validDate(s) {
  if (typeof s !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  const y = Number(s.slice(0, 4));
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && y >= 2000 && y <= 2100;
}

/* ─────────────── starea repo-ului ─────────────── */

async function loadState(env, withIndex) {
  const head = await readHead(env);
  const files = await listFiles(env, head.tree);
  const [productsTxt, contentTxt, postsTxt, indexHtml] = await Promise.all([
    readText(env, files, 'assets/js/products.js'),
    readText(env, files, 'assets/js/content.js'),
    readText(env, files, 'data/posts.json'),
    withIndex ? readText(env, files, 'index.html') : null,
  ]);
  if (!productsTxt || !contentTxt) throw new Error('Lipsesc fișierele de date din repo.');
  const { PRODUCTS } = parseConsts(productsTxt, ['PRODUCTS']);
  const { CONTENT } = parseConsts(contentTxt, ['CONTENT']);
  return {
    head, files, indexHtml,
    products: PRODUCTS,
    content: CONTENT,
    posts: postsTxt ? (JSON.parse(postsTxt).posts || []) : [],
  };
}

/* ─────────────── verificări ─────────────── */

function num(v, label, id) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 500) {
    fail(`${label} trebuie să fie un număr pozitiv (în cm), la geanta ${id}.`);
  }
  return Math.round(v * 10) / 10;
}

export function checkProducts(products) {
  if (!Array.isArray(products) || !products.length) fail('Lista de genți e goală.');
  if (products.length > 200) fail('Prea multe genți.');
  const seen = new Set();
  return products.map((p) => {
    if (!p || typeof p !== 'object') fail('O geantă nu e validă.');
    if (!SAFE_ID.test(p.id || '')) fail(`Identificator nepermis: ${p.id}`);
    if (seen.has(p.id)) fail(`Două genți au același identificator: ${p.id}`);
    seen.add(p.id);
    const name = str(p.name, 80, 'Numele genții');
    if (!name) fail(`Geanta ${p.id} nu are nume.`);
    if (!KINDS.includes(p.kind)) fail(`Tip necunoscut la ${p.id}: ${p.kind}`);
    if (!TINTS.includes(p.tint)) fail(`Culoare de rezervă necunoscută la ${p.id}: ${p.tint}`);
    if (!Number.isInteger(p.photos) || p.photos < 1 || p.photos > 12) fail(`Număr de poze greșit la ${p.id}`);
    if (p.sold !== undefined && typeof p.sold !== 'boolean') fail(`„Vândută" trebuie să fie da sau nu, la ${p.id}`);
    const d = p.dims;
    if (!d || typeof d !== 'object') fail(`Lipsesc dimensiunile la ${p.id}`);
    const dims = { h: num(d.h, 'Înălțimea', p.id), w: num(d.w, 'Lățimea', p.id), d: num(d.d, 'Adâncimea', p.id) };
    let madeFrom = null;
    if (p.madeFrom !== null && p.madeFrom !== undefined) {
      if (!Number.isInteger(p.madeFrom) || p.madeFrom < 1 || p.madeFrom > 100) {
        fail(`Numărul de perechi de blugi la ${p.id} trebuie să fie între 1 și 100 (sau gol).`);
      }
      madeFrom = p.madeFrom;
    }
    let badge = null;
    if (p.badge !== null && p.badge !== undefined) {
      badge = str(p.badge, 30, 'Eticheta') || null;
    }
    const loc = (l) => ({
      tagline: str(p[l] && p[l].tagline, 120, 'Subtitlul genții'),
      description: str(p[l] && p[l].description, 1500, 'Descrierea genții'),
      pockets: str(p[l] && p[l].pockets, 200, 'Buzunarele genții'),
      closure: str(p[l] && p[l].closure, 100, 'Închiderea genții'),
    });
    const ro = loc('ro');
    const en = loc('en');
    if (!ro.tagline || !ro.description) fail(`Lipsește subtitlul sau descrierea (în română) la ${p.id}`);
    return { id: p.id, name, photos: p.photos, kind: p.kind, sold: !!p.sold, dims, madeFrom, tint: p.tint, badge, ro, en };
  });
}

/* Cheile permise sunt exact cele care există deja în content.js: panoul
   poate schimba textele, dar nu poate inventa chei noi. */
/* Singurul HTML permis: un link intern la collection.note — aceeași formă
   pe care o acceptă inline() din render.js. Orice alt „<" sau ">" e refuzat. */
const NOTE_LINK = /<a href="[#/](?!\/)[a-z0-9\/#-]{0,120}">[^<>]{1,120}<\/a>/;
export function textHasForbiddenHtml(key, value) {
  const rest = key === 'collection.note' ? value.replace(NOTE_LINK, '') : value;
  return /[<>]/.test(rest);
}

export function checkContent(content, allowed) {
  if (!content || typeof content !== 'object') fail('Lipsesc textele.');
  const out = { ro: {}, en: {} };
  for (const lang of ['ro', 'en']) {
    const src = content[lang];
    if (!src || typeof src !== 'object' || Array.isArray(src)) fail('Lipsesc textele.');
    for (const k of Object.keys(src)) if (!allowed.includes(k)) fail(`Text necunoscut: ${k}`);
    for (const k of allowed) {
      if (lang === 'ro' && src[k] === undefined) fail(`Lipsește textul „${k}".`);
      out[lang][k] = str(src[k], 2000, `Textul „${k}"`);
      if (textHasForbiddenHtml(k, out[lang][k])) {
        fail(`Textul „${k}" conține semnele < sau >, care nu sunt permise (doar linkul din nota de la Gențile).`);
      }
    }
  }
  return out;
}

export function checkPosts(posts) {
  if (!Array.isArray(posts) || posts.length > 300) fail('Lista de articole nu e validă.');
  const seen = new Set();
  return sortPosts(posts.map((p) => {
    if (!p || !SAFE_ID.test(p.id || '')) fail(`Identificator de articol nepermis: ${p && p.id}`);
    if (seen.has(p.id)) fail(`Două articole au același identificator: ${p.id}`);
    seen.add(p.id);
    const ro = { title: str(p.ro && p.ro.title, 160, 'Titlul articolului'), body: str(p.ro && p.ro.body, 20000, 'Textul articolului') };
    const en = { title: str(p.en && p.en.title, 160, 'Titlul în engleză'), body: str(p.en && p.en.body, 20000, 'Textul în engleză') };
    if (!ro.title) fail('Un articol n-are titlu în română.');
    if (!validDate(p.date)) fail(`Data articolului „${ro.title}" nu e validă.`);
    if (!Array.isArray(p.photos) || p.photos.length < 1 || p.photos.length > 30) {
      fail(`Articolul „${ro.title}" trebuie să aibă între 1 și 30 de poze.`);
    }
    const photos = p.photos.map((ph) => {
      const w = ph && ph.w, h = ph && ph.h;
      if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4000 || h > 4000) {
        fail(`O poză din „${ro.title}" are dimensiuni nevalide.`);
      }
      return { w, h };
    });
    return { id: p.id, date: p.date, photos, ro, en };
  }));
}

/* Poza e fie o amprentă întoarsă de /api/blob, fie {from: cale existentă}
   — o poză deja în repo care doar își schimbă locul (s-a reordonat). Așa
   o mutare nu înseamnă să descarci și să urci din nou fișierul. */
export function checkImages(images, files) {
  if (images === undefined) return new Map();
  if (!images || typeof images !== 'object' || Array.isArray(images)) fail('Lista de poze nu e validă.');
  const keys = Object.keys(images);
  if (keys.length > 300) fail('Prea multe poze într-o singură salvare.');
  const out = new Map();
  for (const path of keys) {
    if (!PIECE_IMG.test(path) && !BLOG_IMG.test(path)) fail(`Cale de poză nepermisă: ${path}`);
    const v = images[path];
    if (typeof v === 'string' && SHA.test(v)) out.set(path, v);
    else if (v && typeof v.from === 'string' && (PIECE_IMG.test(v.from) || BLOG_IMG.test(v.from)) && files.has(v.from)) {
      out.set(path, files.get(v.from));
    } else fail(`Poza ${path} nu e validă.`);
  }
  return out;
}

/* ─────────────── ce intră în commit ─────────────── */

/* Pură (fără rețea), ca să poată fi încercată în teste: din starea din repo
   și din cererea validată iese lista de intrări pentru commit. */
export function buildEntries({ state: s, products, content, posts, images, body }) {
  const webpOf = (p) => p.replace(/\.jpg$/, '.webp');
  const deletes = new Set();
  for (const path of body.deletes || []) {
    if (typeof path !== 'string' || !PIECE_IMG.test(path)) fail(`Cale nepermisă la ștergere: ${path}`);
    deletes.add(path);
  }
  /* Fiecare poză de geantă are o variantă .webp lângă .jpg (paginile o cer prin
     <picture>). Panoul urcă .webp-ul doar pentru pozele noi; aici îl ținem în
     pas cu .jpg-ul: mutat odată cu el, șters odată cu el, iar dacă .jpg-ul a
     fost înlocuit fără .webp nou, cel vechi se șterge ca să nu arate altă
     poză — pagina cade atunci pe .jpg. */
  for (const path of [...images.keys()]) {
    if (!PIECE_IMG.test(path) || !path.endsWith('.jpg')) continue;
    const wp = webpOf(path);
    if (images.has(wp)) continue;
    const src = (body.images || {})[path];
    const from = src && src.from;
    if (from && s.files.has(webpOf(from))) images.set(wp, s.files.get(webpOf(from)));
    else if (s.files.has(wp)) deletes.add(wp);
  }
  for (const path of [...deletes]) {
    if (PIECE_IMG.test(path) && path.endsWith('.jpg') && s.files.has(webpOf(path))) deletes.add(webpOf(path));
  }

  /* Pozele genților scoase din catalog sau micșorate, și ale articolelor
     șterse sau micșorate, se calculează aici din ce era în repo, nu se iau
     de la browser. Doar genți care ERAU în catalog: alte poze din
     assets/images/ (fundaluri, portrete) nu se ating niciodată. */
  const nowProducts = new Map(products.map((p) => [p.id, p]));
  for (const old of s.products) {
    if (!old || typeof old.id !== 'string' || !SAFE_ID.test(old.id)) continue;
    const kept = nowProducts.get(old.id);
    for (let n = (kept ? kept.photos : 0) + 1; n <= Math.max(Number(old.photos) || 0, 12); n++) {
      for (const ext of ['jpg', 'webp']) {
        const path = `assets/images/${old.id}-${n}.${ext}`;
        if (s.files.has(path) && !images.has(path)) deletes.add(path);
      }
    }
  }
  const nowPosts = new Map(posts.map((p) => [p.id, p]));
  for (const old of s.posts) {
    if (!old || !SAFE_ID.test(old.id || '')) continue;
    const kept = nowPosts.get(old.id);
    for (let n = (kept ? kept.photos.length : 0) + 1; n <= (old.photos || []).length; n++) {
      deletes.add(`assets/blog/${old.id}/${n}.jpg`);
    }
    /* pagini de articol, dacă există (se generează la o etapă următoare) */
    if (!kept) for (const f of [`blog/${old.id}/index.html`, `en/blog/${old.id}/index.html`]) {
      if (s.files.has(f)) deletes.add(f);
    }
  }

  /* fiecare poză de care are nevoie o geantă sau un articol trebuie să
     existe după commit — altfel pe site ar apărea o imagine lipsă */
  const exists = (path) => images.has(path) || (s.files.has(path) && !deletes.has(path));
  for (const p of products) {
    for (let n = 1; n <= p.photos; n++) {
      if (!exists(`assets/images/${p.id}-${n}.jpg`)) fail(`Lipsește poza ${n} a genții „${p.name}".`);
    }
  }
  for (const p of posts) {
    for (let n = 1; n <= p.photos.length; n++) {
      if (!exists(`assets/blog/${p.id}/${n}.jpg`)) fail(`Lipsește poza ${n} a articolului „${p.ro.title}".`);
    }
  }

  const productsJs = renderProductsJs(products);
  const contentJs = renderContentJs(content);
  const { site, ver } = siteInfo(s.indexHtml);
  const text = (path, c) => ({ path, mode: '100644', type: 'blob', content: c });

  const entries = [
    text('assets/js/products.js', productsJs),
    text('assets/js/content.js', contentJs),
    text('data/posts.json', renderPostsJson(posts)),
    text('index.html', renderIndex(s.indexHtml, { content, productsJs, contentJs })),
    text('404.html', renderNotFound({ site, ver })),
    text('sitemap.xml', renderSitemap({ site })),
  ];
  for (const [path, sha] of images) entries.push({ path, mode: '100644', type: 'blob', sha });
  for (const path of deletes) {
    if (!images.has(path) && s.files.has(path)) entries.push({ path, mode: '100644', type: 'blob', sha: null });
  }
  return entries;
}

/* ─────────────── rutele ─────────────── */

async function data(body, env) {
  const s = await loadState(env, false);
  return json({
    ok: true, head: s.head.commit,
    products: s.products, content: s.content, posts: s.posts,
  });
}

async function blob(body, env) {
  const d = body.data;
  if (typeof d !== 'string' || d.length < 8 || !/^[A-Za-z0-9+/]+=*$/.test(d)) fail('Poza nu e validă.');
  const bytes = Math.floor(d.length * 3 / 4) - (d.endsWith('==') ? 2 : d.endsWith('=') ? 1 : 0);
  if (bytes > MAX_BLOB) fail('Poza e prea mare.', 413);
  const start = atob(d.slice(0, 4));
  if (start.charCodeAt(0) !== 0xFF || start.charCodeAt(1) !== 0xD8 || start.charCodeAt(2) !== 0xFF) {
    fail('Poza trebuie să fie JPEG.');
  }
  return json({ ok: true, sha: await createBlob(env, d) });
}

async function publish(body, env) {
  if (typeof body.base !== 'string' || !body.base) fail('Panoul trebuie reîncărcat (Ctrl+Shift+R) înainte de a publica.');
  const s = await loadState(env, true);
  if (body.base !== s.head.commit) fail(CONFLICT, 409);
  if (!s.indexHtml) throw new Error('Lipsește index.html din repo.');

  const products = checkProducts(body.products);
  const content = checkContent(body.content, Object.keys(s.content.ro));
  const posts = checkPosts(body.posts === undefined ? s.posts : body.posts);
  const images = checkImages(body.images, s.files);

  const entries = buildEntries({ state: s, products, content, posts, images, body });
  const message = (str(body.message, 120, 'Mesajul') || 'Actualizare din panou')
    + '\n\nSalvat din panoul de la /admin.';
  const sha = await commitTree(env, s.head, entries, message);
  return json({ ok: true, commit: sha, bags: products.length, posts: posts.length });
}

const ROUTES = { '/api/data': data, '/api/blob': blob, '/api/publish': publish };

export async function handleApi(request, env) {
  const route = ROUTES[new URL(request.url).pathname];
  if (!route) return json({ error: 'Nu există.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Metodă nepermisă.' }, 405);
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    return json({ error: 'Panoul nu e configurat complet: lipsește ADMIN_PASSWORD sau GITHUB_TOKEN.' }, 500);
  }
  if (await isLocked(request)) return tooManyTries();

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'Cererea e prea mare.' }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return json({ error: 'Cerere neînțeleasă.' }, 400);
  }

  if (!(await sameSecret(String(body.password || ''), String(env.ADMIN_PASSWORD)))) {
    if (await noteFailure(request, env)) return tooManyTries();
    await new Promise((r) => setTimeout(r, 700));   // încetinește încercările repetate
    return json({ error: 'Parolă greșită.' }, 401);
  }
  if (body.check) return json({ ok: true });

  try {
    return await route(body, env);
  } catch (err) {
    if (err.expose) return json({ error: err.message }, err.status);
    if (err.status === 422 && /fast.forward/i.test(err.message)) return json({ error: CONFLICT }, 409);
    return json({ error: 'Nu s-a putut salva: ' + err.message }, 502);
  }
}
