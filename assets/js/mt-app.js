/* ==========================================================================
   MindTrainer — page behaviour
   Scroll reveal + FAQ accordion. Both degrade to static under
   prefers-reduced-motion. No scroll listeners: IntersectionObserver only.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- reveal -- */
  /* Motivated: staggers the eye down the page so the grid reads as groups
     rather than one wall of cards. Off entirely when reduced motion is set. */
  var targets = document.querySelectorAll('[data-reveal]');

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal') || '0', 10);
        setTimeout(function () { el.classList.add('is-in'); }, isNaN(delay) ? 0 : delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------- FAQ --- */
  document.querySelectorAll('.mt-faq-q').forEach(function (btn) {
    var item = btn.closest('.mt-faq-item');
    var panel = item && item.querySelector('.mt-faq-a');
    if (!panel) return;

    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', function () {
      var open = item.classList.contains('is-open');

      // One open at a time keeps the list scannable.
      document.querySelectorAll('.mt-faq-item.is-open').forEach(function (other) {
        if (other === item) return;
        other.classList.remove('is-open');
        other.querySelector('.mt-faq-a').style.height = '0px';
        other.querySelector('.mt-faq-q').setAttribute('aria-expanded', 'false');
      });

      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () { panel.style.height = '0px'; });
        item.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        panel.style.height = panel.scrollHeight + 'px';
        panel.addEventListener('transitionend', function once(e) {
          if (e.propertyName !== 'height') return;
          panel.removeEventListener('transitionend', once);
          if (item.classList.contains('is-open')) panel.style.height = 'auto';
        });
      }
    });
  });
})();
