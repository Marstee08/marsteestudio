/* =========================================
   PROCESS PAGE — LUXURY PARALLAX + 3D EFFECTS
   Same pattern as services-effects.js.
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;


  /* ---- 1. HERO — cinematic parallax ---- */

  const heroContent = document.querySelector(".page-hero .container");

  function updateHero() {
    if (!heroContent) return;
    const scrollY = window.scrollY;
    const offset = Math.min(scrollY * 0.55, 320);
    const scale = Math.max(1 - scrollY / 2200, 0.9);
    const opacity = Math.max(1 - scrollY / 500, 0);
    heroContent.style.translate = `0 ${offset}px`;
    heroContent.style.scale = `${scale}`;
    heroContent.style.opacity = opacity;
  }

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateHero();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  updateHero();


  /* ---- 2. SELF-CONTAINED SCROLL REVEALS ---- */

  function revealOnScroll(selector, className, options) {

    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add(className);
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(className);
          observer.unobserve(entry.target);
        });
      },
      options || { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  revealOnScroll(".process-intro-grid", "section-reveal");
  revealOnScroll(".expectations-grid", "section-reveal");
  revealOnScroll(".process-timeline-item", "step-reveal", {
    threshold: 0.2,
    rootMargin: "0px 0px -50px 0px"
  });


  /* ---- 3. CURSOR GLARE — expectation cards ---- */

  document.querySelectorAll(".expectation-card").forEach(function (item) {
    item.addEventListener("mousemove", function (e) {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      item.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      item.style.setProperty("--my", `${(y / rect.height) * 100}%`);
    });
  });

});
