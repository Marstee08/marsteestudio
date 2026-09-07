/* =========================================
   ABOUT PAGE — LUXURY PARALLAX + 3D EFFECTS
   Add-on file. Does not touch script.js.
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;


  /* -----------------------------------------
     1. HERO — cinematic parallax (moves + scales
        + fades as you scroll past it)
     ----------------------------------------- */

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


  /* -----------------------------------------
     2. MONOGRAM — continuous idle 3D float
        combined with scroll-driven tilt, running
        on its own animation loop for a silky,
        always-alive feel (not just on scroll)
     ----------------------------------------- */

  const monogram = document.querySelector(".about-monogram");

  function animateMonogram(timestamp) {

    if (monogram) {
      const rect = monogram.getBoundingClientRect();
      const centerOffset = rect.top - window.innerHeight / 2;

      // idle breathing motion, always running
      const t = timestamp / 1000;
      const idleY = Math.sin(t * 0.6) * 14;
      const idleRotate = Math.sin(t * 0.4) * 6;

      // scroll-driven tilt, layered on top
      const scrollRotateY = Math.max(Math.min(centerOffset * 0.05, 28), -28);
      const scrollY = Math.max(Math.min(centerOffset * -0.15, 70), -70);

      monogram.style.translate = `0 ${(idleY + scrollY).toFixed(2)}px`;
      monogram.style.rotate =
        `${(-scrollRotateY / 2).toFixed(2)} ${(scrollRotateY + idleRotate).toFixed(2)} 0 ${Math.abs(scrollRotateY + idleRotate).toFixed(2)}deg`;
    }

    requestAnimationFrame(animateMonogram);
  }

  requestAnimationFrame(animateMonogram);


  /* -----------------------------------------
     Scroll listener (hero only — monogram runs
     on its own continuous loop above)
     ----------------------------------------- */

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


  /* -----------------------------------------
     3. MOUSE-TILT 3D + CURSOR GLARE ON CARDS
     ----------------------------------------- */

  function addTilt(selector, maxTilt) {

    const items = document.querySelectorAll(selector);

    items.forEach(function (item) {

      item.addEventListener("mousemove", function (e) {

        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        item.style.rotate =
          `${rotateX.toFixed(2)} ${rotateY.toFixed(2)} 0 ${Math.max(Math.abs(rotateX), Math.abs(rotateY)).toFixed(2)}deg`;

        // move the glass glare toward the cursor
        item.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
        item.style.setProperty("--my", `${(y / rect.height) * 100}%`);
      });

      item.addEventListener("mouseleave", function () {
        item.style.rotate = "0deg";
      });

    });
  }

  addTilt(".value-card", 16);
  addTilt(".about-service-item", 9);


  /* -----------------------------------------
     4. STORY POINTS — self-contained 3D reveal
     ----------------------------------------- */

  const storyPoints = document.querySelectorAll(".story-point");

  if (storyPoints.length && "IntersectionObserver" in window) {

    const storyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("story-reveal");
          storyObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );

    storyPoints.forEach(function (point) {
      storyObserver.observe(point);
    });

  } else {

    storyPoints.forEach(function (point) {
      point.classList.add("story-reveal");
    });

  }

});
