/* =========================================
   CATALOGUE PAGE — LUXURY PARALLAX + 3D EFFECTS
   Add-on file. Does not touch script.js.

   Your product cards are injected dynamically after a
   Supabase fetch (see loadCatalogueProducts() in
   script.js), and that grid gets fully replaced each
   time it loads. A one-time setup on page load would
   miss every product you add going forward — so instead
   this file uses a MutationObserver that watches the
   grid permanently and wires up any .catalogue-card it
   ever sees, today or months from now.
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


  /* ---- 2. STATIC SECTIONS — self-contained scroll reveals ---- */

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

  revealOnScroll(".catalogue-intro", "section-reveal");
  revealOnScroll(".catalogue-controls", "section-reveal");
  revealOnScroll(".catalogue-package-filter", "section-reveal");
  revealOnScroll(".catalogue-steps", "section-reveal");
  revealOnScroll(".catalogue-custom-box", "section-reveal");
  revealOnScroll(".catalogue-cta .simple-cta", "section-reveal");

  document.querySelectorAll(".catalogue-step").forEach(function () {
    revealOnScroll(".catalogue-step", "step-reveal", {
      threshold: 0.2,
      rootMargin: "0px 0px -50px 0px"
    });
  });


  /* -----------------------------------------------------
     3. PRODUCT CARDS — reveal + tilt + cursor glare,
     wired up automatically for every card that ever
     appears in the catalogue grid, present or future.
     ----------------------------------------------------- */

  const grid = document.querySelector(".catalogue-grid");
  if (!grid) return;

  // cards already wired up, so we never double-bind listeners
  const wiredCards = new WeakSet();

  let cardObserver = null;
  if ("IntersectionObserver" in window) {
    cardObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("card-reveal");
          cardObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
  }

  function wireCard(card, index) {

    if (wiredCards.has(card)) return;
    wiredCards.add(card);

    // small stagger so a freshly-loaded batch of products
    // fans in rather than popping simultaneously
    card.style.transitionDelay = `${Math.min(index * 0.07, 0.5)}s`;

    if (cardObserver) {
      cardObserver.observe(card);
    } else {
      card.classList.add("card-reveal");
    }

    card.addEventListener("mousemove", function (e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.rotate =
        `${rotateX.toFixed(2)} ${rotateY.toFixed(2)} 0 ${Math.max(Math.abs(rotateX), Math.abs(rotateY)).toFixed(2)}deg`;

      card.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      card.style.setProperty("--my", `${(y / rect.height) * 100}%`);
    });

    card.addEventListener("mouseleave", function () {
      card.style.rotate = "0deg";
    });
  }

  function wireAllCurrentCards() {
    grid.querySelectorAll(".catalogue-card").forEach(function (card, i) {
      wireCard(card, i);
    });
  }

  // run once for whatever's already in the grid (e.g. if
  // products loaded before this script ran)
  wireAllCurrentCards();

  // and keep watching forever — every time script.js
  // replaces grid.innerHTML with a fresh product list
  // (now, or after you add new products down the line),
  // this fires and wires up the new cards automatically
  const gridObserver = new MutationObserver(function () {
    wireAllCurrentCards();
  });

  gridObserver.observe(grid, { childList: true });

});
