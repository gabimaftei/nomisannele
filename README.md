# NOMIS ANNELE — website (v1)

A one-page site for the Instagram shop [@nomisannele](https://www.instagram.com/nomisannele/).
Plain HTML, CSS and JavaScript — no build step, no dependencies, no server code.

```
index.html
assets/
  css/styles.css
  js/products.js   ← the bag catalogue (edit this to add bags)
  js/app.js        ← page behaviour
  images/          ← drop the photos in here
```

---

## 1. The photos

Every bag already has a photo. They were recovered from the Instagram
screenshots in `~/Downloads`, cropped to remove the phone status bar, the
Instagram header, the carousel counter and the like/comment bar, then scaled to
1000 px wide and compressed.

Each bag now has three photos, taken from all three slides of its post:
the outside shot, the inside shot (cut out of the "Fă loc și pentru
sustenabilitate" card), and the smaller photo from the "Măsurători" card,
which is usually a different angle.

| Bag | Photos in place |
|---|---|
| Buton | outside, plaid-lined interior, angled view |
| Broderie partea 2 | outside, interior, close-up of the embroidered pocket |
| Roz | outside, interior, corner detail |
| Broderie | outside, interior with the flower, side view |
| Nuanțe de gri | outside, interior, angled view, **plus** the waistband detail — 4 photos |
| Patchwork | outside, interior with the laptop, top-down view |

> **Note on one filename.** Broderie partea 2 used to have the id `broderie-2`,
> which produced `broderie-2-1.jpg` — uncomfortably close to `broderie-2.jpg`,
> the second photo of the *Broderie* bag. Its id is now `broderie-partea-2`,
> so the two sets can no longer be mixed up.

**These are screenshots, not originals.** They look fine at the size the site
shows them, but they have been through a phone screenshot and a re-compression,
so they are softer than the real camera files. Replacing them with the originals
is the single biggest quality upgrade available, and needs no code change —
just overwrite the files, keeping the same names.

### Adding more photos

Name them `<id>-<number>.jpg` and put them in `assets/images/`, then **raise the
`photos` number for that bag in `products.js`** — the gallery only shows as many
photos as that number says. So to give Roz four photos, add `roz-2.jpg`,
`roz-3.jpg`, `roz-4.jpg` and set `photos: 4`.

`-1.jpg` is the main shot on the card, so it should be the best-looking view of
the whole bag.

**Which ones to use:** in each Instagram post, slides 1 and 2 are the designed
cards (the "Măsurători" card and the "Fă loc și pentru sustenabilitate" card).
The website already reproduces both — as the measurements table and the specs
list — so **skip them and use the clean product photos from slide 3 onwards**.
Putting the graphic cards on the site would just duplicate the layout.

**Any photo that isn't there yet falls back to a denim placeholder** tinted to
that bag's colour, so the site never looks broken while photos are missing.

Also optional:
- `assets/images/story.jpg` — a photo for the "Povestea noastră" section (mother & daughter, or the workshop).
- `assets/images/og.jpg` — the preview image shown when the link is shared.
- `assets/images/favicon.png` — the little browser-tab icon (the round logo works well).

**Tip:** save photos around 1000–1200 px wide and under ~300 KB each so the site stays fast.
Portrait (4:5) crops fit the layout best — the same shape Instagram uses.

---

## 2. Adding or editing a bag

Open `assets/js/products.js` and copy one of the blocks. Everything is commented.

```js
{
  id: 'noua-geanta',        // no spaces — also the photo filename prefix
  name: 'Nouă geantă',
  photos: 6,                // how many photos exist
  dims: { h: 30, w: 40, d: 12 },   // cm; use null if not measured yet
  madeFrom: 2,              // pairs of jeans, or null to hide
  sold: false,              // true → shows "Vândut", order button off
  ro: { tagline: '…', description: '…', features: ['…', '…'] },
  en: { tagline: '…', description: '…', features: ['…', '…'] },
}
```

When a bag sells, just change `sold: false` to `sold: true`. It stays on the site as
a portfolio piece but can no longer be ordered.

---

## 3. How ordering works

**One tap.** The *Întreabă de geanta asta* button opens the Instagram chat with
`@nomisannele` (`https://ig.me/m/nomisannele`) straight away. Nothing to copy,
nothing to paste, no extra screen in the way.

Instagram has no way to pre-fill DM text from a link, so the site cannot drop the
bag's name into the message on the customer's behalf. Instead, the line under the
button tells them what to say:

> Se deschide conversația cu @nomisannele. Zi-ne că e vorba de „Roz" și îți spunem prețul.

Price and delivery get agreed in the chat. No checkout, no payment handling,
nothing to maintain.

---

## 4. Viewing it locally

```bash
cd ~/Desktop/NomisAnnele && python3 -m http.server 4321
```

Then open <http://localhost:4321>.

(Opening `index.html` by double-clicking mostly works too, but the copy-to-clipboard
button needs a real `http://` or `https://` address, so use the command above for testing.)

---

## 5. It's online

**Live at <https://gabimaftei.github.io/nomisannele/>**

Hosted free on GitHub Pages from <https://github.com/gabimaftei/nomisannele>
(account `gabimaftei`, branch `main`). No build step — Pages serves the files as they are.

### Publishing a change

Anything committed to `main` goes live about a minute later:

```bash
git add -A && git commit -m "Add new bag" && git push
```

### Moving to a real domain

`nomisannele.ro` (~€10–15/year, from RoTLD, Namecheap or Cloudflare) would read far
better in the Instagram bio. Once it's bought:

1. At the registrar, add four `A` records for the apex pointing to GitHub Pages:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   — and a `CNAME` for `www` pointing to `gabimaftei.github.io`.
2. In the repo: **Settings → Pages → Custom domain**, enter the domain, save, then
   tick **Enforce HTTPS** once the certificate is issued (usually under an hour).
3. Update the two absolute URLs in `index.html` (`og:image` and `og:url`) to the new
   domain, so link previews keep working.

The old `github.io` address keeps redirecting, so nothing breaks.

---

## 6. How it's built, and why it's safe

There is very little that *can* go wrong here: no server, no database, no forms,
no logins, no payments, no cookies, no analytics. Nothing is collected from anyone.
On top of that:

- **No third-party requests at all.** The fonts are downloaded and served from
  `assets/fonts/` rather than loaded from Google. That means no visitor data
  leaves the site, which also keeps it clear of the GDPR problems that using
  Google Fonts directly has caused for EU sites. Licences are in `assets/fonts/OFL.txt`.
- **A Content-Security-Policy** in the page head restricts everything to `'self'`.
  If someone ever managed to inject a script or a tracking pixel, the browser would
  refuse to run it. `connect-src 'none'` means the page cannot make network calls at all.
- **Every external link** carries `rel="noopener noreferrer"`, so the Instagram tab
  cannot reach back into the site and no referrer is leaked.
- **Accessibility**: text passes WCAG AA contrast (the weakest pairing is 4.78:1
  against a 4.5 requirement), tap targets are at least 44px, the bag window traps
  keyboard focus and closes on Escape, and the background is made inert while it is open.

### One thing to know when you edit

The CSS and JS are linked with a version marker, `?v=4`. **If you change
`products.js`, `app.js` or `styles.css`, bump that number in `index.html`** (to
`?v=5`, and so on). Without it, people who visited before may keep seeing the old
version out of their browser cache for hours.

---

## 7. Things worth doing next

- **Check the story text.** The "Cine suntem" section is written in their voice from
  what the Instagram posts show — mother and daughter, 2025, Patchwork being the first
  bag out of twelve pairs of jeans. The tone and the shape of the story are a guess.
  Whoever actually lived it should read it and correct it.
- **A real photo for that section.** It currently falls back to Patchwork. Drop a
  photo of the two of them, or of the workshop, at `assets/images/story.jpg` and it
  takes over automatically.
- **The originals of the bag photos** (see section 1).
- **Keep the counter honest.** "26 perechi salvate până acum" in the *Cum le facem*
  section is hand-written in `index.html` and in `app.js` (`process.f2`). It needs
  updating as more bags are made.
- Prices on the cards, if you ever want them public.
- Care and washing instructions.
