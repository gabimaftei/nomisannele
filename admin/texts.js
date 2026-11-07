/* ═══════════════════════════════════════════════════════════════
   Panoul Nomis Annele — tabul „Texte"
   ───────────────────────────────────────────────────────────────
   Toate textele site-ului, pe secțiuni, română în stânga și engleză
   în dreapta. Lista de chei vine din /api/data (content.js): GROUPS
   spune doar CUM se arată. O cheie care există în date dar lipsește
   de aici apare singură în „Altele", deci nu se pierde nimic, iar
   panoul nu poate inventa chei noi.

   Câmp: [cheie, etichetă, ajutor?, 'lung'?]
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = NAA.$;

  var NOTE_HELP = 'Singurul lucru special permis aici e un link către o parte a site-ului, scris exact așa: '
    + '<a href="#contact">Scrie-ne</a>. Poți schimba textul dintre > și <. '
    + 'Părțile la care poate duce: #contact (scrie-ne), #collection (genți), #story (cine suntem), #process (cum le facem). '
    + 'Orice altă etichetă cu < > nu e permisă. Textul care nu e link se scrie normal.';

  var GROUPS = [
    { id: 'nav', title: 'Meniu', hint: 'Linkurile din bara de sus.', fields: [
      ['nav.collection', 'Link către genți'],
      ['nav.story', 'Link către „Cine suntem"'],
      ['nav.process', 'Link către „Cum le facem"'],
      ['nav.contact', 'Link către contact'],
    ] },
    { id: 'hero', title: 'Prezentarea de sus', hint: 'Primul lucru pe care îl vede cineva când intră pe site.', fields: [
      ['hero.eyebrow', 'Rândul mic de deasupra titlului'],
      ['hero.title1', 'Titlul, prima parte'],
      ['hero.title2', 'Titlul, a doua parte', 'Apare pe al doilea rând, cu litere înclinate.'],
      ['hero.lede', 'Textul de sub titlu', '', 'lung'],
      ['hero.ctaPrimary', 'Butonul principal'],
      ['hero.ctaSecondary', 'Al doilea buton'],
    ] },
    { id: 'collection', title: 'Colecția', hint: 'Textele din jurul genților. Gențile în sine se schimbă din tabul „Genți".', fields: [
      ['collection.eyebrow', 'Rândul mic de deasupra titlului'],
      ['collection.title', 'Titlul'],
      ['collection.lede', 'Textul de sub titlu', '', 'lung'],
      ['collection.note', 'Nota de sub genți', NOTE_HELP, 'lung'],
    ] },
    { id: 'story', title: 'Cine suntem', hint: 'Povestea voastră.', fields: [
      ['story.eyebrow', 'Rândul mic de deasupra titlului'],
      ['story.badge', 'Eticheta mică de pe poză'],
      ['story.title', 'Titlul'],
      ['story.p1', 'Primul paragraf', '', 'lung'],
      ['story.p2', 'Al doilea paragraf', '', 'lung'],
      ['story.p3', 'Al treilea paragraf', '', 'lung'],
      ['story.quote', 'Citatul', '', 'lung'],
    ] },
    { id: 'process', title: 'Cum le facem', hint: 'Cei patru pași și cifrele de sub ei.', fields: [
      ['process.eyebrow', 'Rândul mic de deasupra titlului'],
      ['process.title', 'Titlul'],
      ['process.s1t', 'Pasul 1: titlu'], ['process.s1p', 'Pasul 1: descriere', '', 'lung'],
      ['process.s2t', 'Pasul 2: titlu'], ['process.s2p', 'Pasul 2: descriere', '', 'lung'],
      ['process.s3t', 'Pasul 3: titlu'], ['process.s3p', 'Pasul 3: descriere', '', 'lung'],
      ['process.s4t', 'Pasul 4: titlu'], ['process.s4p', 'Pasul 4: descriere', '', 'lung'],
      ['process.f1', 'Prima cifră: ce înseamnă', 'Textul de sub prima cifră.'],
      ['process.f2', 'A doua cifră: ce înseamnă', 'Textul de sub a doua cifră.'],
      ['process.f3', 'A treia cifră: ce înseamnă', 'Textul de sub a treia cifră.'],
    ] },
    { id: 'contact', title: 'Contact', hint: 'Secțiunea de la sfârșit, cu butonul spre Instagram.', fields: [
      ['contact.eyebrow', 'Rândul mic de deasupra titlului'],
      ['contact.title', 'Titlul'],
      ['contact.lede', 'Textul de sub titlu', '', 'lung'],
      ['contact.dm', 'Butonul spre Instagram'],
      ['contact.profile', 'Linkul spre profil'],
      ['contact.small', 'Rândul mic de sub buton'],
    ] },
    { id: 'footer', title: 'Subsol', hint: 'Partea de jos a paginii.', fields: [
      ['footer.tag', 'Rândul din subsol'],
    ] },
    { id: 'seo', title: 'Google și linkuri', hint: 'Ce se vede în Google și când trimiți linkul site-ului pe WhatsApp sau Instagram.', fields: [
      ['seo.title', 'Titlul', 'Cel mai bine sub 60 de caractere. Apare în fila browserului și în Google.'],
      ['seo.description', 'Descrierea', 'Cel mai bine sub 160 de caractere. Apare sub titlu, în Google.', 'lung'],
    ] },
  ];

  var data = { ro: {}, en: {} };
  var baseline = '';
  var keys = [];
  var groups = [];
  var currentId = 'nav';

  function snapshot() { return JSON.stringify(data); }

  /* Ca la server (textHasForbiddenHtml în server/api.js): un singur link <a>,
     doar la collection.note; orice alt < sau > ar apărea ca text pe site. */
  var NOTE_LINK = /<a href="[#/](?!\/)[a-z0-9\/#-]{0,120}">[^<>]{1,120}<\/a>/;
  function strayTags(key, v) {
    var rest = key === 'collection.note' ? v.replace(NOTE_LINK, '') : v;
    return /[<>]/.test(rest);
  }

  /* Numele prietenos al unui câmp, pentru mesaje (cheia brută n-o înțelege nimeni). */
  function friendlyName(k) {
    for (var i = 0; i < GROUPS.length; i++) {
      for (var j = 0; j < GROUPS[i].fields.length; j++) {
        if (GROUPS[i].fields[j][0] === k) return GROUPS[i].fields[j][1] + ' (' + GROUPS[i].title + ')';
      }
    }
    return k;
  }
  NAA.friendlyError = function (msg) {
    return String(msg).replace(/„([a-z]+\.[A-Za-z0-9]+)"/g, function (m, k) { return '„' + friendlyName(k) + '"'; });
  };

  function buildGroups() {
    var known = {};
    groups = GROUPS.map(function (g) {
      var fields = g.fields.filter(function (f) { return keys.indexOf(f[0]) !== -1; });
      fields.forEach(function (f) { known[f[0]] = true; });
      return { id: g.id, title: g.title, hint: g.hint, fields: fields };
    }).filter(function (g) { return g.fields.length; });
    var rest = keys.filter(function (k) { return !known[k]; });
    if (rest.length) {
      groups.push({
        id: 'other', title: 'Altele', hint: 'Alte texte din site.',
        fields: rest.map(function (k) { return [k, k, '', 'lung']; }),
      });
    }
  }

  function changedIn(g, base) {
    var n = 0;
    g.fields.forEach(function (f) {
      ['ro', 'en'].forEach(function (l) { if (data[l][f[0]] !== base[l][f[0]]) n++; });
    });
    return n;
  }

  function drawList() {
    var ol = $('#tlist');
    ol.textContent = '';
    var base = JSON.parse(baseline);
    groups.forEach(function (g) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pitem pitem--text' + (g.id === currentId ? ' is-on' : '');
      var name = document.createElement('span');
      name.className = 'pitem__name';
      name.textContent = g.title;
      b.appendChild(name);
      if (changedIn(g, base)) {
        var dot = document.createElement('span');
        dot.className = 'pitem__changed';
        dot.textContent = 'schimbat';
        b.appendChild(dot);
      }
      b.addEventListener('click', function () { currentId = g.id; draw(); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  }

  function box(f, lang, idx) {
    var long = f[3] === 'lung';
    var label = document.createElement('label');
    label.className = 'field';
    var cap = document.createElement('span');
    cap.className = 'field__label';
    cap.textContent = lang === 'ro' ? 'Română' : 'English';
    var inp = document.createElement(long ? 'textarea' : 'input');
    if (long) inp.rows = f[0] === 'collection.note' ? 4 : 4; else inp.type = 'text';
    inp.maxLength = 2000;
    inp.value = data[lang][f[0]] || '';
    inp.id = 't-' + idx + '-' + lang;
    inp.setAttribute('aria-label', f[1] + ' (' + (lang === 'ro' ? 'în română' : 'în engleză') + ')');
    var warn = document.createElement('span');
    warn.className = 'field__warn';
    warn.hidden = true;
    function check() {
      var bad = strayTags(f[0], inp.value);
      warn.hidden = !bad;
      warn.textContent = bad
        ? (f[0] === 'collection.note'
          ? 'Aici e permis un singur link, scris exact ca în explicația de mai sus; orice alt < sau > nu e permis. Ar apărea pe site așa cum e scris.'
          : 'Semnele < și > nu sunt permise aici. Ar apărea pe site așa cum sunt scrise.')
        : '';
    }
    inp.addEventListener('input', function () {
      data[lang][f[0]] = inp.value;
      check();
      drawList(); NAA.touch();
    });
    check();
    label.appendChild(cap); label.appendChild(inp); label.appendChild(warn);
    return label;
  }

  function draw() {
    var g = groups.filter(function (x) { return x.id === currentId; })[0] || groups[0];
    currentId = g.id;
    $('#t-title').textContent = g.title;
    $('#t-hint').textContent = g.hint;
    var host = $('#t-fields');
    host.textContent = '';
    var head = document.createElement('div');
    head.className = 'pair pair__head';
    ['Română', 'English'].forEach(function (t) {
      var s = document.createElement('span'); s.textContent = t; head.appendChild(s);
    });
    host.appendChild(head);
    g.fields.forEach(function (f, idx) {
      var wrap = document.createElement('div');
      wrap.className = 'tfield';
      var t = document.createElement('p');
      t.className = 'tfield__title';
      t.textContent = f[1];
      wrap.appendChild(t);
      if (f[2]) {
        var h = document.createElement('p');
        h.className = 'tfield__help' + (f[0] === 'collection.note' ? ' tfield__help--box' : '');
        h.textContent = f[2];
        wrap.appendChild(h);
      }
      var pair = document.createElement('div');
      pair.className = 'pair';
      pair.appendChild(box(f, 'ro', idx));
      pair.appendChild(box(f, 'en', idx));
      wrap.appendChild(pair);
      host.appendChild(wrap);
    });
    drawList();
  }

  NAA.register({
    id: 'texts',

    load: function (d) {
      var c = d.content || {};
      data = { ro: Object.assign({}, c.ro), en: Object.assign({}, c.en) };
      keys = Object.keys(data.ro);
      Object.keys(data.en).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
      keys.forEach(function (k) {
        if (typeof data.ro[k] !== 'string') data.ro[k] = '';
        if (typeof data.en[k] !== 'string') data.en[k] = '';
      });
      baseline = snapshot();
      buildGroups();
      currentId = groups[0].id;
      draw();
    },

    dirty: function () { return snapshot() !== baseline; },

    problems: function () {
      var bad = [];
      var title = {};
      groups.forEach(function (g) { g.fields.forEach(function (f) { title[f[0]] = f[1] + ' (' + g.title + ')'; }); });
      keys.forEach(function (k) {
        var n = title[k] || k;
        if (!data.ro[k].trim()) bad.push('Textul „' + n + '" e gol în română.');
        ['ro', 'en'].forEach(function (l) {
          if (strayTags(k, data[l][k])) bad.push('Textul „' + n + '" (' + (l === 'ro' ? 'română' : 'engleză') + ') conține semnele < sau > într-un loc nepermis' + (k === 'collection.note' ? ' (e permis un singur link)' : '') + '.');
        });
      });
      return bad;
    },

    summary: function () {
      var base = JSON.parse(baseline), out = [];
      groups.forEach(function (g) {
        var n = changedIn(g, base);
        if (n) out.push({ tag: 'edit', text: 'Texte: ' + g.title + ' (' + n + (n === 1 ? ' schimbare' : ' schimbări') + ')' });
      });
      return out;
    },

    prepare: function () {
      return { uploads: [], payload: { content: { ro: data.ro, en: data.en } } };
    },

    published: function () {
      baseline = snapshot();
      draw();
    },
  });
})();
