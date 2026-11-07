/* ═══════════════════════════════════════════════════════════════
   Punctul de intrare al Worker-ului
   ───────────────────────────────────────────────────────────────
   Site-ul e static: fișierele se servesc de pe CDN, iar Worker-ul
   primește doar rutele panoului (/api/…, din server/api.js) — vezi
   run_worker_first în wrangler.jsonc.

   ADRESA CANONICĂ
   Domeniul NOMIS ANNELE nu există încă, de aceea CANONICAL e null și
   redirecționarea (www. → domeniul de bază, http → https) este oprită:
   altfel ar muta vizitatorii pe un domeniu inexistent și ar rupe site-ul.
   Când domeniul e cumpărat și legat:
     1. scrie-l mai jos, fără https:// (ex. 'nomisannele.ro');
     2. în wrangler.jsonc: adaugă "routes", pune workers_dev pe false și
        schimbă run_worker_first (vezi comentariul de acolo);
     3. schimbă adresa din <link rel="canonical"> și og:url din index.html:
        sitemap-ul și paginile generate o iau de acolo.
   ═══════════════════════════════════════════════════════════════ */
import { handleApi } from './server/api.js';

const CANONICAL = null;   // ex.: 'nomisannele.ro'  (null = fără redirecționare)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (CANONICAL && (url.hostname !== CANONICAL || url.protocol !== 'https:')) {
      url.hostname = CANONICAL;
      url.protocol = 'https:';
      url.port = '';
      /* 301 pentru citit; 308 pentru restul, ca un POST să rămână POST */
      const safe = request.method === 'GET' || request.method === 'HEAD';
      return Response.redirect(url.toString(), safe ? 301 : 308);
    }

    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
