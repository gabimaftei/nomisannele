/* Server local pentru încercarea panoului în browser, fără Cloudflare și
   fără contul real:  node tools/dev-server.mjs [port]   (implicit: 8788)

   Pornește: un GitHub simulat (tools/mock-github.mjs, în memorie, din copia
   repo-ului), handleApi din server/api.js cu mediu fictiv și un server HTTP
   care servește /api/* prin handleApi și restul ca fișiere statice.
   Fișierele statice vin din starea „publicată" în simulare (deci după
   „Publică" se vede rezultatul), cu fallback pe discul repo-ului.

   Parola de test se generează la fiecare pornire și apare DOAR în terminal.
   GITHUB_TOKEN e fals. Nimic nu se scrie în repo; la oprire totul dispare.

   CE NU ÎNLOCUIEȘTE:
   - wrangler / workerd: rulează în Node, nu în runtime-ul Workers (limite de
     CPU, fetch, Request/Response pot diferi în detalii);
   - ratelimit: PASSWORD_LIMIT e un numărător simplu (10 greșeli, apoi blocat);
   - caches.default: cache în memorie, fără expirare;
   - redirecționări (CANONICAL), run_worker_first, not_found_handling,
     antetele din _headers (CSP etc.) și .assetsignore din Cloudflare:
     aici _headers se aplică doar parțial (vezi mai jos) și 404.html se
     întoarce simplu la căi inexistente;
   - GitHub real: permisiuni, limite, redenumiri, webhook-uri, build-ul
     Cloudflare după push. */
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { startMockGithub, DEFAULT_ROOT } from './mock-github.mjs';
import { installCacheShim, makeLimiter } from './local-env.mjs';
import { handleApi } from '../server/api.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
/* nu se servesc ca fișiere statice (la fel ca .assetsignore) */
const HIDDEN = /^(server|test|tools|data|\.git|\.claude|\.wrangler|node_modules)(\/|$)|^(worker\.js|wrangler\.jsonc|\.dev\.vars|\.assetsignore|\.gitignore|package(-lock)?\.json)$|\.md$/;

const root = DEFAULT_ROOT;
const mock = await startMockGithub();
installCacheShim();
const password = crypto.randomBytes(9).toString('base64url');
const env = { ...mock.env, ADMIN_PASSWORD: password, PASSWORD_LIMIT: makeLimiter(10) };

function fileFor(pathname) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  if (rel.includes('..')) return null;
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  if (HIDDEN.test(rel)) return null;
  const fromMock = mock.readFile(rel);
  if (fromMock) return fromMock;
  const full = join(root, rel);
  if (existsSync(full) && statSync(full).isFile()) return readFileSync(full);
  /* /admin → admin/index.html */
  const dir = join(root, rel, 'index.html');
  if (!HIDDEN.test(rel) && existsSync(dir)) return { redirect: '/' + rel + '/' };
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      headers.set('cf-connecting-ip', req.socket.remoteAddress || '127.0.0.1');
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const r = await handleApi(new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }), env);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const f = fileFor(url.pathname);
    if (f && f.redirect) { res.writeHead(301, { location: f.redirect }); return res.end(); }
    if (!f) {
      const nf = mock.readFile('404.html') || (existsSync(join(root, '404.html')) ? readFileSync(join(root, '404.html')) : Buffer.from('404'));
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      return res.end(nf);
    }
    const ext = extname(url.pathname) || '.html';
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(f);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Eroare locală: ' + e.message);
  }
});

const port = Number(process.argv[2] || 8788);
server.listen(port, '127.0.0.1', () => {
  console.log(`Site local:        http://127.0.0.1:${server.address().port}/`);
  console.log(`Panou (când există): http://127.0.0.1:${server.address().port}/admin/`);
  console.log(`GitHub simulat:    ${mock.url} (în memorie)`);
  console.log(`Parola de test:    ${password}   (nouă la fiecare pornire, doar aici)`);
  console.log('Ctrl+C oprește totul; publicările din panou dispar la oprire.');
});
const stop = async () => { server.close(); await mock.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
