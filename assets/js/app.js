/* ═══════════════════════════════════════════
   NOMIS ANNELE — page script
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const IG_HANDLE = 'nomisannele';
  const IG_DM = 'https://ig.me/m/' + IG_HANDLE;
  const IMG_PATH = 'assets/images/';

  /* ───────────────────────────────────────────
     1. Translations
     ─────────────────────────────────────────── */

  const I18N = {
    ro: {
      'skip': 'Sari la colecție',

      'nav.collection': 'Colecție',
      'nav.story': 'Povestea noastră',
      'nav.process': 'Cum lucrăm',
      'nav.contact': 'Contact',

      'hero.eyebrow': 'Upcycled fashion · lucrat manual',
      'hero.title1': 'Fiecare pereche de blugi',
      'hero.title2': 'merită o a doua șansă',
      'hero.lede': 'Suntem mamă și fiică. Transformăm denimul purtat în genți unicat — croite pe stilul tău și mai blânde cu planeta.',
      'hero.ctaPrimary': 'Vezi colecția',
      'hero.ctaSecondary': 'Povestea noastră',

      'collection.eyebrow': 'Colecția',
      'collection.title': 'Fiecare geantă există într-un singur exemplar',
      'collection.lede': 'Pentru că pornim de la blugi purtați, nu există două genți la fel. Ce vezi aici e ce există — iar când o geantă pleacă, pleacă definitiv.',
      'collection.note': 'Vrei ceva anume — altă mărime, alte culori, blugii tăi transformați în geantă? <a href="#contact">Scrie-ne</a> și lucrăm împreună.',

      'story.eyebrow': 'Povestea noastră',
      'story.badge': 'anul în care am început',
      'story.title': 'O mamă, o fiică și un teanc de blugi',
      'story.p1': 'NOMIS ANNELE s-a născut acasă, în 2025, dintr-un obicei simplu: nu aruncam blugii vechi. Se strângeau într-un colț, prea buni ca să ajungă la gunoi și prea uzați ca să mai fie purtați.',
      'story.p2': 'Așa a apărut prima geantă. Apoi a doua. Acum lucrăm împreună — mamă și fiică — croim, coasem și finisăm fiecare piesă cu mâna, una câte una, în ritmul nostru.',
      'story.p3': 'Nu producem în serie și nu ne grăbim. Fiecare geantă poartă cusăturile, buzunarele și urmele blugilor din care s-a născut. Asta o face a ta și a nimănui altcuiva.',
      'story.quote': '„Upcycling-ul e moda căreia chiar îi pasă.”',

      'process.eyebrow': 'Cum lucrăm',
      'process.title': 'De la blugi purtați la geantă',
      'process.s1t': 'Adunăm',
      'process.s1p': 'Blugi purtați, donați sau salvați de la aruncat. Îi spălăm și îi sortăm după nuanță și textură.',
      'process.s2t': 'Croim',
      'process.s2p': 'Desenăm modelul și decupăm bucată cu bucată. Buzunarele, tivurile și etichetele originale rămân — sunt semnătura fiecărei genți.',
      'process.s3t': 'Coasem',
      'process.s3p': 'Totul se coase manual, cu căptușeală, buzunare interioare și închidere. O geantă poate însemna o singură pereche de blugi sau douăsprezece — depinde de model.',
      'process.s4t': 'Ajunge la tine',
      'process.s4p': 'Ne scrii pe Instagram, stabilim detaliile și livrarea. Simplu, direct, fără intermediari.',
      'process.f1': 'perechi de blugi în fiecare geantă',
      'process.f2': 'lucrat manual, acasă',
      'process.f3': 'fiecare model e unicat',

      'contact.eyebrow': 'Comandă',
      'contact.title': 'Comenzile se fac direct în Instagram',
      'contact.lede': 'Suntem un atelier mic, de familie — așa că vorbim cu fiecare client personal. Alege o geantă, apasă butonul și îți pregătim mesajul de comandă gata scris. Tu doar îl lipești în conversație.',
      'contact.dm': 'Scrie-ne pe Instagram',
      'contact.profile': 'Vezi profilul @nomisannele',
      'contact.small': 'Răspundem de obicei în aceeași zi. Livrăm în toată România.',

      'footer.tag': 'Upcycled fashion · est. 2025',

      'product.order': 'Comandă pe Instagram',
      'product.orderNote': 'Îți copiem mesajul de comandă și îți deschidem conversația. Doar îl lipești și îl trimiți.',
      'product.soldNote': 'Această geantă și-a găsit deja casa. Scrie-ne dacă vrei ceva asemănător — putem lucra un model pe comandă.',
      'product.madeFrom': 'Creată din {n} blugi upcycled',
      'product.madeFromOne': 'Creație upcycled dintr-o singură pereche de blugi',

      'spec.pockets': 'Buzunare',
      'spec.closure': 'Închidere',
      'spec.material': 'Materiale',

      'card.view': 'Vezi detalii',
      'card.unique': 'Unicat',
      'card.sold': 'Vândut',
      'card.first': 'Prima geantă',

      'dims.h': 'Înălțime',
      'dims.w': 'Lățime',
      'dims.d': 'Adâncime',
      'dims.pending': 'Dimensiuni la cerere',

      'order.eyebrow': 'Aproape gata',
      'order.title': 'Mesajul tău de comandă',
      'order.lede': 'Apasă butonul: copiem textul de mai jos și deschidem conversația cu <strong>@nomisannele</strong>. Lipește-l acolo (ține apăsat → Paste) și trimite.',
      'order.label': 'Mesaj',
      'order.go': 'Copiază și deschide Instagram',
      'order.copyOnly': 'Doar copiază mesajul',
      'order.fallback': 'Dacă nu se deschide aplicația, scrie-ne la <a href="https://www.instagram.com/nomisannele/" target="_blank" rel="noopener">@nomisannele</a>.',

      'toast.copied': 'Mesaj copiat — lipește-l în conversație ✓',
      'toast.copyFail': 'Selectează textul și copiază-l manual.',
    },

    en: {
      'skip': 'Skip to collection',

      'nav.collection': 'Collection',
      'nav.story': 'Our story',
      'nav.process': 'How we work',
      'nav.contact': 'Contact',

      'hero.eyebrow': 'Upcycled fashion · made by hand',
      'hero.title1': 'Every pair of jeans',
      'hero.title2': 'deserves a second life',
      'hero.lede': 'We are a mother and a daughter. We turn worn denim into one-of-a-kind bags — cut to suit your style and kinder to the planet.',
      'hero.ctaPrimary': 'See the collection',
      'hero.ctaSecondary': 'Our story',

      'collection.eyebrow': 'The collection',
      'collection.title': 'Every bag exists exactly once',
      'collection.lede': 'Because we start from worn jeans, no two bags are ever the same. What you see here is what exists — and once a bag is gone, it is gone for good.',
      'collection.note': 'Want something specific — a different size, different colours, your own jeans turned into a bag? <a href="#contact">Write to us</a> and we will work it out together.',

      'story.eyebrow': 'Our story',
      'story.badge': 'the year we started',
      'story.title': 'A mother, a daughter and a pile of jeans',
      'story.p1': 'NOMIS ANNELE started at home, in 2025, out of a simple habit: we never threw old jeans away. They piled up in a corner — too good for the bin, too worn to keep wearing.',
      'story.p2': 'That is how the first bag happened. Then the second. Now we work together — mother and daughter — cutting, sewing and finishing every piece by hand, one at a time, at our own pace.',
      'story.p3': 'We do not mass-produce and we do not rush. Every bag carries the seams, pockets and marks of the jeans it came from. That is what makes it yours and nobody else’s.',
      'story.quote': '“Upcycling is fashion that actually cares.”',

      'process.eyebrow': 'How we work',
      'process.title': 'From worn jeans to finished bag',
      'process.s1t': 'We collect',
      'process.s1p': 'Worn jeans — donated or rescued from the bin. We wash them and sort them by wash and texture.',
      'process.s2t': 'We cut',
      'process.s2p': 'We draw the pattern and cut it piece by piece. The original pockets, hems and labels stay — they are each bag’s signature.',
      'process.s3t': 'We sew',
      'process.s3p': 'Everything is sewn by hand, with lining, inner pockets and a closure. A bag can take a single pair of jeans, or twelve — it depends on the design.',
      'process.s4t': 'It reaches you',
      'process.s4p': 'You message us on Instagram, we sort out the details and the delivery. Simple, direct, no middlemen.',
      'process.f1': 'pairs of jeans in every bag',
      'process.f2': 'handmade, at home',
      'process.f3': 'every piece is one of a kind',

      'contact.eyebrow': 'Ordering',
      'contact.title': 'Orders happen straight in Instagram',
      'contact.lede': 'We are a small family workshop — so we talk to every customer personally. Pick a bag, press the button, and we will have your order message written and ready. All you do is paste it into the chat.',
      'contact.dm': 'Message us on Instagram',
      'contact.profile': 'See the @nomisannele profile',
      'contact.small': 'We usually reply the same day. We ship across Romania.',

      'footer.tag': 'Upcycled fashion · est. 2025',

      'product.order': 'Order on Instagram',
      'product.orderNote': 'We copy your order message and open the chat for you. Just paste it and hit send.',
      'product.soldNote': 'This bag has already found its home. Write to us if you would like something similar — we can make one to order.',
      'product.madeFrom': 'Made from {n} upcycled pairs of jeans',
      'product.madeFromOne': 'Upcycled from a single pair of jeans',

      'spec.pockets': 'Pockets',
      'spec.closure': 'Closure',
      'spec.material': 'Material',

      'card.view': 'View details',
      'card.unique': 'One of a kind',
      'card.sold': 'Sold',
      'card.first': 'Our first bag',

      'dims.h': 'Height',
      'dims.w': 'Width',
      'dims.d': 'Depth',
      'dims.pending': 'Measurements on request',

      'order.eyebrow': 'Almost there',
      'order.title': 'Your order message',
      'order.lede': 'Press the button: we copy the text below and open the chat with <strong>@nomisannele</strong>. Paste it there (press and hold → Paste) and send.',
      'order.label': 'Message',
      'order.go': 'Copy & open Instagram',
      'order.copyOnly': 'Just copy the message',
      'order.fallback': 'If the app does not open, message us at <a href="https://www.instagram.com/nomisannele/" target="_blank" rel="noopener">@nomisannele</a>.',

      'toast.copied': 'Message copied — paste it into the chat ✓',
      'toast.copyFail': 'Select the text and copy it manually.',
    },
  };

  let lang = 'ro';
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.ro[key] || key;

  /* ───────────────────────────────────────────
     2. Small helpers
     ─────────────────────────────────────────── */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* A denim placeholder shown until a real photo is dropped into
     assets/images/. Keeps the layout intact and looks deliberate. */
  function placeholder(label, tint) {
    const box = el('div', 'ph' + (tint && tint !== 'denim' ? ' ph--' + tint : ''));
    box.appendChild(el('span', null, label));
    return box;
  }

  /* <img> that quietly falls back to the placeholder if the file
     isn't there yet. */
  function photo(src, alt, label, tint) {
    const img = new Image();
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', function () {
      const ph = placeholder(label, tint);
      if (img.parentNode) img.parentNode.replaceChild(ph, img);
    });
    return img;
  }

  const photoSrc = (product, i) => IMG_PATH + product.id + '-' + i + '.jpg';

  /* "Creată din 3 blugi upcycled" / "dintr-o singură pereche" */
  function madeFromLabel(n) {
    if (n === 1) return t('product.madeFromOne');
    return t('product.madeFrom').replace('{n}', n);
  }

  /* ───────────────────────────────────────────
     3. Applying a language
     ─────────────────────────────────────────── */

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;

    $$('[data-i18n]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n'));
      if (value.indexOf('<') !== -1) node.innerHTML = value;
      else node.textContent = value;
    });

    $$('.langswitch button').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.lang === next)
    );

    try { localStorage.setItem('na-lang', next); } catch (e) { /* private mode */ }

    renderGrid();
    if (openProduct) fillProductModal(openProduct);
  }

  /* ───────────────────────────────────────────
     4. Product grid
     ─────────────────────────────────────────── */

  const grid = $('#product-grid');

  function dimsLabel(p) {
    if (p.dims.h == null) return t('dims.pending');
    return p.dims.h + ' × ' + p.dims.w + ' × ' + p.dims.d + ' cm';
  }

  function renderGrid() {
    grid.innerHTML = '';

    PRODUCTS.forEach((p) => {
      const card = el('button', 'card reveal');
      card.type = 'button';
      card.setAttribute('aria-label', p.name);

      const media = el('div', 'card__media');
      media.appendChild(photo(photoSrc(p, 1), p.name, p.name, p.tint));

      let flagText = t('card.unique');
      if (p.sold) flagText = t('card.sold');
      else if (p.badge === 'first') flagText = t('card.first');
      media.appendChild(el('span', 'card__flag' + (p.sold ? ' card__flag--sold' : ''), flagText));

      const body = el('div', 'card__body');
      body.appendChild(el('h3', 'card__name', p.name));
      body.appendChild(el('p', 'card__tagline', p[lang].tagline));

      const meta = el('div', 'card__meta');
      meta.appendChild(el('span', null, dimsLabel(p)));
      meta.appendChild(el('span', 'card__more', t('card.view')));
      body.appendChild(meta);

      card.appendChild(media);
      card.appendChild(body);
      card.addEventListener('click', () => showProduct(p));
      grid.appendChild(card);
    });

    observeReveals();
  }

  /* ───────────────────────────────────────────
     5. Product modal
     ─────────────────────────────────────────── */

  const productModal = $('#product-modal');
  const stage = $('#pm-stage');
  const thumbs = $('#pm-thumbs');
  let openProduct = null;

  function fillProductModal(p) {
    $('#pm-tagline').textContent = p[lang].tagline;
    $('#pm-title').textContent = p.name;
    $('#pm-desc').textContent = p[lang].description;

    const specs = $('#pm-specs');
    specs.innerHTML = '';
    const rows = [
      [t('spec.pockets'), p[lang].pockets],
      [t('spec.closure'), p[lang].closure],
    ];
    if (p.madeFrom) rows.push([t('spec.material'), madeFromLabel(p.madeFrom)]);
    rows.forEach(([k, v]) => {
      if (!v) return;
      const row = el('li');
      row.appendChild(el('span', 'k', k));
      row.appendChild(el('span', 'v', v));
      specs.appendChild(row);
    });

    const dims = $('#pm-dims');
    dims.innerHTML = '';
    if (p.dims.h == null) {
      dims.className = 'pm__dims pm__dims--empty';
    } else {
      dims.className = 'pm__dims';
      [['dims.h', p.dims.h], ['dims.w', p.dims.w], ['dims.d', p.dims.d]].forEach(([key, val]) => {
        const cell = el('div');
        cell.appendChild(el('dt', null, t(key)));
        cell.appendChild(el('dd', null, val + ' cm'));
        dims.appendChild(cell);
      });
    }

    // gallery
    stage.innerHTML = '';
    thumbs.innerHTML = '';
    stage.appendChild(photo(photoSrc(p, 1), p.name, p.name, p.tint));

    if (p.photos > 1) {
      thumbs.hidden = false;
      for (let i = 1; i <= p.photos; i++) {
        const btn = el('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', p.name + ' — ' + i);
        btn.appendChild(photo(photoSrc(p, i), '', String(i), p.tint));
        if (i === 1) btn.classList.add('is-active');
        btn.addEventListener('click', () => {
          stage.innerHTML = '';
          stage.appendChild(photo(photoSrc(p, i), p.name, p.name, p.tint));
          $$('button', thumbs).forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        });
        thumbs.appendChild(btn);
      }
    } else {
      thumbs.hidden = true;
    }

    // order button
    const orderBtn = $('#pm-order');
    const note = $('.pm__note');
    if (p.sold) {
      orderBtn.classList.add('is-disabled');
      orderBtn.setAttribute('aria-disabled', 'true');
      note.textContent = t('product.soldNote');
    } else {
      orderBtn.classList.remove('is-disabled');
      orderBtn.removeAttribute('aria-disabled');
      note.textContent = t('product.orderNote');
    }
    $('span', orderBtn).textContent = t('product.order');
  }

  function showProduct(p) {
    openProduct = p;
    fillProductModal(p);
    openModal(productModal);
  }

  /* ───────────────────────────────────────────
     6. Order sheet → Instagram DM
     ─────────────────────────────────────────── */

  const orderModal = $('#order-modal');
  const orderText = $('#om-text');

  function buildMessage(p) {
    const dims = p.dims.h == null ? null : p.dims.h + ' × ' + p.dims.w + ' × ' + p.dims.d + ' cm';

    if (lang === 'en') {
      return [
        'Hi! 👋',
        '',
        'I saw the “' + p.name + '” bag on your website and I would like to order it.',
        '',
        '• Model: ' + p.name,
        dims ? '• Measurements: ' + dims : null,
        '',
        'Could you let me know the price and how delivery works?',
        'Thank you!',
      ].filter((line) => line !== null).join('\n');
    }

    return [
      'Bună! 👋',
      '',
      'Am văzut geanta „' + p.name + '” pe site și aș vrea să o comand.',
      '',
      '• Model: ' + p.name,
      dims ? '• Dimensiuni: ' + dims : null,
      '',
      'Îmi puteți spune prețul și cum se face livrarea?',
      'Mulțumesc!',
    ].filter((line) => line !== null).join('\n');
  }

  /* Copy that works even where the async Clipboard API is blocked
     (older Safari, non-secure origins). */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      orderText.value = text;
      orderText.focus();
      orderText.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      return ok;
    } catch (e) {
      return false;
    }
  }

  $('#pm-order').addEventListener('click', function () {
    if (!openProduct || openProduct.sold) return;
    orderText.value = buildMessage(openProduct);
    closeModal(productModal, true);
    openModal(orderModal);
  });

  /* The anchor keeps its default navigation so no popup blocker
     gets in the way; the copy happens alongside it. */
  $('#om-go').addEventListener('click', function () {
    copyText(orderText.value).then((ok) => {
      toast(ok ? t('toast.copied') : t('toast.copyFail'));
    });
  });

  $('#om-copy').addEventListener('click', function () {
    copyText(orderText.value).then((ok) => {
      toast(ok ? t('toast.copied') : t('toast.copyFail'));
    });
  });

  /* ───────────────────────────────────────────
     7. Modal plumbing
     ─────────────────────────────────────────── */

  let lastFocus = null;

  function openModal(modal) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    const focusable = $('.modal__close', modal);
    if (focusable) focusable.focus();
  }

  function closeModal(modal, keepLock) {
    modal.hidden = true;
    if (!keepLock) {
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    if (modal === productModal) openProduct = null;
  }

  $$('[data-close]').forEach((node) => {
    node.addEventListener('click', () => closeModal(node.closest('.modal')));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = $$('.modal').filter((m) => !m.hidden).pop();
    if (open) closeModal(open);
  });

  /* ───────────────────────────────────────────
     8. Toast
     ─────────────────────────────────────────── */

  const toastEl = $('#toast');
  let toastTimer = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 4200);
  }

  /* ───────────────────────────────────────────
     9. Nav, reveals, misc
     ─────────────────────────────────────────── */

  const nav = $('#nav');
  const burger = $('.nav__burger');
  const navLinks = $('.nav__links');

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('is-open', !open);
  });

  $$('.nav__links a').forEach((a) =>
    a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('is-open');
    })
  );

  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  }, { passive: true });

  $$('.langswitch button').forEach((b) =>
    b.addEventListener('click', () => applyLang(b.dataset.lang))
  );

  let revealObserver = null;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach((n) => n.classList.add('is-in'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
    }
    $$('.reveal:not(.is-in)').forEach((n) => revealObserver.observe(n));
  }

  /* the story photo, if one has been added */
  (function storyPhoto() {
    const box = $('[data-photo="story"]');
    if (!box) return;
    const img = new Image();
    img.src = IMG_PATH + 'story.jpg';
    img.alt = 'NOMIS ANNELE';
    img.addEventListener('load', () => box.appendChild(img));
  })();

  /* ───────────────────────────────────────────
     10. Boot
     ─────────────────────────────────────────── */

  $('#year').textContent = String(new Date().getFullYear());
  $('#dm-generic').href = IG_DM;
  $('#om-go').href = IG_DM;

  let saved = null;
  try { saved = localStorage.getItem('na-lang'); } catch (e) { /* ignore */ }
  applyLang(saved === 'en' ? 'en' : 'ro');

  $$('.section__head, .story, .steps, .facts, .contact').forEach((n) => n.classList.add('reveal'));
  observeReveals();
})();
