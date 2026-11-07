/* ═══════════════════════════════════════════
   NOMIS ANNELE — scriptul paginii
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  var IG_HANDLE = 'nomis.annele';
  var IG_DM = 'https://ig.me/m/' + IG_HANDLE;
  var IMG_PATH = 'assets/images/';

  /* ───────────────────────────────────────────
     1. Traduceri
     ─────────────────────────────────────────── */

  var UI = {
    ro: {
      'skip': 'Sari la genți',

      'product.order': 'Întreabă de geanta asta',
      'product.orderNote': 'Se deschide conversația cu @nomis.annele. Zi-ne că e vorba de „{name}” și îți spunem prețul.',
      'product.sold': 'Geanta asta și-a găsit deja casa',
      'product.soldNote': 'Scrie-ne dacă îți dorești ceva asemănător. Putem coase un model pe comandă.',
      'product.madeFrom': 'Creată din {n} blugi upcycled',
      'product.madeFromOne': 'Dintr-o singură pereche de blugi',

      'spec.pockets': 'Buzunare',
      'spec.closure': 'Închidere',
      'spec.material': 'Materiale',

      'card.view': 'Vezi detalii',
      'card.unique': 'Unicat',
      'card.sold': 'Vândută',
      'card.first': 'Prima geantă',

      'dims.h': 'Înălțime',
      'dims.w': 'Lățime',
      'dims.d': 'Adâncime',
      'dims.pending': 'Dimensiuni la cerere',

      'a11y.photoOf': 'Fotografia {n} cu geanta {name}',
      'a11y.openBag': 'Vezi detalii despre geanta {name}',
    },

    en: {
      'skip': 'Skip to the bags',

      'product.order': 'Ask about this bag',
      'product.orderNote': 'Opens a chat with @nomis.annele. Mention “{name}” and we will send you the price.',
      'product.sold': 'This bag has already found its home',
      'product.soldNote': 'Write to us if you would like something similar. We can sew one to order.',
      'product.madeFrom': 'Made from {n} upcycled pairs of jeans',
      'product.madeFromOne': 'From a single pair of jeans',

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

      'a11y.photoOf': 'Photo {n} of the {name} bag',
      'a11y.openBag': 'View details of the {name} bag',
    },
  };

  /* Textele editabile vin din content.js (CONTENT); aici rămâne doar
     interfața: butoane, etichete de card, mesaje. */
  var lang = 'ro';
  function t(key) {
    var c = (typeof CONTENT !== 'undefined' && CONTENT) || {};
    return (c[lang] && c[lang][key]) || (UI[lang] && UI[lang][key]) ||
      (c.ro && c.ro[key]) || UI.ro[key] || key;
  }
  function fill(key, values) {
    return t(key).replace(/\{(\w+)\}/g, function (_, k) { return values[k]; });
  }

  /* ───────────────────────────────────────────
     2. Ajutoare
     ─────────────────────────────────────────── */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* Politica de securitate blochează stilurile puse direct pe element
     (style-src 'self'), iar noi avem două valori care chiar trebuie să se
     schimbe din cod. Le ținem într-o foaie de stil construită din script:
     pe aceea CSP n-o consideră „inline", deci rămâne strictă și merge. */
  var liveSheet = (function () {
    if (typeof CSSStyleSheet === 'undefined' || !('adoptedStyleSheets' in document)) return null;
    try {
      var sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [].concat(document.adoptedStyleSheets || [], sheet);
      return sheet;
    } catch (e) { return null; }
  })();

  var liveVars = { '--scroll-lock': '0px' };
  function setVar(name, value) {
    liveVars[name] = value;
    if (!liveSheet) return;
    var body = '';
    for (var key in liveVars) {
      if (Object.prototype.hasOwnProperty.call(liveVars, key)) body += key + ':' + liveVars[key] + ';';
    }
    try { liveSheet.replaceSync(':root{' + body + '}'); } catch (e) { /* ignoră */ }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* Fundal de denim afișat până când apare fotografia. */
  function placeholder(label, tint) {
    var box = el('div', 'ph' + (tint && tint !== 'denim' ? ' ph--' + tint : ''));
    box.appendChild(el('span', null, label));
    return box;
  }

  /* <img> care cade elegant pe fundalul de denim dacă fișierul lipsește. */
  function photo(src, alt, label, tint, eager) {
    var img = new Image();
    img.alt = alt;
    img.decoding = 'async';
    if (eager) { img.loading = 'eager'; img.fetchPriority = 'high'; }
    else { img.loading = 'lazy'; }
    /* ascultătorul se pune înaintea sursei, ca să prindem și fișierele
       despre care browserul știe deja că lipsesc */
    img.addEventListener('error', function () {
      var ph = placeholder(label, tint);
      if (img.parentNode) img.parentNode.replaceChild(ph, img);
    });
    img.src = src;
    return img;
  }

  function photoSrc(product, i) { return IMG_PATH + product.id + '-' + i + '.jpg'; }

  function madeFromLabel(n) {
    return n === 1 ? t('product.madeFromOne') : fill('product.madeFrom', { n: n });
  }

  function dimsLabel(p) {
    if (p.dims.h == null) return t('dims.pending');
    return p.dims.h + ' × ' + p.dims.w + ' × ' + p.dims.d + ' cm';
  }

  /* ───────────────────────────────────────────
     3. Schimbarea limbii
     ─────────────────────────────────────────── */

  var NOTE_LINK = /<a href="([#/](?!\/)[a-z0-9\/#-]{0,120})">([^<>]{1,120})<\/a>/;

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;

    $$('[data-i18n]').forEach(function (node) {
      var value = t(node.getAttribute('data-i18n'));
      var key = node.getAttribute('data-i18n');
      var link = key === 'collection.note' && NOTE_LINK.exec(value);
      if (link && !/[<>]/.test(value.replace(NOTE_LINK, ''))) {
        /* singurul HTML permis: un link intern; îl construim, nu îl injectăm */
        node.textContent = '';
        node.appendChild(document.createTextNode(value.slice(0, link.index)));
        var a = document.createElement('a');
        a.setAttribute('href', link[1]);
        a.textContent = link[2];
        node.appendChild(a);
        node.appendChild(document.createTextNode(value.slice(link.index + link[0].length)));
      } else node.textContent = value;
    });

    document.title = t('seo.title');
    var metaDesc = $('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('seo.description'));

    $$('.langswitch button').forEach(function (b) {
      var on = b.dataset.lang === next;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-active', on);
    });

    try { localStorage.setItem('na-lang', next); } catch (e) { /* navigare privată */ }

    renderGrid();
    if (openProduct) fillProductModal(openProduct);
  }

  /* ───────────────────────────────────────────
     4. Grila cu genți
     ─────────────────────────────────────────── */

  var grid = $('#product-grid');

  function renderGrid() {
    grid.innerHTML = '';

    PRODUCTS.forEach(function (p, index) {
      var card = el('button', 'card reveal');
      card.type = 'button';
      card.setAttribute('aria-label', fill('a11y.openBag', { name: p.name }));

      var media = el('div', 'card__media');
      media.appendChild(photo(photoSrc(p, 1), '', p.name, p.tint, index === 0));

      var flagText = t('card.unique');
      if (p.sold) flagText = t('card.sold');
      else if (p.badge === 'first') flagText = t('card.first');
      media.appendChild(el('span', 'card__flag' + (p.sold ? ' card__flag--sold' : ''), flagText));

      var body = el('div', 'card__body');
      body.appendChild(el('h3', 'card__name', p.name));
      body.appendChild(el('p', 'card__tagline', p[lang].tagline));

      var meta = el('div', 'card__meta');
      meta.appendChild(el('span', null, dimsLabel(p)));
      meta.appendChild(el('span', 'card__more', t('card.view')));
      body.appendChild(meta);

      card.appendChild(media);
      card.appendChild(body);
      card.addEventListener('click', function () { showProduct(p, card); });
      grid.appendChild(card);
    });

    observeReveals();
  }

  /* ───────────────────────────────────────────
     5. Fereastra cu geanta
     ─────────────────────────────────────────── */

  var productModal = $('#product-modal');
  var stage = $('#pm-stage');
  var thumbs = $('#pm-thumbs');
  var orderLink = $('#pm-order');
  var openProduct = null;

  function setStage(p, i) {
    stage.innerHTML = '';
    stage.appendChild(
      photo(photoSrc(p, i), fill('a11y.photoOf', { n: i, name: p.name }), p.name, p.tint, true)
    );
  }

  function fillProductModal(p) {
    $('#pm-tagline').textContent = p[lang].tagline;
    $('#pm-title').textContent = p.name;
    $('#pm-desc').textContent = p[lang].description;

    var specs = $('#pm-specs');
    specs.innerHTML = '';
    var rows = [
      [t('spec.pockets'), p[lang].pockets],
      [t('spec.closure'), p[lang].closure],
    ];
    if (p.madeFrom) rows.push([t('spec.material'), madeFromLabel(p.madeFrom)]);
    rows.forEach(function (row) {
      if (!row[1]) return;
      var li = el('li');
      li.appendChild(el('span', 'k', row[0]));
      li.appendChild(el('span', 'v', row[1]));
      specs.appendChild(li);
    });

    var dims = $('#pm-dims');
    dims.innerHTML = '';
    if (p.dims.h == null) {
      dims.className = 'pm__dims pm__dims--empty';
    } else {
      dims.className = 'pm__dims';
      [['dims.h', p.dims.h], ['dims.w', p.dims.w], ['dims.d', p.dims.d]].forEach(function (pair) {
        var cell = el('div');
        cell.appendChild(el('span', 'k', t(pair[0])));
        cell.appendChild(el('span', 'v', pair[1] + ' cm'));
        dims.appendChild(cell);
      });
    }

    /* galeria */
    thumbs.innerHTML = '';
    setStage(p, 1);

    function activate(btn) {
      $$('button', thumbs).forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    }

    if (p.photos > 1) {
      thumbs.hidden = false;

      var makeThumb = function (i) {
        var btn = el('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', fill('a11y.photoOf', { n: i, name: p.name }));
        btn.appendChild(photo(photoSrc(p, i), '', String(i), p.tint));
        if (i === 1) btn.classList.add('is-active');
        btn.addEventListener('click', function () { setStage(p, i); activate(btn); });
        return btn;
      };
      for (var i = 1; i <= p.photos; i++) thumbs.appendChild(makeThumb(i));
    } else {
      thumbs.hidden = true;
    }

    /* un singur tap: deschide direct conversația */
    var note = $('#pm-note');
    if (p.sold) {
      orderLink.removeAttribute('href');
      orderLink.setAttribute('role', 'link');
      orderLink.setAttribute('aria-disabled', 'true');
      orderLink.classList.add('is-disabled');
      $('#pm-order-label').textContent = t('product.sold');
      note.textContent = t('product.soldNote');
    } else {
      orderLink.href = IG_DM;
      orderLink.removeAttribute('aria-disabled');
      orderLink.classList.remove('is-disabled');
      $('#pm-order-label').textContent = t('product.order');
      note.textContent = fill('product.orderNote', { name: p.name });
    }
  }

  function showProduct(p, trigger) {
    openProduct = p;
    fillProductModal(p);
    openModal(productModal, trigger);
  }

  /* ───────────────────────────────────────────
     6. Mecanica ferestrei
     ─────────────────────────────────────────── */

  var lastFocus = null;
  var scrollLock = 0;
  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function backgroundRegions() {
    return [$('#nav'), $('main'), $('.footer')].filter(Boolean);
  }

  function openModal(modal, trigger) {
    lastFocus = trigger || document.activeElement;
    scrollLock = window.scrollY;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    setVar('--scroll-lock', '-' + scrollLock + 'px');
    backgroundRegions().forEach(function (r) { r.inert = true; });
    var first = $('.modal__close', modal);
    if (first) first.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    setVar('--scroll-lock', '0px');
    backgroundRegions().forEach(function (r) { r.inert = false; });
    window.scrollTo(0, scrollLock);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (modal === productModal) openProduct = null;
  }

  $$('[data-close]').forEach(function (node) {
    node.addEventListener('click', function () {
      closeModal(node.closest('.modal'));
    });
  });

  document.addEventListener('keydown', function (e) {
    var open = $$('.modal').filter(function (m) { return !m.hidden; }).pop();
    if (!open) return;

    if (e.key === 'Escape') { closeModal(open); return; }

    /* ține focusul în fereastră cât e deschisă */
    if (e.key === 'Tab') {
      var items = $$(FOCUSABLE, open).filter(function (n) {
        return n.offsetParent !== null && !n.hasAttribute('aria-disabled');
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ───────────────────────────────────────────
     7. Meniu, apariții la scroll, restul
     ─────────────────────────────────────────── */

  var nav = $('#nav');
  var burger = $('.nav__burger');
  var navLinks = $('.nav__links');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    navLinks.classList.toggle('is-open', open);
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  $$('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
      ticking = false;
    });
  }, { passive: true });

  $$('.langswitch button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang); });
  });

  var revealObserver = null;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
    }
    $$('.reveal:not(.is-in)').forEach(function (n) { revealObserver.observe(n); });
  }

  /* Fotografia din secțiunea „Cine suntem”. Dacă story.jpg încă nu există,
     punem Patchwork, geanta despre care vorbește chiar textul de alături. */
  (function storyPhoto() {
    var box = $('[data-photo="story"]');
    if (!box) return;

    /* ascultătorii se pun înaintea sursei: altfel, la un fișier deja
       știut ca lipsă, evenimentul de eroare poate trece pe lângă noi */
    function show(src, alt, onError) {
      var img = new Image();
      img.alt = alt;
      img.decoding = 'async';
      img.addEventListener('load', function () {
        box.innerHTML = '';
        box.appendChild(img);
      });
      if (onError) img.addEventListener('error', onError);
      img.src = src;
    }

    show(IMG_PATH + 'story.jpg', 'NOMIS ANNELE', function () {
      show(IMG_PATH + 'patchwork-1.jpg', 'Patchwork, prima geantă NOMIS ANNELE');
    });
  })();

  /* ───────────────────────────────────────────
     8. Pornire
     ─────────────────────────────────────────── */

  $('#year').textContent = String(new Date().getFullYear());
  $('#dm-generic').href = IG_DM;

  var saved = null;
  try { saved = localStorage.getItem('na-lang'); } catch (e) { /* ignoră */ }
  if (!saved) {
    var nav0 = (navigator.language || 'ro').toLowerCase();
    saved = nav0.indexOf('ro') === 0 ? 'ro' : 'en';
  }
  applyLang(saved === 'en' ? 'en' : 'ro');

  $$('.section__head, .story, .steps, .facts, .contact').forEach(function (n) {
    n.classList.add('reveal');
  });
  observeReveals();
})();
