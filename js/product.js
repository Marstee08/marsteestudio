/* Mars Tee Studio - product detail page.
   Loads one product by ?id=, shows a gallery, details, actions
   and a "You May Also Like" row. Pricing/cart/demo buttons reuse
   the same helpers and delegated handlers as the catalogue. */
(async function () {
    const root = document.getElementById("productRoot");
    if (!root) return;

    const id = new URLSearchParams(location.search).get("id");

    function showState(message) {
        root.innerHTML = `<div class="product-state"><h2>${message}</h2><p><a href="catalogue.html" class="button button-primary">Browse catalogue</a></p></div>`;
    }

    if (!id || typeof siteSupabaseClient === "undefined" || !siteSupabaseClient) {
        showState("Product not found");
        return;
    }

    function toList(value) {
        if (Array.isArray(value)) return value;
        if (typeof value === "string" && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
            return value.split(",").map(v => v.trim()).filter(Boolean);
        }
        return [];
    }

    try {
        const { data: product, error } = await siteSupabaseClient
            .from("Product").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!product || product.Is_active === false) {
            showState("This product isn't available");
            return;
        }

        const info = mtsProductPricing(product);
        const name = product.Name || "Untitled Service";
        document.title = name + " | Mars Tee Studio";

        const rawImages = [product.Image_url, product.front_image_url, product.back_image_url, ...toList(product.gallery_URLs)];
        const resolved = await Promise.all(rawImages.filter(Boolean).map(getProductImage));
        const images = [...new Set(resolved.filter(Boolean))];

        const demoVideoUrl = product.demo_video_url || "";
        const liveUrl = product.website_url || "";
        let demoButton = "";
        if (demoVideoUrl) {
            demoButton = `<button type="button" class="button button-secondary watch-demo-btn" data-video="${escapeHtml(demoVideoUrl)}" data-i18n="new.watchDemo">▶ Watch Demo</button>`;
        } else if (liveUrl) {
            demoButton = `<button type="button" class="button button-secondary view-live-btn" data-url="${escapeHtml(liveUrl)}" data-i18n="new.viewLive">View Live Demo ↗</button>`;
        }

        const waText = encodeURIComponent(`Hi Mars Tee Studio, I'd like to ask about "${name}".`);
        const planText = encodeURIComponent("Hi Mars Tee Studio, I'd like to pay for \"" + name + "\" in installments. What plan can you offer?");
        const tier = info.tier ? info.tier.charAt(0).toUpperCase() + info.tier.slice(1) : "";

        root.innerHTML = `
            <div class="product-layout">
                <div class="product-gallery">
                    <div class="product-main-img">${images[0] ? `<img id="productMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(name)}">` : ""}</div>
                    ${images.length > 1 ? `<div class="product-thumbs">${images.map((src, i) =>
                        `<button type="button" class="product-thumb${i === 0 ? " active" : ""}" data-src="${escapeHtml(src)}" aria-label="Image ${i + 1}"><img src="${escapeHtml(src)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
                </div>
                <div class="product-info">
                    <span class="product-crumb">${escapeHtml(info.type.toUpperCase())}</span>
                    <h1>${escapeHtml(name)}</h1>
                    ${mtsPriceHtml(info)}
                    ${product.Description ? `<h2 data-i18n="new.description">Description</h2><p class="product-desc">${escapeHtml(product.Description)}</p>` : ""}
                    <div class="product-actions">
                        ${info.hasPrice ? `<button type="button" class="button button-primary add-to-cart-btn" data-id="${escapeHtml(String(product.id))}" data-name="${escapeHtml(name)}" data-price="${info.price}" data-image="${escapeHtml(images[0] || "")}" data-i18n="new.addToCart">Add to Cart</button>` : ""}
                        ${demoButton}
                        ${info.hasPrice ? `<a href="https://wa.me/2349124147362?text=${planText}" target="_blank" rel="noopener" class="button button-secondary" data-i18n="new.installmentPay">Installment pay</a>` : ""}
                        <a href="https://wa.me/2349124147362?text=${waText}" target="_blank" rel="noopener" class="button wa-full" data-i18n="new.contactWhatsapp">Contact via WhatsApp</a>
                    </div>
                    <div class="product-facts">
                        <div><b data-i18n="new.type">Type:</b>${escapeHtml(info.type)}</div>
                        ${tier ? `<div><b data-i18n="new.package">Package:</b>${escapeHtml(tier)}</div>` : ""}
                    </div>
                </div>
            </div>`;

        const mainImg = document.getElementById("productMainImg");
        root.querySelectorAll(".product-thumb").forEach(btn => btn.addEventListener("click", () => {
            if (mainImg) mainImg.src = btn.dataset.src;
            root.querySelectorAll(".product-thumb").forEach(b => b.classList.toggle("active", b === btn));
        }));

        if (typeof refreshDisplayedPrices === "function") refreshDisplayedPrices();
        retranslate();

        // You May Also Like: same type first, then anything else active.
        const { data: others } = await siteSupabaseClient
            .from("Product").select("*").eq("Is_active", true).neq("id", product.id);
        if (others?.length) {
            const sameType = others.filter(o => o.project_type === product.project_type);
            const rest = others.filter(o => o.project_type !== product.project_type);
            const picks = [...sameType, ...rest].slice(0, 8);
            document.getElementById("productRelatedRow").innerHTML =
                (await Promise.all(picks.map(mtsProductCardHtml))).join("");
            document.getElementById("productRelated").hidden = false;
            if (typeof refreshDisplayedPrices === "function") refreshDisplayedPrices();
        }
    } catch (error) {
        console.error("Product page error:", error);
        showState("Couldn't load this product");
    }
})();
