/* =========================================
   SERVICES PAGE — LUXURY PARALLAX + 3D EFFECTS
   Add-on file. Does not touch script.js.
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;


  /* -----------------------------------------
     1. HERO — cinematic parallax
     ----------------------------------------- */

  const heroContent = document.querySelector(".page-hero .container");

  // NOTE: this used to fade/scale/translate the hero content on scroll,
  // but on a page-hero (much shorter than a full-viewport hero) the fade
  // formula hit opacity 0 well before the section itself scrolled out of
  // view - leaving a large blank box where the now-invisible heading/text
  // still occupied its layout space. Removed the scroll-linked fade;
  // the hero now just stays visible normally.
  function updateHero() {
    if (!heroContent) return;
    heroContent.style.translate = "";
    heroContent.style.scale = "";
    heroContent.style.opacity = "";
  }

  updateHero();


  /* -----------------------------------------
     2. SERVICE NUMBERS — continuous 3D float,
        each on its own slightly offset rhythm so
        they don't all bob in sync
     ----------------------------------------- */

  const numbers = document.querySelectorAll(".service-detail-number span");

  function animateNumbers(timestamp) {

    numbers.forEach(function (el, i) {
      const t = timestamp / 1000 + i * 1.3;
      const idleY = Math.sin(t * 0.55) * 10;
      const idleRotate = Math.sin(t * 0.4) * 10;
      el.style.translate = `0 ${idleY.toFixed(2)}px`;
      el.style.rotate = `0 1 0 ${idleRotate.toFixed(2)}deg`;
    });

    requestAnimationFrame(animateNumbers);
  }

  if (numbers.length) {
    requestAnimationFrame(animateNumbers);
  }


  /* -----------------------------------------
     3. SELF-CONTAINED SCROLL REVEALS
     Each observer adds "section-reveal" to its own
     target once, then stops watching it — independent
     of any other system on the page.
     ----------------------------------------- */

  function revealOnScroll(selector, options) {

    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("section-reveal");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("section-reveal");
          observer.unobserve(entry.target);
        });
      },
      options || { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  revealOnScroll(".service-detail-grid");
  revealOnScroll(".service-features");
  revealOnScroll(".experience-types");
  revealOnScroll(".custom-project-box");
  revealOnScroll(".services-cta .simple-cta");


  /* -----------------------------------------
     4. CURSOR GLARE on feature / experience rows
     ----------------------------------------- */

  function addGlare(selector) {

    document.querySelectorAll(selector).forEach(function (item) {

      item.addEventListener("mousemove", function (e) {
        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        item.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
        item.style.setProperty("--my", `${(y / rect.height) * 100}%`);
      });

    });
  }

  addGlare(".service-features > div");
  addGlare(".experience-type");

});
