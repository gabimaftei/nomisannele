# Ghid: site-ul în Google Search Console și Bing

Pentru Nomis Annele. Durează cam 15 minute, plus așteptare. Nu trebuie să modifici nimic
pe site: verificarea se face doar din Google și din Cloudflare.

**Important: domeniul final încă nu există.** Până îl cumpărăm și îl legăm de site,
pașii de mai jos nu se pot face. Citește ghidul acum ca să știi ce urmează, dar începe
efectiv după ce avem domeniul. Până atunci nu adăugăm nimic în Google, ca să nu legăm
proprietatea de o adresă care se schimbă.

**De ce DNS (record TXT) și nu fișier sau meta tag.** Un TXT în Cloudflare DNS
verifică tot domeniul dintr-o dată (cu și fără `www`, `http` și `https`), nu
atinge site-ul și nu se șterge când se publică ceva din panou. Verificarea prin fișier
cere un deploy nou, iar meta tag-ul se poate pierde la o modificare din panou.
Dacă DNS-ul nu poate fi folosit dintr-un motiv tehnic, există varianta cu fișier HTML
(pasul 1b), dar e mai greoaie.

## 1. Adaugă proprietatea în Google

1. Intră la <https://search.google.com/search-console> cu contul Google al brandului.
2. **Adaugă proprietate** → alege tipul **Domeniu** (nu „Prefix URL”) → scrie
   domeniul (fără `https://` și fără bara de la final) → **Continuă**.
3. Google arată o valoare care începe cu `google-site-verification=`. Copiaz-o.

### 1b. Varianta cu fișier (doar dacă DNS nu merge)

Google oferă un fișier HTML de descărcat. Se pune în site la rădăcină, iar apoi se
publică. Cere ajutor de la cine întreține site-ul, pentru că fișierul trebuie să
ajungă exact la adresa indicată de Google. Nu șterge fișierul după verificare.

## 2. Pune valoarea în Cloudflare

1. <https://dash.cloudflare.com> → contul brandului → domeniul.
2. **DNS** → **Records** → **Add record**.
3. Type **TXT**, Name `@`, Content = valoarea copiată (întreagă, fără ghilimele),
   TTL Auto → **Save**.

## 3. Verifică

Înapoi în Search Console, apasă **Verify**. Dacă zice că nu găsește recordul,
așteaptă 5–30 de minute și mai încearcă (DNS-ul are nevoie de timp). **Nu șterge
niciodată** recordul TXT după verificare: dacă dispară, Google retrage accesul.

## 4. Trimite harta site-ului

În meniul din stânga caută **Sitemaps** (sau „Hărți de site”) → la câmpul pentru
adresă scrie `sitemap.xml` → **Submit**.

Adresa completă este `https://<domeniul>/sitemap.xml`. Trebuie să apară starea
**Success** și un număr de pagini descoperite care se potrivește cu site-ul: pagina
principală în română și în engleză, plus două pagini pentru fiecare geantă (RO și EN).
Fișierul se actualizează singur când se adaugă sau se schimbă o geantă din panou.

## 5. Cere indexarea

În bara de sus, **URL inspection** (sau „Inspecție URL”), lipește o adresă, așteaptă
rezultatul, apoi apasă **Request indexing** (sau „Solicită indexarea”). Google acceptă
doar câteva cereri pe zi, deci poți face câte puțin în mai multe zile. În ordinea asta:

1. `https://<domeniul>/` (pagina principală, română)
2. `https://<domeniul>/en/` (pagina principală, engleză)
3. Câteva geantă, de preferat primele după cât de des le arăți pe Instagram.
   Fiecare geantă are adresa `https://<domeniul>/genti/<id>/`, iar varianta în engleză
   este `https://<domeniul>/en/genti/<id>/`. Lista completă e în `sitemap.xml`, deci
   nu trebuie să le ceri pe toate: sunt oricum descoperite.

Indexarea poate dura de la câteva ore la câteva săptămâni. Mesajul „URL is not on
Google” în primele zile este normal.

## 6. Bing

1. <https://www.bing.com/webmasters> → autentifică-te (cont Microsoft, Google sau
   Facebook).
2. Alege varianta de import din Search Console (de obicei apare ca **Import your
   sites from GSC** sau „Importă site-urile din GSC”) → permite accesul la contul
   Google → alege domeniul → **Import**. Bing preia proprietatea și, de regulă, și
   harta site-ului, fără altă verificare.
3. În **Sitemaps**, verifică să apară `https://<domeniul>/sitemap.xml`. Dacă nu
   apare, adaug-o manual.
4. Opțional: poți trimite pagina principală și din **URL Submission**. Bing alimentează
   și alte motoare de căutare mai mici, deci merită un minut.

## 7. Ce rapoarte urmărești (o dată pe lună, nu zilnic)

- **Pages (Indexing)** / „Pagini”: câte pagini sunt indexate din cele pe care le-ai
  trimis. Dacă o pagină apare la „Not indexed”, deschide motivul și anunță persoana
  care se ocupă de site.
- **Sitemaps**: trebuie să rămână pe Success.
- **Performance** / „Performanță” → **Queries** (interogări): cu ce cuvinte ajunge
  lumea pe site. Datele apar după 2–4 săptămâni. Cuvinte de urmărit:
  „Nomis Annele”, „genți din denim handmade”, „geantă din denim”, „genți handmade
  din denim”. Interogările generale („genți”) sunt foarte greu de câștigat pentru un
  brand nou; nu le urmări ca obiectiv.
- **Performance** → **Pages**: ce pagini sunt văzute.
- **Enhancements** / „Îmbunătățiri” → **Breadcrumbs** și **Products** (Produse):
  nu trebuie să apară erori. Paginile de geantă nu au preț afișat în site, deci
  Google nu va arăta prețul în rezultate. Asta e normal și nu e o eroare de rezolvat.
  Dacă apar avertismente despre preț, sunt tot informative pentru acest tip de pagină.
- **Links** / „Linkuri”: cine trimite linkuri spre site. Acesta e raportul cel mai
  important pe termen lung.

## 8. Cât durează în mod realist

- Verificarea: de obicei minute, uneori o oră, după ce DNS-ul s-a propagat.
- Prima indexare a paginilor: zile până la câteva săptămâni.
- Primele interogări în raport: 2–4 săptămâni după indexare.
- Poziții stabile pe cuvinte de nișă: de regulă câteva luni, mai ales dacă apar și
  linkuri de la alte site-uri.

Nu există nicio garanție de poziție în Google. Ce poți controla sunt paginile
indexate, harta site-ului și linkurile reale.

## 9. Bing (rezumat)

Bing nu contează mult în România, dar importul din Search Console durează câteva
minute și nu cere muncă în plus. Verifică o dată pe lună doar că sitemap-ul e
în starea Success.

## Ce poate face cine

| Cine | Ce |
|---|---|
| **Persoana care administrează brandul** (conturile Google, Cloudflare și Microsoft) | Toți pașii de mai sus. Nimeni altcineva nu poate adăuga proprietatea sau recordul DNS. |
| **Cine întreține site-ul** | Doar dacă e nevoie de varianta cu fișier (pasul 1b), sau dacă o pagină din sitemap nu se mai deschide. |
