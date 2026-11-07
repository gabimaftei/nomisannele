/* ═══════════════════════════════════════════════════════════════
   Panoul Nomis Annele — nucleul
   ───────────────────────────────────────────────────────────────
   Intrarea, taburile, pozele și publicarea. Fiecare tab (genți,
   texte, blog) e un modul în fișierul lui și se înscrie aici cu:

     NAA.register({
       id,            'bags' | 'texts' | 'blog'
       load(data),    primește ce e acum în repo (din /api/data)
       dirty(),       are modificări nepublicate?
       problems(),    ce lipsește, ca listă de propoziții
       summary(),     ce se schimbă, [{ tag, text }]
       prepare(),     { uploads: [{path, blob} | {path, from}], payload }
       published(),   publicarea a reușit
     })

   Datele vin din /api/data (direct din repo, nu de pe site). La
   publicare trimitem și commit-ul de la care am pornit: dacă între
   timp s-a publicat altceva, serverul răspunde 409 în loc să
   suprascrie.

   Parola stă doar în memorie (variabila `pass`), nu în localStorage.
   CSP strict: nicio stilizare din JavaScript, doar clase CSS.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var MAX_BLOB = 900 * 1024;            // limita serverului pentru o poză
  var TARGET_BLOB = 860 * 1024;         // ținta noastră, cu puțin aer sub limită
  var pass = '';
  var head = '';
  var modules = [];

  function say(msg, tone) {
    var el = $('#status');
    el.textContent = msg || '';
    el.className = 'bar__status' + (tone ? ' is-' + tone : '');
  }

  async function api(path, body) {
    var res;
    try {
      res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({ password: pass }, body || {})),
      });
    } catch (e) {
      throw new Error('Nu mă pot conecta la server. Verifică internetul și încearcă din nou.');
    }
    var data;
    try { data = await res.json(); } catch (e) {
      var bad = new Error('Serverul n-a răspuns cum trebuie (' + res.status + '). Încearcă din nou peste un minut.');
      bad.status = res.status;
      throw bad;
    }
    if (!res.ok) {
      var msg = data.error || 'Ceva n-a mers.';
      var err = new Error(NAA.friendlyError ? NAA.friendlyError(msg) : msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* Același fel de identificator ca la server: a-z, 0-9 și cratime. */
  function slug(text, fallback) {
    var s = (text || '').toLowerCase()
      .replace(/ă|â/g, 'a').replace(/î/g, 'i').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length > 46) {
      s = s.slice(0, 46);
      var cut = s.lastIndexOf('-');
      if (cut > 20) s = s.slice(0, cut);
    }
    return s || fallback;
  }

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1]); };
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  /* ─────────────── pozele ───────────────
     Pregătire minimă: o poză JPEG care încape sub limita serverului
     (și nu e uriașă) pleacă neschimbată. Altfel o redesenez mai mică și
     o comprim cât să încapă. Fără tăiere, fără alte prelucrări. */
  async function isJpeg(file) {
    var b = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  }

  function toJpeg(canvas, q) {
    return new Promise(function (r) { canvas.toBlob(r, 'image/jpeg', q); });
  }

  async function prepareJpeg(file, maxSide) {
    var bitmap;
    try { bitmap = await createImageBitmap(file); } catch (e) {
      throw new Error('N-am putut citi poza „' + file.name + '". Încearcă un fișier JPEG.');
    }
    var side = Math.max(bitmap.width, bitmap.height);
    if (side <= maxSide && file.size <= TARGET_BLOB && await isJpeg(file)) {
      var keep = { blob: file, w: bitmap.width, h: bitmap.height, bytes: file.size, resized: false };
      if (bitmap.close) bitmap.close();
      return keep;
    }
    var scale = Math.min(1, maxSide / side);
    var qualities = [0.88, 0.8, 0.72, 0.64, 0.56];
    for (var round = 0; round < 6; round++) {
      var cw = Math.max(1, Math.round(bitmap.width * scale));
      var ch = Math.max(1, Math.round(bitmap.height * scale));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(bitmap, 0, 0, cw, ch);
      for (var i = 0; i < qualities.length; i++) {
        var blob = await toJpeg(c, qualities[i]);
        if (blob && blob.size <= TARGET_BLOB) {
          if (bitmap.close) bitmap.close();
          return { blob: blob, w: cw, h: ch, bytes: blob.size, resized: true };
        }
      }
      scale *= 0.8;
    }
    if (bitmap.close) bitmap.close();
    throw new Error('Poza „' + file.name + '" e prea mare și n-am reușit s-o micșorez sub '
      + Math.round(MAX_BLOB / 1024) + ' KB. Încearcă o variantă mai mică.');
  }

  /* Adaugă fișierele alese în lista `shots`; întoarce câte au intrat. */
  async function addPhotos(files, shots, opts) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { say('Alege o poză (JPEG).', 'err'); return 0; }
    var room = opts.max - shots.length;
    if (list.length > room) {
      say('Sunt permise cel mult ' + opts.max + ' poze. Am adăugat doar ' + Math.max(0, room) + '.', 'err');
      list = list.slice(0, Math.max(0, room));
    }
    var added = 0, shrunk = 0, errors = [];
    for (var i = 0; i < list.length; i++) {
      say('Pregătesc poza ' + (i + 1) + ' din ' + list.length + '…', 'busy');
      try {
        var out = await prepareJpeg(list[i], opts.maxSide);
        shots.push({
          kind: 'new', blob: out.blob, url: URL.createObjectURL(out.blob),
          w: out.w, h: out.h, bytes: out.bytes, resized: out.resized,
        });
        added++;
        if (out.resized) shrunk++;
      } catch (e) { errors.push(e.message); }
    }
    if (errors.length) say(errors[0], 'err');
    else if (shrunk) say(shrunk + (shrunk === 1 ? ' poză a fost micșorată' : ' poze au fost micșorate') + ' ca să încapă.', 'ok');
    else say('');
    return added;
  }

  /* Grila de poze: mutare, scoatere. Modifică `shots` pe loc. */
  function drawShots(ul, shots, coverLabel, onChange) {
    ul.textContent = '';
    shots.forEach(function (s, i) {
      var li = document.createElement('li');
      li.className = 'shot';
      var fr = document.createElement('div');
      fr.className = 'shot__frame';
      var im = document.createElement('img');
      im.src = s.url; im.alt = i === 0 ? coverLabel : 'Poza ' + (i + 1);
      fr.appendChild(im);
      var badge = document.createElement('span');
      badge.className = 'shot__badge' + (s.kind === 'new' ? ' shot__new' : '');
      badge.textContent = i === 0 ? coverLabel : String(i + 1);
      fr.appendChild(badge);
      li.appendChild(fr);

      var tools = document.createElement('div');
      tools.className = 'shot__tools';
      [['←', 'Mută mai în față', i === 0, function () { swap(i, i - 1); }],
       ['→', 'Mută mai în spate', i === shots.length - 1, function () { swap(i, i + 1); }],
       ['✕', 'Scoate poza', false, function () {
         var gone = shots.splice(i, 1)[0];
         if (gone.kind === 'new') URL.revokeObjectURL(gone.url);
         redraw();
       }]].forEach(function (b, k) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = b[0]; btn.title = b[1];
        btn.setAttribute('aria-label', b[1]);
        btn.disabled = b[2];
        if (k === 2) btn.className = 'is-del';
        btn.addEventListener('click', b[3]);
        tools.appendChild(btn);
      });
      li.appendChild(tools);

      var size = document.createElement('p');
      size.className = 'shot__size';
      size.textContent = s.kind === 'new' ? Math.round(s.bytes / 1024) + ' KB' + (s.webpBytes ? ' + ' + Math.round(s.webpBytes / 1024) + ' KB WebP' : '') + ' · nouă' : 'pe site';
      li.appendChild(size);
      ul.appendChild(li);
    });

    function swap(a, b) {
      if (b < 0 || b >= shots.length) return;
      var t = shots[a]; shots[a] = shots[b]; shots[b] = t;
      redraw();
    }
    function redraw() { drawShots(ul, shots, coverLabel, onChange); onChange(); }
  }

  function wireDrop(drop, pickBtn, input, onFiles) {
    pickBtn.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { onFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (e) {
      drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (e) {
      drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (ev) { onFiles(ev.dataTransfer.files); });
  }

  /* ─────────────── starea generală ─────────────── */
  function anyDirty() {
    return modules.some(function (m) { return m.dirty(); });
  }

  function touch() {
    modules.forEach(function (m) {
      var dot = $('#tab-' + m.id + ' .tab__dot');
      if (dot) dot.hidden = !m.dirty();
    });
    $('#save').disabled = !anyDirty();
  }

  function showView(id) {
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-view') === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#view-' + t.getAttribute('data-view')).hidden = !on;
    });
  }

  /* ─────────────── confirmarea ─────────────── */
  function row(ul, tag, cls, text) {
    var li = document.createElement('li');
    var t = document.createElement('span');
    t.className = 'tag tag--' + cls;
    t.textContent = tag;
    var s = document.createElement('span');
    s.textContent = text;
    li.appendChild(t); li.appendChild(s);
    ul.appendChild(li);
  }

  function showErr(text, conflict) {
    $('#cf-err-text').textContent = text;
    $('#cf-help').hidden = !conflict;
    $('#cf-err').hidden = false;
  }

  function openConfirm() {
    var bad = [];
    modules.forEach(function (m) { bad = bad.concat(m.problems()); });
    var ul = $('#changes');
    ul.textContent = '';
    $('#cf-err').hidden = true;

    if (bad.length) {
      $('#cf-title').textContent = 'Mai lipsește ceva';
      bad.slice(0, 10).forEach(function (t) { row(ul, 'de completat', 'del', t); });
      if (bad.length > 10) row(ul, 'și', 'del', 'încă ' + (bad.length - 10) + ' lucruri');
      $('#cf-go').disabled = true;
      $('#cf-msg-wrap').hidden = true;
      $('#cf-note').hidden = true;
    } else {
      $('#cf-title').textContent = 'Gata de publicat';
      modules.forEach(function (m) {
        m.summary().forEach(function (c) {
          row(ul, c.tag === 'add' ? 'nou' : c.tag === 'del' ? 'șters' : 'schimbat', c.tag, c.text);
        });
      });
      $('#cf-go').disabled = false;
      $('#cf-msg-wrap').hidden = false;
      $('#cf-note').hidden = false;
    }
    $('#confirm').hidden = false;
    document.body.classList.add('is-locked');
  }

  function closeConfirm() {
    $('#confirm').hidden = true;
    document.body.classList.remove('is-locked');
  }

  /* ─────────────── publicarea ─────────────── */
  async function publish() {
    $('#cf-go').disabled = true;
    $('#cf-err').hidden = true;
    say('Pregătesc…', 'busy');
    try {
      var uploads = [];
      var payload = {};
      modules.forEach(function (m) {
        var p = m.prepare();
        uploads = uploads.concat(p.uploads || []);
        Object.assign(payload, p.payload || {});
      });

      /* pozele noi pleacă una câte una; cele doar mutate nu mai pleacă deloc */
      var images = {};
      var fresh = uploads.filter(function (u) { return u.blob; }).length;
      var n = 0;
      for (var i = 0; i < uploads.length; i++) {
        var u = uploads[i];
        if (u.from) { images[u.path] = { from: u.from }; continue; }
        n++;
        say('Urc poza ' + n + ' din ' + fresh + '…', 'busy');
        var r = await api('/api/blob', { data: await blobToBase64(u.blob) });
        images[u.path] = r.sha;
      }

      say('Public…', 'busy');
      var res = await api('/api/publish', Object.assign(payload, {
        base: head, images: images, message: $('#cf-msg').value.trim(),
      }));
      head = res.commit;
      modules.forEach(function (m) { m.published(); });
      touch();
      closeConfirm();
      $('#cf-msg').value = '';
      say('Publicat. Apare pe site în câteva minute.', 'ok');
    } catch (err) {
      showErr(err.message, err.status === 409);
      $('#cf-go').disabled = false;
      say('Nu s-a publicat.', 'err');
    }
  }

  /* ─────────────── intrarea ─────────────── */
  $('#gate-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#gate-go');
    var err = $('#gate-err');
    btn.disabled = true;
    err.hidden = true;
    btn.textContent = 'Verific…';
    try {
      pass = $('#gate-pass').value;
      var data = await api('/api/data');
      head = data.head;
      modules.forEach(function (m) { m.load(data); });
      $('#gate').hidden = true;
      $('#app').hidden = false;
      showView('bags');
      touch();
    } catch (ex) {
      pass = '';
      err.textContent = ex.message;
      err.hidden = false;
    }
    btn.disabled = false;
    btn.textContent = 'Intră';
  });

  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = $$('.tab');
      var i = tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
      var next = tabs[(i + tabs.length) % tabs.length];
      showView(next.getAttribute('data-view'));
      next.focus();
    });
  });

  $('#save').addEventListener('click', openConfirm);
  $('#cf-go').addEventListener('click', publish);
  $('#cf-reload').addEventListener('click', function () { location.reload(); });
  $$('[data-close]', $('#confirm')).forEach(function (el) { el.addEventListener('click', closeConfirm); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#confirm').hidden) closeConfirm();
  });
  window.addEventListener('beforeunload', function (e) {
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  window.NAA = {
    $: $, $$: $$,
    register: function (m) { modules.push(m); },
    touch: touch, say: say, slug: slug,
    addPhotos: addPhotos, drawShots: drawShots, wireDrop: wireDrop,
  };
})();
