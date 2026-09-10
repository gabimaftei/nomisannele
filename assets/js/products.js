/* ---------------------------------------------------------------
   NOMIS ANNELE — product catalogue
   ---------------------------------------------------------------
   All data taken from the Instagram posts. Order below matches the
   Instagram grid (newest first).

   To add a new bag, copy one block and change the fields.

   id        : short slug, no spaces. Also the image filename prefix.
   photos    : how many photos exist for this bag. The site looks for
               assets/images/<id>-1.jpg, <id>-2.jpg, ... in order.
               Missing photos fall back to a denim placeholder.
   dims      : h = height, w = width, d = depth (centimetres)
   madeFrom  : how many pairs of jeans went into it (null to hide)
   tint      : colour of the placeholder shown until a photo exists —
               'denim' | 'dark' | 'grey' | 'pink' | 'patchwork'
   badge     : optional little label on the card (null for none)
   sold      : true once the bag is gone — it stays on the site but
               shows as "Unicat vândut" and the order button is off.
   --------------------------------------------------------------- */

const PRODUCTS = [
  {
    id: 'buton',
    name: 'Buton',
    photos: 2,
    dims: { h: 28, w: 31, d: 9 },
    madeFrom: 6,
    tint: 'denim',
    badge: null,
    sold: false,
    model: 'buton.glb',
    modelFullRotation: true,  // tur complet; spatele e reconstruit mai slab, dar se vede tot
    /* nuanțele reale ale gențile, în spațiu liniar; tiparul 2 = petice */
    modelTint: [0.045, 0.070, 0.150],
    modelTintAlt: [0.130, 0.180, 0.300],
    modelTintAlt2: [0.250, 0.310, 0.420],
    modelPattern: 2,
    ro: {
      tagline: 'Siluetă verticală, închidere clasică',
      description:
        'O siluetă verticală și un model de prindere clasic. Are exact cât îți trebuie pentru iPad-ul tău.',
      pockets: '3 buzunare interioare, unul securizat cu fermoar',
      closure: 'Buton',
    },
    en: {
      tagline: 'A vertical silhouette, a classic closure',
      description:
        'A vertical silhouette and a classic fastening — this bag gives you the perfect amount of room for your iPad.',
      pockets: '3 inner pockets, one secured with a zip',
      closure: 'Button',
    },
  },
  {
    id: 'broderie-partea-2',
    name: 'Broderie partea 2',
    photos: 2,
    dims: { h: 25, w: 38, d: 6 },
    madeFrom: 1,
    tint: 'dark',
    badge: null,
    sold: false,
    ro: {
      tagline: 'Pentru cei care pot fi în centrul atenției mereu',
      description:
        'A doua geantă cu elemente de broderie. O pereche de jeans, upcycled într-o geantă cu personalitate.',
      pockets: '2 buzunare interioare',
      closure: 'Fermoar',
    },
    en: {
      tagline: 'For those always at the centre of attention',
      description:
        'Our second bag with embroidered detail. One pair of jeans, upcycled into a bag with personality.',
      pockets: '2 inner pockets',
      closure: 'Zip',
    },
  },
  {
    id: 'roz',
    name: 'Roz',
    photos: 2,
    dims: { h: 25, w: 36, d: 10 },
    madeFrom: 3,
    tint: 'pink',
    badge: null,
    sold: false,
    ro: {
      tagline: 'Culori vii, cusături precise',
      description:
        'Culori animate, linii trasate cu precizie și cusături de calitate. O adevărată piesă de rezistență, mai colorată, pentru primăvară.',
      pockets: '2 buzunare interioare, unul securizat cu fermoar',
      closure: 'Capsă',
    },
    en: {
      tagline: 'Lively colour, precise stitching',
      description:
        'Lively colours, precisely drawn lines and quality stitching — a real statement piece. Brighter, made for spring.',
      pockets: '2 inner pockets, one secured with a zip',
      closure: 'Snap',
    },
  },
  {
    id: 'broderie',
    name: 'Broderie',
    photos: 2,
    dims: { h: 25, w: 40, d: 10 },
    madeFrom: 1,
    tint: 'denim',
    badge: null,
    sold: false,
    ro: {
      tagline: 'Un design unic și îndrăzneț',
      description:
        'Un design unic și îndrăzneț, perfectă atunci când ai chef de o plimbare. O geantă de dimensiuni mai mici, cu o baretă largă.',
      pockets: 'Un buzunar interior, securizat cu fermoar',
      closure: 'Fermoar',
    },
    en: {
      tagline: 'A bold, one-off design',
      description:
        'A unique and daring design — perfect for when you feel like going for a walk. A smaller bag with a wide strap.',
      pockets: 'One inner pocket, secured with a zip',
      closure: 'Zip',
    },
  },
  {
    id: 'nuante-de-gri',
    name: 'Nuanțe de gri',
    photos: 2,
    dims: { h: 35, w: 45, d: 15 },
    madeFrom: 3,
    tint: 'grey',
    badge: null,
    sold: false,
    model: 'nuante-de-gri.glb',
    modelFullRotation: true,
    /* tiparul 1 = dungi orizontale, ca la geanta reală */
    modelTint: [0.040, 0.043, 0.048],
    modelTintAlt: [0.300, 0.310, 0.320],
    modelPattern: 1,
    ro: {
      tagline: 'Volum și linii, pentru zilele pline',
      description:
        'Volum și linii. Geanta ideală pentru cineva ocupat, care preferă un model pragmatic. A doua pe care am făcut-o.',
      pockets: '2 buzunare interioare, securizate cu arici',
      closure: 'Fermoar',
    },
    en: {
      tagline: 'Volume and lines, for full days',
      description:
        'Volume and lines — the ideal bag for a busy person who prefers something pragmatic. The second bag out of the workshop.',
      pockets: '2 inner pockets, secured with velcro',
      closure: 'Zip',
    },
  },
  {
    id: 'patchwork',
    name: 'Patchwork',
    photos: 2,
    dims: { h: 40, w: 42, d: 10 },
    madeFrom: 12,
    tint: 'patchwork',
    badge: 'first',
    sold: false,
    model: 'patchwork.glb',
    modelFullRotation: true,
    /* albastru, roșu și crem, ca peticele din care e cusută */
    modelTint: [0.055, 0.085, 0.175],
    modelTintAlt: [0.235, 0.050, 0.062],
    modelTintAlt2: [0.330, 0.300, 0.225],
    modelPattern: 2,
    ro: {
      tagline: 'Prima geantă și primul proiect ambițios',
      description:
        'Gândită pentru o zi ocupată. Laptop-ul, agenda și toate lucrurile de care ai și nu ai nevoie au loc în această geantă.',
      pockets: '3 buzunare interioare, unul securizat cu fermoar',
      closure: 'Fermoar',
    },
    en: {
      tagline: 'The first bag, and the first ambitious project',
      description:
        'Built for a busy day. Your laptop, your planner and everything you do and do not need all fit in this bag.',
      pockets: '3 inner pockets, one secured with a zip',
      closure: 'Zip',
    },
  },
];

/* Exported for the page script. */
window.PRODUCTS = PRODUCTS;
