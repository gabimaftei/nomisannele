/* ═══════════════════════════════════════════
   NOMIS ANNELE — vizualizator 3D

   Un cititor minim de .glb plus un randor WebGL, scris special pentru
   modelele astea. Ele conțin doar poziții și indici: fără materiale,
   fără texturi, fără coordonate UV, fără normale. O bibliotecă
   generalistă ar aduce ~700 KB ca să deseneze 40.000 de triunghiuri
   albe; fișierul ăsta are câțiva kilobyți și nu cere nimic din afară.

   window.BagViewer.supported()          -> bool
   window.BagViewer.create(canvas, url, {
       minAzimuth, maxAzimuth,           // radiani, opțional
       onReady, onError
   })                                    -> { dispose() }
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  /* ── suport WebGL ────────────────────────── */

  var supportChecked = false, supportResult = false;
  function supported() {
    if (supportChecked) return supportResult;
    supportChecked = true;
    try {
      var c = document.createElement('canvas');
      supportResult = !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      supportResult = false;
    }
    return supportResult;
  }

  /* ── cititorul de .glb ───────────────────── */

  function parseGLB(buffer) {
    var dv = new DataView(buffer);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('nu este un fișier glTF binar');

    var length = dv.getUint32(8, true), offset = 12, json = null, bin = null;
    while (offset < length) {
      var chunkLen = dv.getUint32(offset, true);
      var chunkType = dv.getUint32(offset + 4, true);
      var start = offset + 8;
      if (chunkType === 0x4e4f534a) {
        /* blocul JSON e completat până la multiplu de 4; specificația cere
           spații, dar unele unelte pun octeți nuli — tăiem ambele variante */
        var text = new TextDecoder().decode(new Uint8Array(buffer, start, chunkLen));
        json = JSON.parse(text.replace(/[\s\u0000]+$/, ''));
      } else if (chunkType === 0x004e4942) {
        bin = { start: start, length: chunkLen };
      }
      offset = start + chunkLen;
    }
    if (!json || !bin) throw new Error('fișier glTF incomplet');

    var prim = json.meshes[0].primitives[0];
    var posAcc = json.accessors[prim.attributes.POSITION];
    var idxAcc = json.accessors[prim.indices];

    function slice(accessor, Type) {
      var bv = json.bufferViews[accessor.bufferView];
      var byteOffset = bin.start + (bv.byteOffset || 0) + (accessor.byteOffset || 0);
      var count = accessor.count * (accessor.type === 'VEC3' ? 3 : 1);
      return new Type(buffer, byteOffset, count);
    }

    /* Pozițiile pot veni pe float32 sau, la modelele trecute prin
       tools/optimise-model.py, pe int16 cu scara mutată în nod
       (extensia KHR_mesh_quantization). Le aducem pe amândouă la float. */
    var positions;
    if (posAcc.componentType === 5122) {
      var quant = slice(posAcc, Int16Array);
      positions = new Float32Array(quant.length);
      for (var q = 0; q < quant.length; q++) positions[q] = quant[q];
    } else {
      positions = new Float32Array(slice(posAcc, Float32Array));
    }

    /* aplicăm scara și translația nodului care ține mesh-ul, dacă are */
    var node = null;
    for (var n = 0; json.nodes && n < json.nodes.length; n++) {
      if (json.nodes[n].mesh === 0) { node = json.nodes[n]; break; }
    }
    if (node && (node.scale || node.translation)) {
      var sc = node.scale || [1, 1, 1];
      var tr = node.translation || [0, 0, 0];
      for (var v = 0; v < positions.length; v += 3) {
        positions[v]     = positions[v]     * sc[0] + tr[0];
        positions[v + 1] = positions[v + 1] * sc[1] + tr[1];
        positions[v + 2] = positions[v + 2] * sc[2] + tr[2];
      }
    }

    var indices;
    if (idxAcc.componentType === 5123) indices = new Uint16Array(slice(idxAcc, Uint16Array));
    else if (idxAcc.componentType === 5125) indices = new Uint32Array(slice(idxAcc, Uint32Array));
    else indices = new Uint16Array(slice(idxAcc, Uint8Array));

    return { positions: positions, indices: indices };
  }

  /* Modelele nu au normale. Le calculăm din triunghiuri, adunându-le
     pe vârfuri, ca suprafața să iasă netedă și nu fațetată. */
  function computeNormals(positions, indices) {
    var normals = new Float32Array(positions.length);
    for (var i = 0; i < indices.length; i += 3) {
      var a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      var ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
      var e1x = positions[b] - ax, e1y = positions[b + 1] - ay, e1z = positions[b + 2] - az;
      var e2x = positions[c] - ax, e2y = positions[c + 1] - ay, e2z = positions[c + 2] - az;
      var nx = e1y * e2z - e1z * e2y;
      var ny = e1z * e2x - e1x * e2z;
      var nz = e1x * e2y - e1y * e2x;
      normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
      normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
      normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
    }
    for (var j = 0; j < normals.length; j += 3) {
      var x = normals[j], y = normals[j + 1], z = normals[j + 2];
      var len = Math.sqrt(x * x + y * y + z * z) || 1;
      normals[j] = x / len; normals[j + 1] = y / len; normals[j + 2] = z / len;
    }
    return normals;
  }

  /* Ocluzie ambientală ieftină, dedusă din forma suprafeței.
     Pentru fiecare vârf comparăm poziția lui cu media vecinilor: dacă
     vecinii stau „deasupra" lui pe direcția normalei, vârful e într-o
     adâncitură și primește mai puțină lumină. Fără raze, fără structuri
     de accelerare — dar exact asta scoate cusăturile și buzunarele în
     relief, care sunt tot ce are de arătat o geantă albă. */
  function computeCavity(positions, normals, indices) {
    var count = positions.length / 3;
    var sum = new Float32Array(positions.length);
    var hits = new Uint32Array(count);
    var adjStart, adjList;

    function link(a, b) {
      sum[a * 3]     += positions[b * 3];
      sum[a * 3 + 1] += positions[b * 3 + 1];
      sum[a * 3 + 2] += positions[b * 3 + 2];
      hits[a]++;
    }
    for (var i = 0; i < indices.length; i += 3) {
      var a = indices[i], b = indices[i + 1], c = indices[i + 2];
      link(a, b); link(a, c); link(b, a); link(b, c); link(c, a); link(c, b);
    }

    var raw = new Float32Array(count);
    for (var v = 0; v < count; v++) {
      if (!hits[v]) { raw[v] = 0; continue; }
      var dx = sum[v * 3] / hits[v] - positions[v * 3];
      var dy = sum[v * 3 + 1] / hits[v] - positions[v * 3 + 1];
      var dz = sum[v * 3 + 2] / hits[v] - positions[v * 3 + 2];
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      raw[v] = len < 1e-8 ? 0 :
        (dx * normals[v * 3] + dy * normals[v * 3 + 1] + dz * normals[v * 3 + 2]) / len;
    }

    /* Reconstrucțiile din fotografii au triunghiuri neregulate, așa că
       valoarea brută iese pătată. O netezim de câteva ori peste vecini:
       rămâne ocluzia largă din scobituri și dispare zgomotul. */
    adjStart = new Uint32Array(count + 1);
    for (var t = 0; t < indices.length; t += 3) {
      adjStart[indices[t]]++; adjStart[indices[t]]++;
      adjStart[indices[t + 1]]++; adjStart[indices[t + 1]]++;
      adjStart[indices[t + 2]]++; adjStart[indices[t + 2]]++;
    }
    var running = 0;
    for (var k = 0; k <= count; k++) {
      var n0 = k < count ? adjStart[k] : 0;
      adjStart[k] = running; running += n0;
    }
    adjList = new Uint32Array(running);
    var cursor = adjStart.slice();
    function push(a, b) { adjList[cursor[a]++] = b; }
    for (var t2 = 0; t2 < indices.length; t2 += 3) {
      var x = indices[t2], y = indices[t2 + 1], z = indices[t2 + 2];
      push(x, y); push(x, z); push(y, x); push(y, z); push(z, x); push(z, y);
    }

    var cur = raw, next = new Float32Array(count);
    for (var pass = 0; pass < 4; pass++) {
      for (var q = 0; q < count; q++) {
        var acc = cur[q], n1 = 1;
        for (var e = adjStart[q]; e < adjStart[q + 1]; e++) { acc += cur[adjList[e]]; n1++; }
        next[q] = acc / n1;
      }
      var swap = cur; cur = next; next = swap;
    }

    /* doar întunecăm scobiturile, blând; muchiile rămân în pace */
    var cavity = new Float32Array(count);
    for (var w = 0; w < count; w++) {
      var occ = Math.max(0, Math.min(1, cur[w] * 3.6));
      cavity[w] = 1 - occ * 0.62;
    }
    return cavity;
  }

  /* Centrăm modelul în origine și îl aducem la o mărime constantă,
     ca toate gențile să apară la fel de mari, oricât ar diferi scara. */
  function normalise(positions) {
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (var i = 0; i < positions.length; i += 3) {
      for (var k = 0; k < 3; k++) {
        var v = positions[i + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    var cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
    var span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    var scale = 2 / span;
    for (var j = 0; j < positions.length; j += 3) {
      positions[j] = (positions[j] - cx) * scale;
      positions[j + 1] = (positions[j + 1] - cy) * scale;
      positions[j + 2] = (positions[j + 2] - cz) * scale;
    }
  }

  /* ── shadere ─────────────────────────────── */

  var VERT = [
    'attribute vec3 aPos;',
    'attribute vec3 aNormal;',
    'attribute float aCavity;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'varying float vCavity;',
    'void main(){',
    '  vNormal = aNormal;',
    '  vWorld = aPos;',
    '  vCavity = aCavity;',
    '  gl_Position = uProj * uView * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  /* Materialul imită gipsul vopsit: difuz aproape mat, cu un luciu larg
     și slab, plus o margine luminoasă care desprinde silueta de fundal.
     Luminile stau fixe în lume, nu pe cameră, ca rotirea să schimbe
     chiar relieful, nu doar unghiul. */
  /* Lumină de studio: o cheie puternică din stânga-sus, o umplere rece
     din dreapta, o margine care desprinde silueta de fundalul închis, și
     o reflexie caldă de jos, ca de la o masă. La final trece printr-o
     curbă filmică, ca luminile să nu se taie brusc în alb. */
  /* Materialul e denim generat în shader și proiectat triplanar: din trei
     direcții, amestecate după normală. Așa nu are nevoie de coordonate UV,
     pe care modelele astea nu le au. Țesătura e twill diagonal, ca la blugi,
     peste care vin fibre fine și o variație lentă de nuanță. */
  var FRAG = [
    'precision highp float;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'varying float vCavity;',
    'uniform vec3 uBase;',
    'uniform vec3 uAlt;',
    'uniform vec3 uAlt2;',
    'uniform float uPattern;',
    'uniform vec3 uCam;',
    '',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x),',
    '             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);',
    '}',
    '',
    /* twill: dungi diagonale, plus firele transversale abia ghicite */
    'float weave(vec2 uv){',
    '  float diag = (uv.x + uv.y) * 0.7071;',
    '  float t = sin(diag * 210.0) * 0.5 + 0.5;',
    '  t = pow(t, 1.6);',
    '  float warp = sin(uv.x * 150.0) * 0.5 + 0.5;',
    '  float weft = sin(uv.y * 150.0) * 0.5 + 0.5;',
    '  float fibre = vnoise(uv * 420.0);',
    '  return t * 0.62 + warp * 0.14 + weft * 0.10 + fibre * 0.14;',
    '}',
    '',
    'vec3 filmic(vec3 x){',
    '  vec3 a = x * (2.51 * x + 0.03);',
    '  vec3 b = x * (2.43 * x + 0.59) + 0.14;',
    '  return clamp(a / b, 0.0, 1.0);',
    '}',
    '',
    'void main(){',
    '  vec3 n = normalize(vNormal);',
    '  vec3 v = normalize(uCam - vWorld);',
    '  float ao = clamp(vCavity, 0.0, 1.0);',
    '',
    /* proiecție triplanară: ponderi din normală */
    '  vec3 an = abs(n);',
    '  an = an / max(an.x + an.y + an.z, 0.0001);',
    '  float w = weave(vWorld.yz) * an.x + weave(vWorld.xz) * an.y + weave(vWorld.xy) * an.z;',
    '',
    /* culoarea: fie denim uniform, fie benzi pe înălțime, fie petice */
    '  vec3 albedo = uBase;',
    '  if (uPattern > 0.5 && uPattern < 1.5) {',
    '    float band = floor(vWorld.y * 5.5 + vnoise(vWorld.xz * 2.0) * 0.35);',
    '    albedo = mix(uBase, uAlt, fract(band * 0.37) );',
    '  } else if (uPattern > 1.5) {',
    '    vec3 cell = floor(vWorld * 1.9 + vnoise(vWorld.xy * 1.4) * 1.1);',
    '    float k = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.5453);',
    '    albedo = mix(uBase, uAlt, step(0.42, k));',
    '    albedo = mix(albedo, uAlt2, step(0.74, k));',
    '  }',
    /* țesătura modulează culoarea, nu doar luminozitatea */
    '  albedo *= 0.74 + w * 0.46;',
    '  albedo *= 0.93 + vnoise(vWorld.xz * 9.0) * 0.14;',
    '',
    '  vec3 key  = normalize(vec3(-0.42, 0.78,  0.62));',
    '  vec3 fill = normalize(vec3( 0.80, 0.10,  0.30));',
    '  vec3 rimL = normalize(vec3( 0.30,-0.10, -0.92));',
    '  vec3 bounce = normalize(vec3(-0.15,-0.95, 0.20));',
    '',
    '  float kd = max(dot(n, key),  0.0);',
    '  float fd = max(dot(n, fill), 0.0);',
    '  float rd = max(dot(n, rimL), 0.0);',
    '  float bd = max(dot(n, bounce), 0.0);',
    '',
    '  float sky = n.y * 0.5 + 0.5;',
    '  vec3 ambient = mix(vec3(0.05,0.07,0.13), vec3(0.30,0.34,0.46), sky);',
    '',
    '  vec3 lit = albedo * ambient * ao;',
    '  lit += albedo * 1.55 * kd * mix(0.22, 1.0, ao);',
    '  lit += albedo * vec3(0.72,0.80,1.00) * 0.30 * fd;',
    '  lit += albedo * vec3(0.98,0.90,0.78) * 0.20 * bd * ao;',
    '',
    /* textilul are luciu slab și larg, nu reflexie de plastic */
    '  vec3 h1 = normalize(key + v);',
    '  float sheen = pow(max(dot(n, h1), 0.0), 20.0) * 0.030 * (0.4 + w * 0.6);',
    '  lit += sheen * ao;',
    '',
    '  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.2);',
    '  lit += fres * (0.015 + 0.13 * rd) * vec3(0.62, 0.76, 1.0);',
    '',
    '  gl_FragColor = vec4(pow(filmic(lit * 0.40), vec3(0.4545)), 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  /* ── matrice ─────────────────────────────── */

  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }

  /* vedere orbitală: rotim lumea invers față de cameră, apoi o împingem
     în depărtare cu `radius` */
  function orbitView(out, azimuth, polar, radius) {
    var ca = Math.cos(azimuth), sa = Math.sin(azimuth);
    var cp = Math.cos(polar), sp = Math.sin(polar);
    out[0] = ca;        out[1] = sa * sp;   out[2] = -sa * cp;  out[3] = 0;
    out[4] = 0;         out[5] = cp;        out[6] = sp;        out[7] = 0;
    out[8] = sa;        out[9] = -ca * sp;  out[10] = ca * cp;  out[11] = 0;
    out[12] = 0;        out[13] = 0;        out[14] = -radius;  out[15] = 1;
    return out;
  }

  /* ── vizualizatorul ──────────────────────── */

  function create(canvas, url, opts) {
    opts = opts || {};
    var glOpts = { antialias: true, alpha: true, premultipliedAlpha: false };
    /* doar pentru unelte de dezvoltare: păstrează pixelii ca să poată fi
       citiți după desenare (are un mic cost, deci e oprit implicit) */
    if (opts.capture) glOpts.preserveDrawingBuffer = true;
    var gl = canvas.getContext('webgl', glOpts)
          || canvas.getContext('experimental-webgl', glOpts);
    if (!gl) { if (opts.onError) opts.onError(new Error('WebGL indisponibil')); return null; }

    var disposed = false, frame = null, program = null;
    var buffers = {};
    var proj = new Float32Array(16), view = new Float32Array(16);

    var azimuth = opts.startAzimuth != null ? opts.startAzimuth : 25 * DEG;
    var polar = 8 * DEG;
    var radius = 3.9;

    var minAz = opts.minAzimuth, maxAz = opts.maxAzimuth;
    var clamped = (minAz != null && maxAz != null);
    var minPolar = -22 * DEG, maxPolar = 32 * DEG;

    var spin = 1;
    var spinVel = 0;          // viteza rămasă după ce ai ridicat degetul
    var target = null;        // ținta către care alunecăm (folosit de scroll)
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* ignoră */ }
    var autoRotate = (opts.autoRotate !== false) && !reduceMotion;
    var interactive = opts.interactive !== false;

    /* --- interacțiune --- */
    var dragging = false, lastX = 0, lastY = 0, pointerId = null;

    function onDown(e) {
      dragging = true; autoRotate = false;
      lastX = e.clientX; lastY = e.clientY; pointerId = e.pointerId;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
      canvas.classList.add('is-grabbing');
    }
    function onMove(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      /* un tur întreg la o glisare cât lățimea zonei: la fel de firesc
         pe telefon ca pe desktop, fără constantă aleasă din burtă */
      var perPx = TAU / Math.max(240, canvas.clientWidth);
      azimuth += dx * perPx;
      polar += dy * perPx * 0.42;
      spinVel = dx * perPx;
      if (clamped) azimuth = Math.min(maxAz, Math.max(minAz, azimuth));
      polar = Math.min(maxPolar, Math.max(minPolar, polar));
      render();
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false; pointerId = null;
      if (Math.abs(spinVel) > 0.0012) glide();
      canvas.classList.remove('is-grabbing');
      if (canvas.releasePointerCapture && e.pointerId != null) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    /* tastatura: săgeți stânga/dreapta rotesc, sus/jos înclină */
    function onKey(e) {
      var step = 6 * DEG, used = true;
      if (e.key === 'ArrowLeft') azimuth -= step;
      else if (e.key === 'ArrowRight') azimuth += step;
      else if (e.key === 'ArrowUp') polar -= step / 2;
      else if (e.key === 'ArrowDown') polar += step / 2;
      else used = false;
      if (!used) return;
      e.preventDefault();
      autoRotate = false;
      if (clamped) azimuth = Math.min(maxAz, Math.max(minAz, azimuth));
      polar = Math.min(maxPolar, Math.max(minPolar, polar));
      render();
    }

    if (interactive) {
      canvas.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      canvas.addEventListener('keydown', onKey);
    }

    /* --- redimensionare --- */
    var lastW = 0, lastH = 0;
    function resize() {
      var dpr = Math.min((window.devicePixelRatio || 1) * 1.3, 2.6);
      var w = Math.round(canvas.clientWidth * dpr);
      var h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return false;
      if (w !== lastW || h !== lastH) {
        canvas.width = w; canvas.height = h;
        lastW = w; lastH = h;
        gl.viewport(0, 0, w, h);
        return true;
      }
      return false;
    }
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (resize()) render(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', function () { if (resize()) render(); });
    }

    /* --- desenare --- */
    var indexCount = 0, indexType = 0;

    function render() {
      if (disposed || !program || !canvas.clientWidth) return;
      resize();
      var aspect = canvas.width / canvas.height;
      perspective(proj, 32 * DEG, aspect, 0.1, 100);
      orbitView(view, azimuth, polar, radius);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(program.uProj, false, proj);
      gl.uniformMatrix4fv(program.uView, false, view);
      /* poziția camerei în lume, dedusă din unghiuri: luciul și marginea
         au nevoie de direcția reală de privire */
      var cp2 = Math.cos(polar), sp2 = Math.sin(polar);
      var ca2 = Math.cos(azimuth), sa2 = Math.sin(azimuth);
      gl.uniform3f(program.uCam, -radius * cp2 * sa2, radius * sp2, radius * cp2 * ca2);
      gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);
    }

    /* O singură buclă scurtă, folosită de două lucruri: inerția de după
       glisare și alunecarea lină către poziția cerută de scroll. Pornește
       doar când are treabă și se oprește singură. */
    var gliding = false;
    function glide() {
      if (gliding || disposed) return;
      gliding = true;
      (function step() {
        if (disposed) { gliding = false; return; }
        var busy = false;

        if (target != null) {
          var diff = target - azimuth;
          if (Math.abs(diff) > 0.0009) {
            azimuth += diff * 0.16;      // urmărire moale, fără salturi
            busy = true;
          } else {
            azimuth = target; target = null;
          }
        }
        if (!dragging && Math.abs(spinVel) > 0.0009) {
          azimuth += spinVel;
          spinVel *= 0.93;               // frecare
          if (clamped) {
            if (azimuth >= maxAz || azimuth <= minAz) spinVel = 0;
          }
          busy = true;
        } else if (!dragging) {
          spinVel = 0;
        }

        if (clamped) azimuth = Math.min(maxAz, Math.max(minAz, azimuth));
        render();
        if (busy) window.requestAnimationFrame(step);
        else gliding = false;
      })();
    }

    function loop() {
      if (disposed) return;
      if (autoRotate && !dragging) {
        azimuth += 0.0022 * spin;
        if (clamped) {
          if (azimuth >= maxAz) { azimuth = maxAz; spin = -1; }
          else if (azimuth <= minAz) { azimuth = minAz; spin = 1; }
        } else if (azimuth > TAU) azimuth -= TAU;
        render();
      }
      frame = window.requestAnimationFrame(loop);
    }

    /* --- încărcare --- */
    fetch(url, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        if (disposed) return;
        var mesh = parseGLB(buf);
        normalise(mesh.positions);
        var normals = computeNormals(mesh.positions, mesh.indices);

        var vs = compile(gl, gl.VERTEX_SHADER, VERT);
        var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        var prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          throw new Error('link: ' + gl.getProgramInfoLog(prog));
        }
        gl.useProgram(prog);

        program = {
          handle: prog,
          uProj: gl.getUniformLocation(prog, 'uProj'),
          uView: gl.getUniformLocation(prog, 'uView'),
          uBase: gl.getUniformLocation(prog, 'uBase'),
          uAlt: gl.getUniformLocation(prog, 'uAlt'),
          uAlt2: gl.getUniformLocation(prog, 'uAlt2'),
          uPattern: gl.getUniformLocation(prog, 'uPattern'),
          uCam: gl.getUniformLocation(prog, 'uCam')
        };
        var tint = opts.tint || [0.16, 0.22, 0.36];
        var alt  = opts.tintAlt || tint;
        var alt2 = opts.tintAlt2 || alt;
        gl.uniform3f(program.uBase, tint[0], tint[1], tint[2]);
        gl.uniform3f(program.uAlt, alt[0], alt[1], alt[2]);
        gl.uniform3f(program.uAlt2, alt2[0], alt2[1], alt2[2]);
        gl.uniform1f(program.uPattern, opts.pattern || 0);

        var aPos = gl.getAttribLocation(prog, 'aPos');
        var aNormal = gl.getAttribLocation(prog, 'aNormal');

        buffers.pos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        buffers.normal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aNormal);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

        var aCavity = gl.getAttribLocation(prog, 'aCavity');
        buffers.cavity = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cavity);
        gl.bufferData(gl.ARRAY_BUFFER, computeCavity(mesh.positions, normals, mesh.indices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aCavity);
        gl.vertexAttribPointer(aCavity, 1, gl.FLOAT, false, 0, 0);

        buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        indexCount = mesh.indices.length;
        indexType = (mesh.indices instanceof Uint32Array) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        resize();
        render();
        if (autoRotate) loop();
        if (opts.onReady) opts.onReady();
      })
      .catch(function (err) {
        if (!disposed && opts.onError) opts.onError(err);
      });

    return {
      /* Poziționează camera din afară (folosit de secțiunea cu scroll).
         Nu pornește nicio buclă: desenăm exact când ni se cere. */
      setOrbit: function (az, pol) {
        if (pol != null) polar = Math.min(maxPolar, Math.max(minPolar, pol));
        /* prima poziționare e instantanee; pe urmă alunecăm către ea,
           ca rotirea la scroll să nu tresară de la un cadru la altul */
        if (azimuth === undefined || target === null && Math.abs(az - azimuth) > Math.PI) {
          azimuth = az; target = null; render();
        } else {
          target = az; glide();
        }
      },
      isReady: function () { return !!program; },

      /* pentru unelte: pune camera într-un unghi, desenează și întoarce
         imaginea. Folosit ca să pot vedea ce randez. */
      snapshot: function (az, pol, type, quality) {
        azimuth = az; target = null; spinVel = 0;
        if (pol != null) polar = pol;
        render();
        return canvas.toDataURL(type || 'image/jpeg', quality || 0.86);
      },

      dispose: function () {
        if (disposed) return;
        disposed = true;
        if (frame) window.cancelAnimationFrame(frame);
        if (ro) ro.disconnect();
        if (interactive) {
          canvas.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          canvas.removeEventListener('keydown', onKey);
        }
        Object.keys(buffers).forEach(function (k) { gl.deleteBuffer(buffers[k]); });
        if (program) gl.deleteProgram(program.handle);
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    };
  }

  window.BagViewer = { supported: supported, create: create };
})();
