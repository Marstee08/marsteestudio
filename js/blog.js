(function () {
    "use strict";

    /* ---- Reveal-on-scroll for blog cards ---- */
    function setupReveal() {
        const targets = document.querySelectorAll(".blog-reveal");
        if (!targets.length) return;

        if (!("IntersectionObserver" in window)) {
            targets.forEach(el => el.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );

        targets.forEach(el => observer.observe(el));
    }

    /* ---- Category filter tabs on the blog listing page ---- */
    function setupFilters() {
        const buttons = document.querySelectorAll(".blog-filter-btn");
        const cards = document.querySelectorAll(".blog-card");
        if (!buttons.length || !cards.length) return;

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                buttons.forEach(b => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const filter = btn.dataset.filter;
                cards.forEach(card => {
                    const match = filter === "all" || card.dataset.category === filter;
                    card.classList.toggle("is-hidden", !match);
                });
            });
        });
    }

    /* ---- Reading progress bar on individual post pages ---- */
    function setupProgressBar() {
        const bar = document.querySelector(".blog-progress");
        const article = document.querySelector(".blog-post-body");
        if (!bar || !article) return;

        function update() {
            const rect = article.getBoundingClientRect();
            const articleHeight = rect.height - window.innerHeight;
            const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(articleHeight, 1));
            const pct = articleHeight > 0 ? (scrolled / articleHeight) * 100 : 0;
            bar.style.width = pct + "%";
        }

        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update();
    }

    /* ---- Share buttons ---- */
    function setupShare() {
        const copyBtn = document.querySelector(".blog-share-copy");
        if (!copyBtn) return;

        copyBtn.addEventListener("click", () => {
            navigator.clipboard?.writeText(window.location.href).then(() => {
                const original = copyBtn.getAttribute("aria-label");
                copyBtn.setAttribute("aria-label", "Link copied!");
                copyBtn.classList.add("is-copied");
                setTimeout(() => {
                    copyBtn.setAttribute("aria-label", original);
                    copyBtn.classList.remove("is-copied");
                }, 1800);
            }).catch(() => {});
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupReveal();
        setupFilters();
        setupProgressBar();
        setupShare();
    });
})();
