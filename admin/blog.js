/* ═══════════════════════════════════════════════════════════════
   Panoul Nomis Annele — tabul „Blog"
   ───────────────────────────────────────────────────────────────
   Articole cu titlu, dată, text și poze. Româna e obligatorie,
   engleza opțională. Prima poză e coperta. Pozele stau la
   assets/blog/<id>/<n>.jpg, iar în date merg ca photos: [{w, h}].
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = NAA.$;
  var MAX_PHOTOS = 30;

  var posts = [];
  var current = null;
  var baseline = '';
  var bound = false;

  function touch() { NAA.touch(); }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function validDate(s) {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s || '')) return false;
    var d = new Date(s + 'T00:00:00Z');
    var y = Number(s.slice(0, 4));
    return !isNaN(d) && d.toISOString().slice(0, 10) === s && y >= 2000 && y <= 2100;
  }

  var MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function shortDate(s) {
    if (!validDate(s)) return 'fără dată';
    var p = s.split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function sorted() {
    return posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  function snapshot() {
    return JSON.stringify(posts.map(function (p) {
      return {
        id: p.id, date: p.date, ro: p.ro, en: p.en,
        shots: p.shots.map(function (s) { return s.kind === 'have' ? s.file : 'nou:' + s.url; }),
      };
    }));
  }

  function freeId(base, exceptFor) {
    var id = base, n = 2;
    var taken = function (v) { return posts.some(function (p) { return p !== exceptFor && p.id === v; }); };
    while (taken(id)) id = base + '-' + (n++);
    return id;
  }

  function path(id, n) { return 'assets/blog/' + id + '/' + n + '.jpg'; }
  function titleOf(p) { return p.ro.title.trim() || '(fără titlu)'; }

  /* ─────────────── lista ─────────────── */
  function drawList() {
    var ol = $('#post-list');
    ol.textContent = '';
    sorted().forEach(function (p) {
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
      name.textContent = titleOf(p);
      var meta = document.createElement('span');
      meta.className = 'pitem__meta';
      meta.textContent = shortDate(p.date) + (p.fresh ? ' · nepublicat' : '');
      text.appendChild(name); text.appendChild(meta);
      b.appendChild(im); b.appendChild(text);
      b.addEventListener('click', function () { select(p); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  }

  /* ─────────────── editorul ─────────────── */
  function select(p) {
    current = p || null;
    $('#post-empty').hidden = !!current;
    $('#post-body').hidden = !current;
    if (!current) { drawList(); return; }
    $('#post-title').textContent = titleOf(current);
    $('#post-date').value = current.date;
    $('#post-ro-title').value = current.ro.title;
    $('#post-en-title').value = current.en.title;
    $('#post-ro-body').value = current.ro.body;
    $('#post-en-body').value = current.en.body;
    drawShots();
    drawList();
  }

  function drawShots() {
    if (!current) return;
    NAA.drawShots($('#post-shots'), current.shots, 'Copertă', function () { drawList(); touch(); });
  }

  async function addFiles(files) {
    var p = current;
    if (!p) return;
    await NAA.addPhotos(files, p.shots, { max: MAX_PHOTOS, maxSide: 2000 });
    if (p === current) drawShots();
    drawList(); touch();
  }

  function bind() {
    if (bound) return;
    bound = true;

    function onText(sel, lang, field) {
      $(sel).addEventListener('input', function () {
        if (!current) return;
        current[lang][field] = this.value;
        if (lang === 'ro' && field === 'title') {
          /* cât articolul e nepublicat, adresa lui urmează titlul;
             după publicare rămâne fixă */
          if (current.fresh) current.id = freeId(NAA.slug(this.value, 'articol'), current);
          $('#post-title').textContent = titleOf(current);
          drawList();
        }
        touch();
      });
    }
    onText('#post-ro-title', 'ro', 'title');
    onText('#post-en-title', 'en', 'title');
    onText('#post-ro-body', 'ro', 'body');
    onText('#post-en-body', 'en', 'body');

    $('#post-date').addEventListener('input', function () {
      if (!current) return;
      current.date = this.value;
      drawList(); touch();
    });

    $('#post-add').addEventListener('click', function () {
      var p = {
        id: freeId('articol'), fresh: true, date: today(),
        ro: { title: '', body: '' }, en: { title: '', body: '' }, shots: [],
      };
      posts.push(p);
      select(p);
      touch();
      $('#post-ro-title').focus();
    });

    $('#post-del').addEventListener('click', function () {
      if (!current) return;
      var msg = current.fresh
        ? 'Renunți la articolul ăsta?'
        : 'Ștergi articolul „' + titleOf(current) + '"?\n\nDispare de pe site la următoarea publicare, cu pozele lui.';
      if (!confirm(msg)) return;
      current.shots.forEach(function (s) { if (s.kind === 'new') URL.revokeObjectURL(s.url); });
      posts.splice(posts.indexOf(current), 1);
      select(sorted()[0] || null);
      touch();
    });

    NAA.wireDrop($('#post-drop'), $('#post-pick'), $('#post-file'), addFiles);
  }

  /* ─────────────── modulul ─────────────── */
  NAA.register({
    id: 'blog',

    load: function (data) {
      posts = (data.posts || []).map(function (p) {
        return {
          id: p.id, fresh: false, date: p.date,
          ro: { title: (p.ro && p.ro.title) || '', body: (p.ro && p.ro.body) || '' },
          en: { title: (p.en && p.en.title) || '', body: (p.en && p.en.body) || '' },
          shots: (p.photos || []).map(function (ph, i) {
            var file = path(p.id, i + 1);
            return { kind: 'have', file: file, url: '/' + file, w: ph.w, h: ph.h };
          }),
        };
      });
      baseline = snapshot();
      bind();
      select(sorted()[0] || null);
    },

    dirty: function () { return snapshot() !== baseline; },

    problems: function () {
      var bad = [];
      posts.forEach(function (p) {
        var n = titleOf(p);
        if (!p.ro.title.trim()) bad.push('Un articol n-are titlu în română.');
        if (!p.shots.length) bad.push('Articolul „' + n + '" n-are nicio poză (prima e coperta).');
        if (!validDate(p.date)) bad.push('Articolul „' + n + '" n-are o dată validă.');
      });
      return bad;
    },

    summary: function () {
      var before = JSON.parse(baseline), byId = {}, out = [];
      before.forEach(function (p) { byId[p.id] = p; });
      posts.forEach(function (p) {
        var old = byId[p.id], name = titleOf(p);
        if (!old) { out.push({ tag: 'add', text: 'Articol nou: ' + name }); return; }
        var shots = p.shots.map(function (s) { return s.kind === 'have' ? s.file : 'nou:' + s.url; });
        var parts = [];
        if (JSON.stringify([p.ro, p.en]) !== JSON.stringify([old.ro, old.en])) parts.push('text');
        if (p.date !== old.date) parts.push('data');
        if (JSON.stringify(shots) !== JSON.stringify(old.shots)) parts.push('poze');
        if (parts.length) out.push({ tag: 'edit', text: 'Articolul ' + name + ': ' + parts.join(', ') });
      });
      var ids = posts.map(function (p) { return p.id; });
      before.forEach(function (p) {
        if (ids.indexOf(p.id) === -1) out.push({ tag: 'del', text: 'Articol șters: ' + (p.ro.title || p.id) });
      });
      return out;
    },

    prepare: function () {
      var uploads = [];
      var out = sorted().map(function (p) {
        p.shots.forEach(function (s, n) {
          var target = path(p.id, n + 1);
          if (s.kind === 'new') uploads.push({ path: target, blob: s.blob });
          else if (s.file !== target) uploads.push({ path: target, from: s.file });
        });
        return {
          id: p.id, date: p.date,
          photos: p.shots.map(function (s) { return { w: s.w, h: s.h }; }),
          ro: { title: p.ro.title.trim(), body: p.ro.body },
          en: { title: p.en.title.trim(), body: p.en.body },
        };
      });
      return { uploads: uploads, payload: { posts: out } };
    },

    published: function () {
      posts.forEach(function (p) {
        p.fresh = false;
        p.shots = p.shots.map(function (s, n) {
          return { kind: 'have', file: path(p.id, n + 1), url: s.url, w: s.w, h: s.h };
        });
      });
      baseline = snapshot();
      select(current);
    },
  });
})();
