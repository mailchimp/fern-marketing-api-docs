/*
 * Testimonial carousel for the developer homepage. Shows one .mc-quote-slide
 * at a time; prev/next arrows and dots switch the active slide. Static content
 * (rendered at build), so this only toggles the .is-active class.
 */
(function () {
  function init() {
    document.querySelectorAll("[data-mc-carousel]").forEach(function (car) {
      if (car.__mcInit) return;
      car.__mcInit = true;
      var section = car.closest(".mc-home-quote, .mc-ipp-quote") || car.parentElement;
      var slides = car.querySelectorAll(".mc-quote-slide");
      var dots = section.querySelectorAll(".mc-quote-dot");
      var prev = car.querySelector(".mc-quote-prev");
      var next = car.querySelector(".mc-quote-next");
      var n = slides.length;
      if (!n) return;
      var idx = 0;
      function show(i) {
        idx = (i + n) % n;
        slides.forEach(function (s, j) { s.classList.toggle("is-active", j === idx); });
        dots.forEach(function (d, j) { d.classList.toggle("is-active", j === idx); });
      }
      if (prev) prev.addEventListener("click", function () { show(idx - 1); });
      if (next) next.addEventListener("click", function () { show(idx + 1); });
      dots.forEach(function (d) {
        d.addEventListener("click", function () { show(parseInt(d.getAttribute("data-idx"), 10) || 0); });
      });
      show(0);
    });
  }
  var t;
  function schedule() { clearTimeout(t); t = setTimeout(init, 30); }
  if (document.readyState !== "loading") schedule();
  else document.addEventListener("DOMContentLoaded", schedule);
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true });
})();
