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

| Bag | Photos in place |
|---|---|
| Buton | `buton-1.jpg` (exterior), `buton-2.jpg` (plaid-lined interior) |
| Broderie partea 2 | `broderie-2-1.jpg` |
| Roz | `roz-1.jpg` |
| Broderie | `broderie-1.jpg` |
| Nuanțe de gri | `nuante-de-gri-1.jpg`, `nuante-de-gri-2.jpg` (waistband detail) |
| Patchwork | `patchwork-1.jpg` |

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

Instagram has **no way to pre-fill the text of a DM** from a link (WhatsApp does,
Instagram doesn't). So the site does the next best thing:

1. Customer opens a bag and presses **Comandă pe Instagram**.
2. A panel shows the order message, already written, with the bag name and measurements.
3. Pressing **Copiază și deschide Instagram** copies that text *and* opens the
   DM thread with `@nomisannele` (`https://ig.me/m/nomisannele`).
4. The customer pastes it and hits send.

So every order lands in the Instagram inbox already formatted, and price and
delivery get agreed in the chat — no checkout, no payment handling, nothing to maintain.

---

## 4. Viewing it locally

```bash
cd ~/Desktop/NomisAnnele && python3 -m http.server 4321
```

Then open <http://localhost:4321>.

(Opening `index.html` by double-clicking mostly works too, but the copy-to-clipboard
button needs a real `http://` or `https://` address, so use the command above for testing.)

---

## 5. Putting it online

The site is fully static, so the free tiers of these all work — drag the folder in:

- **Netlify Drop** — <https://app.netlify.com/drop> — drag the folder, done, gives you a URL.
- **Cloudflare Pages** or **Vercel** — same idea, connect a folder or a repo.
- **GitHub Pages** — free, needs a GitHub account.

Then put the URL in the Instagram bio link.

A custom domain (e.g. `nomisannele.ro`) costs roughly €10–15/year and can be pointed
at any of the hosts above.

---

## 6. Things worth doing next (not in v1)

- Real photos (biggest visual upgrade by far).
- Prices on the cards, if you want them public.
- A short "custom order" form for people who want their own jeans made into a bag.
- Care instructions / washing guide.
- More languages if you ship outside Romania.
