/* Piese care înlocuiesc local ce oferă Cloudflare Worker-ului, ca să poată
   rula handleApi în Node: `caches.default` și bindingul PASSWORD_LIMIT.
   Sunt aproximări simple, doar pentru încercări locale și teste.
   NU înlocuiesc Cloudflare: cache-ul real e pe centru de date și expiră
   după max-age, iar ratelimit-ul real numără pe fereastră de timp. */

/* Instalează un `caches.default` în memorie (ignoră max-age). */
export function installCacheShim() {
  const store = new Map();
  globalThis.caches = {
    default: {
      async match(url) { return store.get(String(url))?.clone(); },
      async put(url, res) { store.set(String(url), res); },
    },
  };
  return { clear: () => store.clear(), store };
}

export function removeCacheShim() { delete globalThis.caches; }

/* Un „PASSWORD_LIMIT": după `limit` încercări pe cheie, limit() dă success:false. */
export function makeLimiter(limit = 10) {
  const counts = new Map();
  return { async limit({ key }) { const n = (counts.get(key) || 0) + 1; counts.set(key, n); return { success: n <= limit }; } };
}
