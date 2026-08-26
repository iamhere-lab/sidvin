/* ==================================================================
   SIDVIN CELESTE — SITE INTERACTIONS
   Header, mobile nav, plan tabs, gallery lightbox, scroll reveal,
   back-to-top, WhatsApp links.
   ================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------------- year ---------------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* ---------------- WhatsApp links ---------------- */
    if (CFG.WHATSAPP_NUMBER) {
      var wa = 'https://wa.me/' + CFG.WHATSAPP_NUMBER +
               '?text=' + encodeURIComponent("Hi, I'm interested in Sidvin Celeste. Please share the details.");
      ['waLink', 'waLinkMobile'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.href = wa;
      });
    }

    /* ---------------- header ---------------- */
    var header = document.getElementById('siteHeader');
    var nav = document.getElementById('primaryNav');
    var toggle = document.getElementById('navToggle');

    function onScroll() {
      if (header) header.classList.toggle('is-stuck', window.scrollY > 40);
      var top = document.getElementById('toTop');
      if (top) top.classList.toggle('is-visible', window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (header) header.classList.toggle('is-nav-open', open);
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          if (header) header.classList.remove('is-nav-open');
        }
      });
    }

    var toTop = document.getElementById('toTop');
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ---------------- active nav link ---------------- */
    var sections = Array.prototype.slice.call(
      document.querySelectorAll('section[id]')
    );
    var navLinks = {};
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
        navLinks[a.getAttribute('href').slice(1)] = a;
      });
    }

    if (sections.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var link = navLinks[en.target.id];
          if (!link) return;
          if (en.isIntersecting) {
            Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('is-active'); });
            link.classList.add('is-active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }

    /* ---------------- scroll reveal ---------------- */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en, i) {
          if (!en.isIntersecting) return;
          setTimeout(function () { en.target.classList.add('is-in'); }, i * 70);
          obs.unobserve(en.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
    }

    /* ---------------- plan tabs ---------------- */
    var tabs = document.querySelectorAll('.tab[data-tab]');
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        Array.prototype.forEach.call(document.querySelectorAll('.tab-panel'), function (p) {
          p.classList.remove('is-active');
        });
        var panel = document.getElementById('tab-' + tab.getAttribute('data-tab'));
        if (panel) panel.classList.add('is-active');
      });
    });

    /* ---------------- lightbox ---------------- */
    var lb = document.getElementById('lightbox');
    if (lb) {
      var lbImg = document.getElementById('lightboxImg');
      var lbCap = document.getElementById('lightboxCap');
      var items = [];
      var index = 0;

      function collect() {
        items = [];
        Array.prototype.forEach.call(
          document.querySelectorAll('.gallery-item img, .plan-figure img, .plan-card__img img'),
          function (img) {
            var thumb = img.currentSrc || img.src;
            items.push({
              // pages serve a 1024px render; data-full holds the original
              src: img.getAttribute('data-full') || thumb,
              key: thumb,
              cap: (img.closest('figure') && img.closest('figure').querySelector('figcaption')
                    ? img.closest('figure').querySelector('figcaption').textContent
                    : img.alt) || ''
            });
          }
        );
      }

      function show(i) {
        if (!items.length) return;
        index = (i + items.length) % items.length;
        lbImg.src = items[index].src;
        lbImg.alt = items[index].cap;
        lbCap.textContent = items[index].cap;
      }

      function openLb(i) {
        collect();
        lb.hidden = false;
        document.body.classList.add('modal-open');
        requestAnimationFrame(function () { lb.classList.add('is-open'); });
        show(i);
      }

      function closeLb() {
        lb.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        setTimeout(function () { lb.hidden = true; lbImg.src = ''; }, 280);
      }

      document.addEventListener('click', function (e) {
        var fig = e.target.closest('.gallery-item, .plan-figure img, [data-lightbox-btn]');
        if (fig && !e.target.closest('.lightbox')) {
          e.preventDefault();
          collect();
          var img = fig.tagName === 'IMG'
            ? fig
            : (fig.closest('.plan-card__img') || fig).querySelector('img') || fig.querySelector('img');
          var src = img ? (img.currentSrc || img.src) : '';
          var found = items.findIndex(function (it) { return it.key === src; });
          openLb(found > -1 ? found : 0);
          return;
        }

        if (e.target.closest('[data-lb-close]')) { closeLb(); return; }
        if (e.target.closest('[data-lb-prev]'))  { show(index - 1); return; }
        if (e.target.closest('[data-lb-next]'))  { show(index + 1); return; }
        if (e.target === lb) closeLb();
      });

      document.addEventListener('keydown', function (e) {
        if (lb.hidden) return;
        if (e.key === 'Escape') closeLb();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
      });

      document.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement &&
            document.activeElement.classList.contains('gallery-item')) {
          e.preventDefault();
          document.activeElement.click();
        }
      });
    }
  });
})();
