# NOMIS ANNELE — website (v1)

A one-page site for the Instagram shop [@nomisannele](https://www.instagram.com/nomisannele/).
Plain HTML, CSS and JavaScript — no build step, no dependencies, no server code.

```
index.html
tools/optimise-model.py  ← shrinks a .glb for the web (see section 6)
assets/
  css/styles.css
  css/fonts.css      ← @font-face rules for the local fonts
  js/products.js     ← the bag catalogue (edit this to add bags)
  js/app.js          ← page behaviour
  js/bagviewer.js    ← the 3D viewer (see section 6)
  images/            ← the photos
  fonts/             ← self-hosted webfonts + their licence
  models/            ← the .glb 3D models
```

---

## 1. The photos

Every bag already has a photo. They were recovered from the Instagram
screenshots in `~/Downloads`, cropped to remove the phone status bar, the
Instagram header, the carousel counter and the like/comment bar, then scaled to
1000 px wide and compressed.

**Every bag has exactly two photos: the outside and the inside.** That is all
the material contains. Each Instagram post has 6–7 slides, but only the first
three were ever screenshotted onto this computer, and of those three:

- slide 1, the "Măsurători" card, holds a small photo of the bag — but it is the
  *same view* as slide 3, just cropped differently;
- slide 2, the "Fă loc și pentru sustenabilitate" card, holds the interior shot,
  which is genuinely different and is now photo 2;
- slide 3 is the outside shot, and is photo 1.

A third photo was tried and removed: on every bag it turned out to be the outside
again. Two distinct photos beat three where one is a repeat.

The interiors are cropped tight to the bag and kept at their native size — they
are not enlarged, because enlarging them was what made them look soft.

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
  photos: 2,                // how many photos exist
  dims: { h: 30, w: 40, d: 12 },   // cm; use null if not measured yet
  madeFrom: 2,              // pairs of jeans, or null to hide
  tint: 'denim',            // colour of the placeholder until photos arrive
  badge: null,              // e.g. 'first' for a little label on the card
  sold: false,              // true → shows "Vândută", order button off
  ro: { tagline: '…', description: '…', pockets: '…', closure: '…' },
  en: { tagline: '…', description: '…', pockets: '…', closure: '…' },
  // optional, only if there is a 3D model for it:
  // model: 'noua-geanta.glb',
  // modelFullRotation: true,
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

Use that rather than double-clicking `index.html`: opened as a `file://` page, the
Content-Security-Policy blocks the 3D models from loading, so the 3D tab appears
broken for no real reason.

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

## 6. The 3D models

Three bags — **Buton, Patchwork and Nuanțe de gri** — have a rotatable 3D model,
shown as a third tab in the gallery next to the photos. The other three bags show
nothing extra; the tab only appears when `products.js` gives the bag a `model`.

**They are white on purpose, and cannot be otherwise.** The files contain geometry
only: no materials, no textures, and — crucially — no UV coordinates, which is what
a texture needs in order to be wrapped onto a shape. No denim can ever be applied to
them. That is why the note under the viewer says the real colours are in the
photographs. Do not remove that note.

The models were also reconstructed from photographs, so they are not equally
accurate all the way round:

All three now turn a full 360°. Buton used to be capped at ±72° because its
back is the weakest part of the reconstruction, but half a turn is not a 3D view,
so the cap is gone. Its back is softer than its front; that is the honest state of
the model, not a bug to hide. The `modelFullRotation` flag is still there if you
ever want to cap a future model.

Dragging is scaled to the canvas: a swipe across the full width is exactly one
complete turn, on a phone and on a desktop alike. Letting go keeps the spin going
and eases it down.

### The scroll section

"Cum le facem" is no longer a static list of four steps. It is a tall section with
a panel stuck inside it: as you scroll through, the **Patchwork** bag turns a full
360° while the four steps cross-fade in time with the rotation, and a thin rail on
the right shows how far through you are.

It is progressive enhancement, not a requirement. `index.html` still contains the
plain four-step list (`#steps-static`); `app.js` only swaps in the scrolling version
when the browser can do WebGL **and** the visitor has not asked for reduced motion.
If the model fails to load at any point, the section quietly puts the plain list back.

The model is only fetched when the section comes within 300px of the viewport, and
the renderer draws exactly one frame per scroll update — there is no animation loop
running in the background.

To use a different bag, change `MODEL` at the top of the orbit block in `app.js`.
It should be one with `modelFullRotation: true`, since the section turns it all the
way round.

### Making the models smaller

`tools/optimise-model.py` shrinks a `.glb` for the web without dropping a single
triangle:

```bash
python3 tools/optimise-model.py raw.glb assets/models/name.glb
```

It sorts the triangles spatially, renumbers the vertices in the order they are used,
and quantises the positions to 16-bit integers with the real scale moved into the
node transform (the standard `KHR_mesh_quantization` extension, so the file still
opens in Blender or three.js).

On these three bags that took **386 KB down to 259 KB each over the wire** — a third
smaller — with no visible difference. Note that GitHub Pages already gzips `.glb`, so
the on-disk size overstates what visitors actually download.

### The viewer

`assets/js/bagviewer.js` is a small `.glb` reader plus a WebGL renderer, written
for these files specifically. It is about 10 KB. A general-purpose 3D library would
have been ~700 KB to draw 40,000 untextured triangles, and would have had to be
self-hosted anyway because of the Content-Security-Policy.

It generates the missing surface normals at load time, centres and scales each model
so all bags appear the same size, and lights them with a fixed studio setup so that
turning the bag reveals the seams.

Two things it does deliberately:
- **Nothing downloads until asked.** A model is ~460 KB and is only fetched when
  someone actually presses the 3D tab.
- **If WebGL is unavailable, the tab does not appear at all.** The visitor gets the
  photographs, with no broken box and no apology.

It reads both plain float positions and the quantised 16-bit ones the optimiser
produces, and applies the node's scale and translation if it has any.

---

## 7. How it's built, and why it's safe

There is very little that *can* go wrong here: no server, no database, no forms,
no logins, no payments, no cookies, no analytics. Nothing is collected from anyone.
On top of that:

- **No third-party requests at all.** The fonts are downloaded and served from
  `assets/fonts/` rather than loaded from Google. That means no visitor data
  leaves the site, which also keeps it clear of the GDPR problems that using
  Google Fonts directly has caused for EU sites. Licences are in `assets/fonts/OFL.txt`.
- **No inline styles, even from script.** `style-src 'self'` blocks any style
  written onto an element from JavaScript, which the scroll-progress rail and the
  modal's scroll lock both need. Rather than loosening the policy, those two values
  live in a stylesheet constructed in code (`adoptedStyleSheets`), which the policy
  does not treat as inline. The policy stays strict and the features still work.
- **A Content-Security-Policy** in the page head restricts everything to `'self'`.
  If someone ever managed to inject a script or a tracking pixel, the browser would
  refuse to run it. `connect-src 'self'` allows exactly one kind of network call:
  reading a 3D model from this same site. Nothing may be sent anywhere else.
- **Every external link** carries `rel="noopener noreferrer"`, so the Instagram tab
  cannot reach back into the site and no referrer is leaked.
- **Accessibility**: text passes WCAG AA contrast (the weakest pairing is 4.78:1
  against a 4.5 requirement), tap targets are at least 44px, the bag window traps
  keyboard focus and closes on Escape, and the background is made inert while it is open.

### One thing to know when you edit

The CSS and JS are linked with a version marker, `?v=12`. **If you change
`products.js`, `app.js` or `styles.css`, bump that number in `index.html`** (to
`?v=13`, and so on). Without it, people who visited before may keep seeing the old
version out of their browser cache for hours.

---

## 8. Things worth doing next

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
