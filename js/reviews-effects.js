/* =========================================
   REVIEWS PAGE — LUXURY PARALLAX + 3D EFFECTS
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

  revealOnScroll(".trust-box", "section-reveal");
  revealOnScroll(".reviews-heading", "section-reveal");
  revealOnScroll(".reviews-grid", "section-reveal");
  revealOnScroll(".reviews-empty", "section-reveal");
  revealOnScroll(".guidelines-grid", "section-reveal");
  revealOnScroll(".review-form-card", "section-reveal");
  revealOnScroll(".reviews-cta .simple-cta", "section-reveal");


  /* ---- 3. CURSOR GLARE — guideline cards ---- */

  document.querySelectorAll(".guideline-card").forEach(function (item) {
    item.addEventListener("mousemove", function (e) {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      item.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      item.style.setProperty("--my", `${(y / rect.height) * 100}%`);
    });
  });


  /* ---- 4. FORM CARD — gentle floating tilt toward cursor ---- */

  const formCard = document.querySelector(".review-form-card");

  if (formCard) {
    formCard.addEventListener("mousemove", function (e) {
      const rect = formCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -2.5;
      const rotateY = ((x - centerX) / centerX) * 2.5;

      formCard.style.rotate =
        `${rotateX.toFixed(2)} ${rotateY.toFixed(2)} 0 ${Math.max(Math.abs(rotateX), Math.abs(rotateY)).toFixed(2)}deg`;

      formCard.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      formCard.style.setProperty("--my", `${(y / rect.height) * 100}%`);
    });

    formCard.addEventListener("mouseleave", function () {
      formCard.style.rotate = "0deg";
    });
  }

});
