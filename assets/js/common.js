/* ═══════════════════════════════════════════
   NOMIS ANNELE — partea comună a paginilor
   Meniul de pe telefon, bara lipită sus, anul din subsol.
   Fără dependențe: se încarcă pe toate paginile.
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var burger = document.querySelector('.nav__burger');
  var navLinks = document.querySelector('.nav__links');
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!nav || !burger || !navLinks) return;

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    navLinks.classList.toggle('is-open', open);
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  Array.prototype.forEach.call(navLinks.querySelectorAll('a'), function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  var ticking = false;
  function stuck() { nav.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { stuck(); ticking = false; });
  }, { passive: true });
  stuck();
})();
