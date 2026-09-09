/* ═══════════════════════════════════════════
   NOMIS ANNELE — scriptul paginii
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  var IG_HANDLE = 'nomisannele';
  var IG_DM = 'https://ig.me/m/' + IG_HANDLE;
  var IMG_PATH = 'assets/images/';

  /* ───────────────────────────────────────────
     1. Traduceri
     ─────────────────────────────────────────── */

  var I18N = {
    ro: {
      'skip': 'Sari la genți',

      'nav.collection': 'Genți',
      'nav.story': 'Cine suntem',
      'nav.process': 'Cum le facem',
      'nav.contact': 'Scrie-ne',

      'hero.eyebrow': 'Lucrate manual, din blugi purtați',
      'hero.title1': 'Fiecare pereche de blugi',
      'hero.title2': 'merită o a doua șansă',
      'hero.lede': 'Suntem mamă și fiică. Coasem genți din blugi purtați, acasă, una câte una. Nu iese niciodată aceeași geantă de două ori.',
      'hero.ctaPrimary': 'Vezi gențile',
      'hero.ctaSecondary': 'Cine suntem',

      'collection.eyebrow': 'Gențile',
      'collection.title': 'Nu există două genți la fel',
      'collection.lede': 'Pornim de la blugi purtați, deci fiecare geantă iese altfel. Când una pleacă, gata. Nu o mai putem face identic nici dacă vrem.',
      'collection.note': 'Ai alt model în cap? Sau niște blugi de care nu te înduri să te desparți? <a href="#contact">Scrie-ne</a>, facem geanta pe măsura ta.',

      'story.eyebrow': 'Cine suntem',
      'story.badge': 'de atunci coasem',
      'story.title': 'O mamă, o fiică și un teanc de blugi',
      'story.p1': 'A început acasă, în 2025, cu un teanc de blugi de care nu ne înduram să scăpăm. Prea buni pentru gunoi, prea uzați ca să-i mai purtăm.',
      'story.p2': 'Prima geantă a ieșit din douăsprezece perechi și ne-a luat mult mai mult decât credeam. Se numește Patchwork și e tot aici, mai jos. După ea a venit a doua, apoi restul.',
      'story.p3': 'Lucrăm împreună, de mână. Croim, coasem și, când nu ne place cum a ieșit, desfacem și o luăm de la capăt. De asta nu facem multe și de asta fiecare geantă poartă cusăturile și buzunarele blugilor din care s-a născut.',
      'story.quote': '„Upcycling-ul e moda căreia chiar îi pasă.”',

      'process.eyebrow': 'Cum le facem',
      'process.title': 'De la blugi purtați la geantă',
      'process.s1t': 'Strângem blugi',
      'process.s1p': 'De la prieteni, din donații, de prin dulapuri. Îi spălăm și îi sortăm după culoare și textură.',
      'process.s2t': 'Croim',
      'process.s2p': 'Desenăm modelul și tăiem bucată cu bucată. Buzunarele, tivurile și etichetele rămân unde erau. Ele fac diferența.',
      'process.s3t': 'Coasem',
      'process.s3p': 'Cu căptușeală, buzunare interioare și fermoar sau nasture. Într-o geantă intră de la o pereche de blugi până la douăsprezece.',
      'process.s4t': 'Ți-o trimitem',
      'process.s4p': 'Ne scrii pe Instagram, stabilim detaliile, ți-o trimitem. Vorbești direct cu noi, fără intermediari.',
      'process.f1': 'perechi de blugi într-o geantă',
      'process.f2': 'perechi salvate până acum',
      'process.f3': 'genți identice',

      'contact.eyebrow': 'Scrie-ne',
      'contact.title': 'Vorbim pe Instagram',
      'contact.lede': 'Suntem doar noi două, așa că răspundem fiecărui om în parte. Spune-ne care geantă îți place și îți zicem prețul și cum facem livrarea. De obicei răspundem în aceeași zi.',
      'contact.dm': 'Scrie-ne pe Instagram',
      'contact.profile': 'Vezi profilul',
      'contact.small': 'Livrăm în toată România.',

      'footer.tag': 'Genți din blugi, lucrate manual · din 2025',

      'product.order': 'Întreabă de geanta asta',
      'product.orderNote': 'Se deschide conversația cu @nomisannele. Zi-ne că e vorba de „{name}” și îți spunem prețul.',
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

      'nav.collection': 'Bags',
      'nav.story': 'About us',
      'nav.process': 'How we make them',
      'nav.contact': 'Say hello',

      'hero.eyebrow': 'Handmade, from worn jeans',
      'hero.title1': 'Every pair of jeans',
      'hero.title2': 'deserves a second chance',
      'hero.lede': 'We are a mother and a daughter. We sew bags out of worn jeans, at home, one at a time. The same bag never comes out twice.',
      'hero.ctaPrimary': 'See the bags',
      'hero.ctaSecondary': 'About us',

      'collection.eyebrow': 'The bags',
      'collection.title': 'No two bags are alike',
      'collection.lede': 'We start from worn jeans, so every bag turns out different. Once one is gone, that is it. We could not make it again even if we tried.',
      'collection.note': 'Got another shape in mind? Or a pair of jeans you cannot bring yourself to throw out? <a href="#contact">Write to us</a> and we will make one to fit you.',

      'story.eyebrow': 'About us',
      'story.badge': 'sewing since then',
      'story.title': 'A mother, a daughter and a pile of jeans',
      'story.p1': 'It started at home, in 2025, with a pile of jeans we could not bring ourselves to get rid of. Too good for the bin, too worn to keep wearing.',
      'story.p2': 'The first bag took twelve pairs and far longer than we expected. It is called Patchwork and it is still here, further down. Then came the second one, then the rest.',
      'story.p3': 'We work together, by hand. We cut, we sew, and when we do not like how it turned out we unpick it and start again. That is why we do not make many, and why every bag carries the seams and pockets of the jeans it came from.',
      'story.quote': '“Upcycling is fashion that actually cares.”',

      'process.eyebrow': 'How we make them',
      'process.title': 'From worn jeans to finished bag',
      'process.s1t': 'We gather jeans',
      'process.s1p': 'From friends, from donations, from the back of wardrobes. We wash them and sort them by colour and texture.',
      'process.s2t': 'We cut',
      'process.s2p': 'We draw the pattern and cut piece by piece. Pockets, hems and labels stay where they were. They are what makes the difference.',
      'process.s3t': 'We sew',
      'process.s3p': 'With lining, inner pockets and a zip or a button. A bag takes anywhere from one pair of jeans to twelve.',
      'process.s4t': 'We send it to you',
      'process.s4p': 'You message us on Instagram, we sort out the details, we post it. You talk to us directly, with nobody in between.',
      'process.f1': 'pairs of jeans in one bag',
      'process.f2': 'pairs saved so far',
      'process.f3': 'identical bags',

      'contact.eyebrow': 'Say hello',
      'contact.title': 'We talk on Instagram',
      'contact.lede': 'There are only two of us, so we answer every person ourselves. Tell us which bag you like and we will send you the price and how delivery works. Usually the same day.',
      'contact.dm': 'Message us on Instagram',
      'contact.profile': 'See the profile',
      'contact.small': 'We ship across Romania.',

      'footer.tag': 'Handmade denim bags · since 2025',

      'product.order': 'Ask about this bag',
      'product.orderNote': 'Opens a chat with @nomisannele. Mention “{name}” and we will send you the price.',
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

  var lang = 'ro';
  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.ro[key] || key;
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

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;

    $$('[data-i18n]').forEach(function (node) {
      var value = t(node.getAttribute('data-i18n'));
      if (value.indexOf('<') !== -1) node.innerHTML = value;
      else node.textContent = value;
    });

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

    if (p.photos > 1) {
      thumbs.hidden = false;
      var makeThumb = function (i) {
        var btn = el('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', fill('a11y.photoOf', { n: i, name: p.name }));
        btn.appendChild(photo(photoSrc(p, i), '', String(i), p.tint));
        if (i === 1) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          setStage(p, i);
          $$('button', thumbs).forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
        });
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
    document.body.style.top = '-' + scrollLock + 'px';
    backgroundRegions().forEach(function (r) { r.inert = true; });
    var first = $('.modal__close', modal);
    if (first) first.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    document.body.style.top = '';
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
