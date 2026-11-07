/* ═══════════════════════════════════════════════════════════════
   Limita de încercări pentru parola panoului
   ───────────────────────────────────────────────────────────────
   Se numără doar parolele GREȘITE, pe adresă IP. Se pot urca oricâte
   poze, pentru că o cerere cu parola bună nu consumă nimic din limită.

   Binding-ul de rate limit doar numără; nu poate fi întrebat „ai depășit?"
   fără să adune încă o încercare. Dacă ne-am baza numai pe el, o parolă
   bună ar trece și în timpul limitării, iar atacatorul ar afla tot ce
   caută: greșită = 429, bună = 200. De aceea, la depășire adresa intră
   într-o listă de blocare ținută în cache, verificată ÎNAINTE de parolă.

   Și numărătoarea, și blocarea sunt pe fiecare centru de date Cloudflare
   în parte, deci aproximative. Pentru a opri ghicitul e de ajuns. O adresă
   blocată nu încurcă pe nimeni altcineva: cine administrează nu poate fi
   blocat de altcineva, ci doar de propriile greșeli, de pe aceeași adresă.

   Dacă limitarea are vreo problemă, panoul merge mai departe (parola se
   verifică oricum): o defecțiune aici nu trebuie să lase administratorul pe dinafară.
   ═══════════════════════════════════════════════════════════════ */

export const LOCK_SECONDS = 15 * 60;

/* Un abonat IPv6 primește de obicei un /64 întreg, adică adrese cu miile
   de miliarde: numărate una câte una, limita n-ar opri nimic. */
function clientKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'necunoscut';
  if (!ip.includes(':')) return ip;
  const groups = ip.split('::')[0].split(':').slice(0, 4);
  while (groups.length < 4) groups.push('0');
  return groups.join(':').toLowerCase();
}

function lockKey(request) {
  return new URL('/__blocat/' + encodeURIComponent(clientKey(request)), request.url).toString();
}

export async function isLocked(request) {
  try {
    return Boolean(await caches.default.match(lockKey(request)));
  } catch {
    return false;
  }
}

/* Întoarce true dacă greșeala asta a dus adresa peste limită. */
export async function noteFailure(request, env) {
  if (!env.PASSWORD_LIMIT) return false;
  try {
    const { success } = await env.PASSWORD_LIMIT.limit({ key: clientKey(request) });
    if (success) return false;
    await caches.default.put(lockKey(request), new Response('1', {
      headers: { 'cache-control': `max-age=${LOCK_SECONDS}` },
    }));
    return true;
  } catch {
    return false;
  }
}
