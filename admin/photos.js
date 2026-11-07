/* ═══════════════════════════════════════════════════════════════
   Pozele genților — fereastra „Poza nouă"
   ───────────────────────────────────────────────────────────────
   Fiecare poză nouă trece pe aici înainte să intre în listă:
   1. se taie automat barele uniforme de aplicație (sus/jos/laterale);
   2. se încadrează 4:5, centrat; poza se mută cu degetul, cu săgețile
      sau cu butoanele și se poate mări puțin;
   3. se vede rezultatul (dimensiuni și KB, JPEG și WebP);
   4. „Folosește poza" o trimite în lista geanței, „Sari peste" o lasă.
   Calculele stau în photos-logic.mjs (testate separat). Aici e doar
   partea de ecran. Fără stiluri din JavaScript: previzualizarea e
   desenată pe <canvas>, restul e clase CSS.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = NAA.$;
  var LIMIT = 860 * 1024;            // sub limita de 900 KB a serverului
  var PREVIEW_W = 320, PREVIEW_H = 400;
  var MOVE_STEP = 0.05;
  var logic = null;

  function loadLogic() {
    if (!logic) logic = import('/admin/photos-logic.mjs?v=4');
    return logic;
  }

  function kb(n) { return Math.round(n / 1024) + ' KB'; }

  function toBlob(canvas, type, q) {
    return new Promise(function (r) { canvas.toBlob(r, type, q); });
  }

  /* Cât se taie, citit de pe o copie cel mult 3200 px (întreagă, la poze obișnuite). */
  function findBars(L, bmp) {
    var scale = Math.min(1, 3200 / Math.max(bmp.width, bmp.height));
    var w = Math.max(9, Math.round(bmp.width * scale)), h = Math.max(9, Math.round(bmp.height * scale));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    var b = L.detectBars(ctx.getImageData(0, 0, w, h).data, w, h);
    var up = function (v, full, small) { return v ? Math.min(Math.floor(full * 0.25), Math.ceil(v * full / small) + 1) : 0; };
    return {
      top: up(b.top, bmp.height, h), bottom: up(b.bottom, bmp.height, h),
      left: up(b.left, bmp.width, w), right: up(b.right, bmp.width, w),
    };
  }

  /* Arată fereastra pentru o poză. Răspunde cu { blob, webp, w, h, ... } sau null. */
  async function review(L, file, index, total) {
    var bmp;
    try { bmp = await createImageBitmap(file); } catch (e) {
      NAA.say('N-am putut citi poza „' + file.name + '". Încearcă un fișier JPEG sau PNG.', 'err');
      return null;
    }
    var bars = findBars(L, bmp);
    var hasBars = bars.top + bars.bottom + bars.left + bars.right > 0;
    var st = { zoom: 1, px: 0.5, py: 0.5, notrim: false, gen: 0, timer: 0, result: null };

    var root = $('#ph');
    var cv = $('#ph-canvas');
    var ctx = cv.getContext('2d');
    var ok = $('#ph-ok');
    var opener = document.activeElement;

    $('#ph-count').textContent = 'Poza ' + (index + 1) + ' din ' + total + ' · ' + file.name;
    $('#ph-notrim').checked = false;
    $('#ph-zoom').value = '100';
    $('#ph-notrim-wrap').hidden = !hasBars;

    function trim() { return st.notrim ? { top: 0, bottom: 0, left: 0, right: 0 } : bars; }
    function region() {
      var t = trim();
      return { x: t.left, y: t.top, w: bmp.width - t.left - t.right, h: bmp.height - t.top - t.bottom };
    }
    function frame() { var r = region(); return L.frameRect(r.w, r.h, st.zoom, st.px, st.py); }

    function paintTo(canvas, w, h) {
      var r = region(), f = frame();
      canvas.width = w; canvas.height = h;
      var c = canvas.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.imageSmoothingQuality = 'high';
      c.drawImage(bmp, r.x + f.x, r.y + f.y, f.w, f.h, 0, 0, w, h);
    }

    function info() {
      var t = trim(), bits = [];
      if (t.top) bits.push('sus ' + t.top);
      if (t.bottom) bits.push('jos ' + t.bottom);
      if (t.left) bits.push('stânga ' + t.left);
      if (t.right) bits.push('dreapta ' + t.right);
      $('#ph-trim').textContent = !hasBars ? 'Nu am găsit margini de aplicație de tăiat.'
        : st.notrim ? 'Marginile rămân, nu s-a tăiat nimic.'
        : 'Am tăiat marginile de aplicație (în pixeli): ' + bits.join(', ') + '.';
      var r = region();
      var movable = (r.w - frame().w > 0.5) || (r.h - frame().h > 0.5);
      $('#ph-move-note').textContent = movable ? '' : 'Poza se potrivește exact în cadru, nu mai e ce muta.';
    }

    function draw() {
      paintTo(cv, PREVIEW_W, PREVIEW_H);
      info();
      schedule();
    }

    /* mărimea fișierelor se calculează după ce te oprești din mutat */
    function schedule() {
      st.gen++;
      st.result = null;
      ok.disabled = true;
      $('#ph-result').textContent = 'Calculez mărimea…';
      clearTimeout(st.timer);
      var gen = st.gen;
      st.timer = setTimeout(function () { encode(gen); }, 220);
    }

    async function encode(gen) {
      var f = frame();
      var work = document.createElement('canvas');
      var enc = function (type) {
        return function (w, h, q) {
          paintTo(work, w, h);
          return toBlob(work, type, q).then(function (b) { return b && b.type === type ? b : null; });
        };
      };
      var jpg = await L.fitEncode(enc('image/jpeg'), f.w, f.h, { q0: 0.85, qMin: 0.5, limit: LIMIT });
      if (gen !== st.gen) return;
      var web = jpg ? await L.fitEncode(enc('image/webp'), jpg.w, jpg.h, { q0: 0.82, qMin: 0.5, limit: LIMIT, maxSide: jpg.h }) : null;
      if (gen !== st.gen) return;
      if (!jpg) {
        $('#ph-result').textContent = 'Poza e prea mare și n-am putut-o micșora destul. Încearcă alta.';
        return;
      }
      st.result = { jpg: jpg, web: web };
      var txt = 'JPEG: ' + jpg.w + ' × ' + jpg.h + ' px, ' + kb(jpg.blob.size);
      txt += web ? ' · WebP: ' + web.w + ' × ' + web.h + ' px, ' + kb(web.blob.size)
                 : ' · WebP: nu merge în browserul ăsta, se folosește doar JPEG.';
      if (jpg.shrunk) txt += ' (am micșorat-o ca să încapă)';
      $('#ph-result').textContent = txt;
      ok.disabled = false;
    }

    function setPos(px, py) {
      st.px = Math.min(1, Math.max(0, px)); st.py = Math.min(1, Math.max(0, py));
      draw();
    }
    function nudge(dx, dy) {
      /* săgeata mută poza în direcția ei: cadrul se duce invers */
      setPos(st.px - dx * MOVE_STEP, st.py - dy * MOVE_STEP);
    }

    return new Promise(function (resolve) {
      var drag = null;
      var offs = [];
      function on(el, ev, fn) { el.addEventListener(ev, fn); offs.push(function () { el.removeEventListener(ev, fn); }); }

      function finish(val) {
        clearTimeout(st.timer);
        st.gen++;
        offs.forEach(function (f) { f(); });
        root.hidden = true;
        document.body.classList.remove('is-locked');
        if (bmp.close) bmp.close();
        if (opener && opener.focus) opener.focus();
        resolve(val);
      }

      on(cv, 'pointerdown', function (e) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, px: st.px, py: st.py };
        cv.setPointerCapture(e.pointerId);
        cv.classList.add('is-drag');
      });
      on(cv, 'pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var r = region(), f = frame();
        var kx = f.w / cv.clientWidth, ky = f.h / cv.clientHeight;     // pixeli sursă per pixel pe ecran
        var rx = r.w - f.w, ry = r.h - f.h;
        var px = rx > 0.5 ? drag.px - (e.clientX - drag.x) * kx / rx : st.px;
        var py = ry > 0.5 ? drag.py - (e.clientY - drag.y) * ky / ry : st.py;
        setPos(px, py);
      });
      var stop = function (e) {
        if (drag && e.pointerId === drag.id) { drag = null; cv.classList.remove('is-drag'); }
      };
      on(cv, 'pointerup', stop);
      on(cv, 'pointercancel', stop);
      on(cv, 'keydown', function (e) {
        var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (k) { e.preventDefault(); nudge(k[0], k[1]); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(st.zoom + 0.1); }
        else if (e.key === '-') { e.preventDefault(); setZoom(st.zoom - 0.1); }
      });
      [['#ph-left', -1, 0], ['#ph-right', 1, 0], ['#ph-up', 0, -1], ['#ph-down', 0, 1]].forEach(function (b) {
        on($(b[0]), 'click', function () { nudge(b[1], b[2]); });
      });
      on($('#ph-center'), 'click', function () { setPos(0.5, 0.5); });

      function setZoom(z) {
        st.zoom = Math.min(L.MAX_ZOOM, Math.max(1, z));
        $('#ph-zoom').value = String(Math.round(st.zoom * 100));
        draw();
      }
      on($('#ph-zoom'), 'input', function () { setZoom(Number(this.value) / 100); });
      on($('#ph-notrim'), 'change', function () { st.notrim = this.checked; draw(); });

      on(ok, 'click', function () {
        if (!st.result) return;
        var j = st.result.jpg, w = st.result.web;
        finish({
          blob: j.blob, w: j.w, h: j.h, bytes: j.blob.size,
          webp: w ? w.blob : null, webpBytes: w ? w.blob.size : 0,
        });
      });
      on($('#ph-skip'), 'click', function () { finish(null); });
      on(root, 'keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); finish(null); return; }
        if (e.key !== 'Tab') return;
        var f = NAA.$$('button:not(:disabled), input:not([hidden]), canvas[tabindex]', root)
          .filter(function (el) { return !el.closest('[hidden]'); });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });

      root.hidden = false;
      document.body.classList.add('is-locked');
      draw();
      cv.focus();
    });
  }

  /* Adaugă fișierele alese în `shots`, câte una, după ce utilizatorul le confirmă.
     Întoarce câte au intrat. */
  async function addBagPhotos(files, shots, opts) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { NAA.say('Alege o poză (JPEG sau PNG).', 'err'); return 0; }
    var room = opts.max - shots.length;
    if (list.length > room) {
      NAA.say('Sunt permise cel mult ' + opts.max + ' poze. Le văd doar pe primele ' + Math.max(0, room) + '.', 'err');
      list = list.slice(0, Math.max(0, room));
    }
    if (!list.length) return 0;
    var L;
    try { L = await loadLogic(); } catch (e) {
      NAA.say('Nu s-a putut încărca pregătirea pozelor. Reîncarcă panoul.', 'err');
      return 0;
    }
    var added = 0;
    for (var i = 0; i < list.length; i++) {
      var out = await review(L, list[i], i, list.length);
      if (!out) continue;
      shots.push({
        kind: 'new', blob: out.blob, webp: out.webp, url: URL.createObjectURL(out.blob),
        w: out.w, h: out.h, bytes: out.bytes, webpBytes: out.webpBytes, resized: false,
      });
      added++;
    }
    NAA.say(added ? 'Am adăugat ' + added + (added === 1 ? ' poză.' : ' poze.') : '');
    return added;
  }

  NAA.addBagPhotos = addBagPhotos;
})();
