/* ═══════════════════════════════════════════════════════════════
   Panoul Nomis Annele — tabul „Genți"
   ───────────────────────────────────────────────────────────────
   Gențile, pozele lor, ordinea. Fără prețuri (se discută pe
   Instagram). `tint` și `badge` se văd simplu, ca la server:
   culoarea de rezervă (listă) și eticheta opțională (text scurt).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = NAA.$;
  var MAX_PHOTOS = 12;
  var KINDS = { umar: 'Geantă de umăr', rucsac: 'Rucsac', borseta: 'Borsetă', tote: 'Tote' };

  var items = [];
  var current = null;
  var baseline = '';
  var bound = false;

  function img(file) { return '/' + file; }
  function photoPath(id, n) { return 'assets/images/' + id + '-' + n + '.jpg'; }

  /* Ce se compară ca să știm dacă s-a schimbat ceva. Pozele noi se
     recunosc după adresa lor temporară. */
  function view(p) {
    return {
      id: p.id, name: p.name, kind: p.kind, sold: p.sold, tint: p.tint, badge: p.badge,
      h: p.h, w: p.w, d: p.d, madeFrom: p.madeFrom, ro: p.ro, en: p.en,
      shots: p.shots.map(function (s) { return s.kind === 'have' ? s.file : 'nou:' + s.url; }),
    };
  }
  function snapshot() { return JSON.stringify(items.map(view)); }

  function freeId(base, exceptFor) {
    var id = base, n = 2;
    var taken = function (v) { return items.some(function (p) { return p !== exceptFor && p.id === v; }); };
    while (taken(id)) id = base + '-' + (n++);
    return id;
  }

  function touch() { NAA.touch(); }

  /* număr în centimetri: acceptă și virgula (28,5) */
  function cm(v) {
    var n = Number(String(v).trim().replace(',', '.'));
    return /^\s*[0-9]+([.,][0-9]+)?\s*$/.test(String(v)) && isFinite(n) && n > 0 && n <= 500 ? n : null;
  }
  function pairs(v) {
    var s = String(v).trim();
    if (!s) return { ok: true, value: null };
    var n = Number(s);
    return /^[0-9]+$/.test(s) && n >= 1 && n <= 100 ? { ok: true, value: n } : { ok: false };
  }

  function nameOf(p) { return p.name.trim() || '(fără nume)'; }

  /* ─────────────── lista ─────────────── */
  function lacks(p) {
    return !p.name.trim() || !p.ro.tagline.trim() || !p.ro.description.trim() || !p.shots.length
      || !cm(p.h) || !cm(p.w) || !cm(p.d) || !pairs(p.madeFrom).ok;
  }

  function drawList() {
    var ol = $('#plist');
    ol.textContent = '';
    $('#count').textContent = items.length ? '(' + items.length + ')' : '';
    items.forEach(function (p, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pitem' + (p === current ? ' is-on' : '');
      var im = document.createElement('img');
      im.className = 'pitem__thumb pitem__thumb--cover';
      im.alt = '';
      if (p.shots[0]) im.src = p.shots[0].url;
      var text = document.createElement('span');
      text.className = 'pitem__text';
      var name = document.createElement('span');
      name.className = 'pitem__name';
      name.textContent = nameOf(p);
      var meta = document.createElement('span');
      meta.className = 'pitem__meta';
      var bits = [KINDS[p.kind]];
      if (p.sold) bits.push('vândută');
      if (p.fresh) bits.push('nepublicată');
      meta.textContent = bits.join(' · ');
      text.appendChild(name); text.appendChild(meta);
      if (lacks(p)) {
        var flag = document.createElement('span');
        flag.className = 'pitem__flag';
        flag.textContent = 'mai lipsește ceva';
        text.appendChild(flag);
      }
      b.appendChild(im); b.appendChild(text);
      b.addEventListener('click', function () { select(p); });
      li.appendChild(b);

      var mv = document.createElement('div');
      mv.className = 'pmove';
      [['▲', 'Mută mai sus', i === 0, -1], ['▼', 'Mută mai jos', i === items.length - 1, 1]].forEach(function (x) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = x[0]; btn.title = x[1];
        btn.setAttribute('aria-label', x[1] + ': ' + nameOf(p));
        btn.disabled = x[2];
        btn.addEventListener('click', function () { move(p, x[3]); });
        mv.appendChild(btn);
      });
      li.appendChild(mv);
      ol.appendChild(li);
    });
  }

  function move(p, d) {
    var i = items.indexOf(p), j = i + d;
    if (j < 0 || j >= items.length) return;
    items.splice(i, 1);
    items.splice(j, 0, p);
    drawList(); touch();
  }

  /* ─────────────── editorul ─────────────── */
  function fill(sel, v) { $(sel).value = v; }

  function select(p) {
    current = p || null;
    $('#editor-empty').hidden = !!current;
    $('#editor-body').hidden = !current;
    if (!current) { drawList(); return; }
    $('#ed-title').textContent = nameOf(current);
    fill('#f-name', current.name);
    ['tagline', 'description', 'pockets', 'closure'].forEach(function (k) {
      fill('#ro-' + k, current.ro[k]);
      fill('#en-' + k, current.en[k]);
    });
    fill('#f-kind', current.kind);
    fill('#f-tint', current.tint);
    fill('#f-badge', current.badge);
    fill('#f-madeFrom', current.madeFrom);
    fill('#f-h', current.h); fill('#f-w', current.w); fill('#f-d', current.d);
    $('#f-sold').checked = current.sold;
    drawShots();
    drawList();
  }

  function drawShots() {
    if (!current) return;
    NAA.drawShots($('#shots'), current.shots, 'Pe card', function () { drawList(); touch(); });
  }

  async function addFiles(files) {
    var p = current;
    if (!p) return;
    await NAA.addBagPhotos(files, p.shots, { max: MAX_PHOTOS });
    if (p === current) drawShots();
    drawList(); touch();
  }

  function bind() {
    if (bound) return;
    bound = true;

    $('#f-name').addEventListener('input', function () {
      if (!current) return;
      current.name = this.value;
      /* cât geanta e nepublicată, adresa pozelor urmează numele;
         după publicare rămâne fixă */
      if (current.fresh) current.id = freeId(NAA.slug(this.value, 'geanta'), current);
      $('#ed-title').textContent = nameOf(current);
      drawList(); touch();
    });

    ['tagline', 'description', 'pockets', 'closure'].forEach(function (k) {
      ['ro', 'en'].forEach(function (lang) {
        $('#' + lang + '-' + k).addEventListener('input', function () {
          if (!current) return;
          current[lang][k] = this.value;
          if (lang === 'ro') drawList();
          touch();
        });
      });
    });

    [['#f-kind', 'kind'], ['#f-tint', 'tint']].forEach(function (x) {
      $(x[0]).addEventListener('change', function () {
        if (!current) return;
        current[x[1]] = this.value;
        drawList(); touch();
      });
    });
    [['#f-badge', 'badge'], ['#f-madeFrom', 'madeFrom'], ['#f-h', 'h'], ['#f-w', 'w'], ['#f-d', 'd']].forEach(function (x) {
      $(x[0]).addEventListener('input', function () {
        if (!current) return;
        current[x[1]] = this.value;
        drawList(); touch();
      });
    });
    $('#f-sold').addEventListener('change', function () {
      if (!current) return;
      current.sold = this.checked;
      drawList(); touch();
    });

    $('#add').addEventListener('click', function () {
      var p = {
        id: freeId('geanta'), fresh: true, name: '', kind: 'umar', sold: false,
        tint: 'denim', badge: '', h: '', w: '', d: '', madeFrom: '',
        ro: { tagline: '', description: '', pockets: '', closure: '' },
        en: { tagline: '', description: '', pockets: '', closure: '' },
        shots: [],
      };
      items.push(p);
      select(p);
      touch();
      $('#f-name').focus();
    });

    $('#del').addEventListener('click', function () {
      if (!current) return;
      var msg = current.fresh
        ? 'Renunți la geanta asta?'
        : 'Ștergi geanta „' + nameOf(current) + '"?\n\nDispare de pe site la următoarea publicare, împreună cu pozele ei.';
      if (!confirm(msg)) return;
      current.shots.forEach(function (s) { if (s.kind === 'new') URL.revokeObjectURL(s.url); });
      var i = items.indexOf(current);
      items.splice(i, 1);
      select(items[Math.min(i, items.length - 1)] || null);
      touch();
    });

    NAA.wireDrop($('#drop'), $('#pick'), $('#file'), addFiles);
  }

  /* ─────────────── modulul ─────────────── */
  NAA.register({
    id: 'bags',

    load: function (data) {
      items = data.products.map(function (p) {
        var ro = p.ro || {}, en = p.en || {};
        var d = p.dims || {};
        var shots = [];
        for (var n = 1; n <= p.photos; n++) {
          var file = photoPath(p.id, n);
          shots.push({ kind: 'have', file: file, url: img(file) });
        }
        return {
          id: p.id, fresh: false, name: p.name || '', kind: p.kind, sold: !!p.sold,
          tint: p.tint, badge: p.badge || '',
          h: d.h == null ? '' : String(d.h), w: d.w == null ? '' : String(d.w), d: d.d == null ? '' : String(d.d),
          madeFrom: p.madeFrom == null ? '' : String(p.madeFrom),
          ro: { tagline: ro.tagline || '', description: ro.description || '', pockets: ro.pockets || '', closure: ro.closure || '' },
          en: { tagline: en.tagline || '', description: en.description || '', pockets: en.pockets || '', closure: en.closure || '' },
          shots: shots,
        };
      });
      baseline = snapshot();
      bind();
      select(items[0] || null);
    },

    dirty: function () { return snapshot() !== baseline; },

    problems: function () {
      var bad = [];
      if (!items.length) bad.push('Lista de genți e goală: trebuie să rămână cel puțin una.');
      items.forEach(function (p) {
        var n = '„' + nameOf(p) + '"';
        if (!p.name.trim()) bad.push('O geantă nu are nume.');
        if (!p.ro.tagline.trim()) bad.push('Geanta ' + n + ': lipsește subtitlul în română.');
        if (!p.ro.description.trim()) bad.push('Geanta ' + n + ': lipsește descrierea în română.');
        if (!p.shots.length) bad.push('Geanta ' + n + ' n-are nicio poză.');
        if (!cm(p.h) || !cm(p.w) || !cm(p.d)) bad.push('Geanta ' + n + ': completează înălțimea, lățimea și adâncimea (numere, în cm).');
        if (!pairs(p.madeFrom).ok) bad.push('Geanta ' + n + ': perechile de blugi trebuie să fie un număr între 1 și 100, sau gol.');
      });
      return bad;
    },

    summary: function () {
      var before = JSON.parse(baseline), byId = {}, out = [];
      before.forEach(function (p) { byId[p.id] = p; });
      var labels = { name: 'nume', kind: 'tip', sold: 'stare', tint: 'culoare', badge: 'etichetă', madeFrom: 'blugi',
                     h: 'mărime', w: 'mărime', d: 'mărime', ro: 'texte', en: 'texte', shots: 'poze' };
      items.forEach(function (p) {
        var cur = view(p), old = byId[p.id];
        if (!old) { out.push({ tag: 'add', text: 'Geantă nouă: ' + nameOf(p) }); return; }
        var parts = [];
        Object.keys(labels).forEach(function (k) {
          if (JSON.stringify(cur[k]) !== JSON.stringify(old[k]) && parts.indexOf(labels[k]) === -1) parts.push(labels[k]);
        });
        if (parts.length) out.push({ tag: 'edit', text: 'Geanta ' + nameOf(p) + ': ' + parts.join(', ') });
      });
      var ids = items.map(function (p) { return p.id; });
      before.forEach(function (p) {
        if (ids.indexOf(p.id) === -1) out.push({ tag: 'del', text: 'Geantă ștearsă: ' + (p.name || p.id) });
      });
      var common = ids.filter(function (id) { return byId[id]; });
      var wasOrder = before.map(function (p) { return p.id; }).filter(function (id) { return ids.indexOf(id) !== -1; });
      if (JSON.stringify(common) !== JSON.stringify(wasOrder)) out.push({ tag: 'edit', text: 'Ordinea genților pe site' });
      return out;
    },

    prepare: function () {
      var uploads = [];
      var out = items.map(function (p) {
        p.shots.forEach(function (s, n) {
          var target = photoPath(p.id, n + 1);
          if (s.kind === 'new') {
            uploads.push({ path: target, blob: s.blob });
            if (s.webp) uploads.push({ path: target.replace(/\.jpg$/, '.webp'), blob: s.webp });
          }
          else if (s.file !== target) uploads.push({ path: target, from: s.file });
        });
        var pr = pairs(p.madeFrom);
        var loc = function (o) {
          return { tagline: o.tagline.trim(), description: o.description.trim(), pockets: o.pockets.trim(), closure: o.closure.trim() };
        };
        return {
          id: p.id, name: p.name.trim(), photos: p.shots.length, kind: p.kind, sold: p.sold,
          dims: { h: cm(p.h), w: cm(p.w), d: cm(p.d) },
          madeFrom: pr.value, tint: p.tint, badge: p.badge.trim() || null,
          ro: loc(p.ro), en: loc(p.en),
        };
      });
      return { uploads: uploads, payload: { products: out } };
    },

    published: function () {
      items.forEach(function (p) {
        p.fresh = false;
        p.name = p.name.trim();
        p.shots = p.shots.map(function (s, n) {
          return { kind: 'have', file: photoPath(p.id, n + 1), url: s.url };
        });
      });
      baseline = snapshot();
      select(current);
    },
  });
})();
