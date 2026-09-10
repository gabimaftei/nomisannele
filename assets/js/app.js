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

      'model.tab': 'Model 3D',
      'model.open': 'Vezi modelul 3D al gențile {name}',
      'model.note': 'Model tridimensional, pe care îl poți roti. Culorile și țesătura sunt apropiate de cele reale, dar așezarea exactă a peticelor se vede doar în fotografii.',
      'model.loading': 'Se încarcă modelul…',
      'model.error': 'Modelul nu a putut fi încărcat. Fotografiile sunt mai sus.',

      'orbit.hint': 'Derulează ca să întorci geanta',
      'orbit.alt': 'Geanta Nuanțe de gri, în trei dimensiuni, care se rotește pe măsură ce derulezi',
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

      'model.tab': '3D model',
      'model.open': 'View the 3D model of the {name} bag',
      'model.note': 'A three-dimensional model you can turn around. The colours and weave are close to the real thing, but the exact arrangement of the patches is only in the photographs.',
      'model.loading': 'Loading the model…',
      'model.error': 'The model could not be loaded. The photographs are above.',

      'orbit.hint': 'Scroll to turn the bag',
      'orbit.alt': 'The Nuanțe de gri bag in three dimensions, turning as you scroll',
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

  var liveVars = { '--scroll-lock': '0px', '--orbit-progress': '0' };
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
    if (typeof orbit !== 'undefined' && orbit && orbit.active()) orbit.refresh();
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

  /* Vizualizatorul 3D ține un context WebGL; îl eliberăm de fiecare dată
     când se schimbă imaginea sau se închide fereastra. */
  var viewer = null;
  var note3d = $('#pm-3dnote');

  function disposeViewer() {
    if (viewer) { viewer.dispose(); viewer = null; }
    /* scoatem și canvasul: altfel rămâne în pagină, cu bufferul lui, până
       la următoarea deschidere */
    var scene = $('.pm__3d', stage);
    if (scene) scene.remove();
    if (pmBox) pmBox.classList.remove('is-3d');
    note3d.hidden = true;
    note3d.textContent = '';
  }

  var pmBox = $('.pm');

  function setStage(p, i) {
    disposeViewer();
    if (pmBox) pmBox.classList.remove('is-3d');
    stage.innerHTML = '';
    stage.appendChild(
      photo(photoSrc(p, i), fill('a11y.photoOf', { n: i, name: p.name }), p.name, p.tint, true)
    );
  }

  /* Modelul (aprox. 460 KB) se descarcă abia când cineva apasă tab-ul 3D. */
  function setStage3D(p) {
    disposeViewer();
    /* modelul primește toată lățimea ferestrei, nu doar coloana din stânga */
    if (pmBox) pmBox.classList.add('is-3d');
    stage.innerHTML = '';

    var wrap = el('div', 'pm__3d');
    var canvas = document.createElement('canvas');
    canvas.className = 'pm__canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', fill('model.open', { name: p.name }));
    var status = el('p', 'pm__3dstatus', t('model.loading'));

    wrap.appendChild(canvas);
    wrap.appendChild(status);
    stage.appendChild(wrap);

    note3d.textContent = t('model.note');
    note3d.hidden = false;

    var limit = 72 * Math.PI / 180;
    viewer = window.BagViewer.create(canvas, 'assets/models/' + p.model, {
      minAzimuth: p.modelFullRotation ? null : -limit,
      maxAzimuth: p.modelFullRotation ? null : limit,
      tint: p.modelTint, tintAlt: p.modelTintAlt, tintAlt2: p.modelTintAlt2,
      pattern: p.modelPattern,
      onReady: function () { status.remove(); wrap.classList.add('is-ready'); },
      onError: function () { status.textContent = t('model.error'); status.classList.add('is-error'); }
    });
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

    /* Tab-ul 3D apare doar dacă geanta are model și dacă browserul chiar
       poate reda WebGL. Unde nu poate, rămân fotografiile, fără vreun
       dreptunghi gol care să ceară scuze. */
    var has3D = !!(p.model && window.BagViewer && window.BagViewer.supported());

    function activate(btn) {
      $$('button', thumbs).forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    }

    if (p.photos > 1 || has3D) {
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

      if (has3D) {
        var btn3d = el('button', 'pm__thumb3d');
        btn3d.type = 'button';
        btn3d.setAttribute('aria-label', fill('model.open', { name: p.name }));
        btn3d.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" ' +
          'd="M12 3l7.5 4.3v9L12 20.6 4.5 16.3v-9L12 3zm0 0v8.6m0 0l7.5-4.3m-7.5 4.3L4.5 7.3m7.5 4.3v9"/>' +
          '</svg>';
        btn3d.appendChild(el('span', null, t('model.tab')));
        btn3d.addEventListener('click', function () { setStage3D(p); activate(btn3d); });
        thumbs.appendChild(btn3d);
      }
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
    if (modal === productModal) disposeViewer();
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
  /* ───────────────────────────────────────────
     „Cum le facem”: geanta se rotește pe scroll
     ───────────────────────────────────────────
     O secțiune înaltă, cu un panou lipit în ea. Pe măsură ce cobori,
     Patchwork face o tură completă, iar cei patru pași se schimbă în
     ritmul rotirii. Dacă browserul nu poate WebGL sau dacă s-a cerut
     mai puțină mișcare, nu pornește deloc și rămâne lista obișnuită.
     ─────────────────────────────────────────── */

  var orbit = (function () {
    var host = $('#orbit');
    var stat = $('#steps-static');
    if (!host || !stat) return null;

    var STEPS = 4;
    var MODEL = 'nuante-de-gri.glb';   // dungile ei sunt reale, iar geometria ține turul complet

    var canvas = $('#orbit-canvas');
    var stepsBox = $('#orbit-steps');
    var railFill = $('#orbit-rail-fill');
    var hint = $('#orbit-hint');

    var viewer = null, frame = null, progress = -1, current = -1, started = false;

    function eligible() {
      if (!window.BagViewer || !window.BagViewer.supported()) return false;
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      } catch (e) { /* ignoră */ }
      return true;
    }

    /* Textele vin din același dicționar ca lista simplă, ca să nu existe
       două locuri de actualizat. */
    function renderSteps() {
      stepsBox.innerHTML = '';
      for (var i = 1; i <= STEPS; i++) {
        var li = el('li', 'orbit__step');
        li.appendChild(el('span', 'orbit__num', '0' + i));
        li.appendChild(el('h3', null, t('process.s' + i + 't')));
        li.appendChild(el('p', null, t('process.s' + i + 'p')));
        stepsBox.appendChild(li);
      }
      if (hint) hint.textContent = t('orbit.hint');
      if (canvas) canvas.setAttribute('aria-label', t('orbit.alt'));
      current = -1;
      paint();
    }

    function paint() {
      var p = Math.max(0, progress);
      var idx = Math.min(STEPS - 1, Math.floor(p * STEPS));
      if (idx !== current) {
        current = idx;
        $$('.orbit__step', stepsBox).forEach(function (n, i) {
          n.classList.toggle('is-on', i === idx);
        });
      }
      setVar('--orbit-progress', p.toFixed(4));
      if (viewer && viewer.isReady()) {
        /* o tură completă pe toată înălțimea secțiunii, plus o apropiere
           lentă la mijloc și o ușoară plecare a camerei — mișcarea aia
           mică de dolly e ce face diferența dintre „se rotește ceva" și
           „cineva a filmat obiectul" */
        var ease = Math.sin(p * Math.PI);
        viewer.setOrbit(
          0.5 + p * Math.PI * 2,
          -0.10 + ease * 0.20,
          4.15 - ease * 0.55
        );
      }
    }

    /* Modelul pornește când secțiunea e aproape. Verificăm asta în două
       feluri, ca să nu depindem de un singur mecanism: un
       IntersectionObserver și, ca plasă, distanța calculată la fiecare
       scroll. Dacă observatorul nu se declanșează, tot pornim. */
    function maybeStart(rect) {
      if (started) return;
      var near = rect.top < window.innerHeight + 300 && rect.bottom > -300;
      if (near) start();
    }

    function measure() {
      var rect = host.getBoundingClientRect();
      maybeStart(rect);
      var travel = host.offsetHeight - window.innerHeight;
      var p = travel > 0 ? (-rect.top) / travel : 0;
      p = Math.max(0, Math.min(1, p));
      if (Math.abs(p - progress) < 0.0008) return;
      progress = p;
      if (frame) return;
      frame = window.requestAnimationFrame(function () { frame = null; paint(); });
    }

    function start() {
      if (started) return;
      started = true;
      var bag = null;
      for (var i = 0; i < PRODUCTS.length; i++) {
        if (PRODUCTS[i].model === MODEL) { bag = PRODUCTS[i]; break; }
      }
      viewer = window.BagViewer.create(canvas, 'assets/models/' + MODEL, {
        interactive: false,
        autoRotate: false,
        tint: bag && bag.modelTint, tintAlt: bag && bag.modelTintAlt,
        tintAlt2: bag && bag.modelTintAlt2, pattern: bag && bag.modelPattern,
        onReady: function () { host.classList.add('is-ready'); progress = -1; measure(); },
        onError: stop
      });
    }

    /* dacă modelul nu vine, ne întoarcem la lista simplă, fără scandal */
    function stop() {
      host.hidden = true;
      stat.hidden = false;
      if (viewer) { viewer.dispose(); viewer = null; }
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    }

    function enable() {
      if (!eligible()) return;
      host.hidden = false;
      stat.hidden = true;
      renderSteps();
      window.addEventListener('scroll', measure, { passive: true });
      window.addEventListener('resize', measure);
      measure();

      /* observatorul e calea obișnuită; measure() de mai sus e plasa */
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { io.disconnect(); start(); }
        }, { rootMargin: '300px 0px' });
        io.observe(host);
      }
    }

    return { enable: enable, refresh: renderSteps, active: function () { return !host.hidden; } };
  })();

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

  if (orbit) orbit.enable();

  $$('.section__head, .story, .steps, .facts, .contact').forEach(function (n) {
    n.classList.add('reveal');
  });
  observeReveals();
})();
