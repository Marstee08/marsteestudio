/* =========================================================
   MARS TEE STUDIO — SHARED SITE SCRIPT
   Safe on every public page, including when Supabase CDN
   is unavailable. Catalogue/portfolio simply keep their
   static empty states until the client is available.
   ========================================================= */

const SUPABASE_URL = "https://iggffzkopskzzemuksay.supabase.co";
const SUPABASE_KEY = "sb_publishable_hWSTRRLII9wFAZY6vWreUw_1-2oqf6-";
const PRODUCT_BUCKET = "product-image";


/* =========================================================
   CART
   A simple localStorage-based cart. Every product can be
   added to cart AND has a "Chat on WhatsApp" option - the two
   are not mutually exclusive; the cart is for people who want
   to check out directly, WhatsApp is for anyone with a
   question first or who'd rather order that way.
   ========================================================= */

const CART_KEY = "mts_cart";

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    saveCart(cart);
}

function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
}

function setCartQty(id, qty) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) {
        removeFromCart(id);
        return;
    }
    item.qty = qty;
    saveCart(cart);
}

function getCartCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
    return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function updateCartBadge() {
    document.querySelectorAll(".cart-count").forEach(el => {
        const count = getCartCount();
        el.textContent = count;
        el.classList.toggle("is-hidden", count === 0);
    });
}

const getSiteSupabase = () => {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.warn("Mars Tee Studio: Supabase client is unavailable. Dynamic content will remain in its fallback state.");
        return null;
    }

    try {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (error) {
        console.warn("Mars Tee Studio: Could not initialise Supabase.", error);
        return null;
    }
};

const siteSupabaseClient = getSiteSupabase();

/* =========================================================
   SHARED GRID LOADING / ERROR STATES
   Used by Catalogue, Portfolio and Reviews so a slow or
   flaky connection shows an honest "loading" state instead
   of briefly flashing the "nothing here yet" empty message,
   and a real fetch failure shows a distinct, recoverable
   error state instead of silently looking identical to
   "genuinely no content yet".
   ========================================================= */

function showGridLoading(grid, count = 3) {
    grid.dataset.originalHtml = grid.dataset.originalHtml || grid.innerHTML;
    const skeletons = Array.from({ length: count }, () => `
        <div class="grid-skeleton-card" aria-hidden="true">
            <div class="grid-skeleton-block grid-skeleton-image"></div>
            <div class="grid-skeleton-block grid-skeleton-line" style="width:40%"></div>
            <div class="grid-skeleton-block grid-skeleton-line" style="width:85%"></div>
            <div class="grid-skeleton-block grid-skeleton-line" style="width:60%"></div>
        </div>
    `).join("");
    grid.innerHTML = `<div class="grid-loading" role="status" aria-live="polite">${skeletons}</div>`;
}

function showGridError(grid, retryFn) {
    grid.innerHTML = `
        <div class="grid-error" role="alert">
            <div class="grid-error-icon">!</div>
            <h3>Something went wrong loading this.</h3>
            <p>That's likely a connection hiccup on our end, not yours. Please try again, or reach us directly and we'll sort you out.</p>
            <div class="grid-error-actions">
                <button type="button" class="button button-primary grid-retry-btn">Try Again</button>
                <a href="contact.html" class="button button-secondary">Contact Us</a>
            </div>
        </div>
    `;
    grid.querySelector(".grid-retry-btn")?.addEventListener("click", () => retryFn());
}

function restoreGridEmpty(grid) {
    if (grid.dataset.originalHtml) {
        grid.innerHTML = grid.dataset.originalHtml;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   CURRENCY
   Prices are entered/stored in Naira (NGN). Visitors outside
   Nigeria see an auto-detected local-currency ESTIMATE, based
   on their IP location and live exchange rates (refreshed once
   a day, cached in localStorage). The actual Paystack charge
   always happens in NGN regardless of what's displayed here -
   checkout.html has its own note making that explicit to the
   customer, so there's no surprise on their card statement.
   If a visitor manually picks a currency from the dropdown,
   that choice is remembered and auto-detection never overrides
   it again.
   ========================================================= */

const CURRENCY_STORAGE_KEY = "mts_currency";
const CURRENCY_MANUAL_KEY = "mts_currency_manual";
const RATES_STORAGE_KEY = "mts_rates";
const RATES_STORAGE_TIME_KEY = "mts_rates_time";
const RATES_MAX_AGE_MS = 24 * 60 * 60 * 1000; // refresh once a day

const CURRENCY_SYMBOLS = {
    NGN: "₦", USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
    ZAR: "R", KES: "KSh", GHS: "GH₵", XOF: "CFA", XAF: "FCFA",
    EGP: "E£", MAD: "MAD", INR: "₹", JPY: "¥", CNY: "¥", AED: "AED",
    SAR: "SAR", BRL: "R$", MXN: "MX$", CHF: "CHF", SEK: "kr", NOK: "kr",
    DKK: "kr", PLN: "zł", TRY: "₺", SGD: "S$", NZD: "NZ$", KRW: "₩",
    PHP: "₱", THB: "฿", VND: "₫", IDR: "Rp", PKR: "Rs", BDT: "৳",
    UGX: "USh", TZS: "TSh", RWF: "FRw", ETB: "Br", ZMW: "ZK", HKG: "HK$"
};

// Maps a visitor's detected country to the currency they'd expect to
// see. Not exhaustive, but covers the regions most visitors come from.
const COUNTRY_TO_CURRENCY = {
    NG: "NGN", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD",
    IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
    PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
    ZA: "ZAR", KE: "KES", GH: "GHS", CI: "XOF", SN: "XOF", BJ: "XOF",
    TG: "XOF", CM: "XAF", GA: "XAF", TD: "XAF", EG: "EGP", MA: "MAD",
    IN: "INR", JP: "JPY", CN: "CNY", HK: "HKG", AE: "AED", SA: "SAR",
    BR: "BRL", MX: "MXN", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
    PL: "PLN", TR: "TRY", SG: "SGD", KR: "KRW", PH: "PHP", TH: "THB",
    VN: "VND", ID: "IDR", PK: "PKR", BD: "BDT", UG: "UGX", TZ: "TZS",
    RW: "RWF", ET: "ETB", ZM: "ZMW"
};

// Used only until live rates finish loading, or if the fetch fails -
// approximate, safe fallback so a number is never wildly wrong.
const FALLBACK_RATES = {
    NGN: 1, USD: 1 / 1600, EUR: 1 / 1750, GBP: 1 / 2050,
    GHS: 1 / 105, ZAR: 1 / 88, KES: 1 / 12.4
};

let liveRates = null; // populated async once the rates fetch resolves

function loadCachedRates() {
    try {
        const cachedAt = Number(localStorage.getItem(RATES_STORAGE_TIME_KEY) || 0);
        if (Date.now() - cachedAt > RATES_MAX_AGE_MS) return null;
        const cached = JSON.parse(localStorage.getItem(RATES_STORAGE_KEY) || "null");
        return cached && typeof cached === "object" ? cached : null;
    } catch {
        return null;
    }
}

async function fetchLiveRates() {
    const cached = loadCachedRates();
    if (cached) {
        liveRates = cached;
        return cached;
    }
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/NGN");
        const data = await res.json();
        if (data && data.result === "success" && data.rates) {
            liveRates = data.rates;
            localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(data.rates));
            localStorage.setItem(RATES_STORAGE_TIME_KEY, String(Date.now()));
            return data.rates;
        }
    } catch {
        // Silently fall back - FALLBACK_RATES / NGN keeps the site correct.
    }
    return null;
}

function getRate(code) {
    if (code === "NGN") return 1;
    if (liveRates && liveRates[code]) return liveRates[code];
    if (FALLBACK_RATES[code]) return FALLBACK_RATES[code];
    return null; // unsupported until live rates load - caller should show NGN
}

function getActiveCurrency() {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored && CURRENCY_SYMBOLS[stored] ? stored : "NGN";
}

function setActiveCurrency(code, manual) {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    if (manual) localStorage.setItem(CURRENCY_MANUAL_KEY, "true");
    refreshDisplayedPrices();
    const select = document.querySelector(".currency-switcher");
    if (select) select.value = getActiveCurrency();
}

let cachedGeoCountry = null;
let geoFetchPromise = null;

function fetchVisitorCountry() {
    if (geoFetchPromise) return geoFetchPromise;
    geoFetchPromise = (async () => {
        try {
            const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en");
            const data = await res.json();
            cachedGeoCountry = data && data.countryCode ? data.countryCode : null;
        } catch {
            cachedGeoCountry = null; // detection is a nice-to-have, never breaks the site
        }
        return cachedGeoCountry;
    })();
    return geoFetchPromise;
}

async function autoDetectCurrency() {
    if (localStorage.getItem(CURRENCY_MANUAL_KEY) === "true") return; // user already chose
    const country = await fetchVisitorCountry();
    const code = country ? COUNTRY_TO_CURRENCY[country] : null;
    if (code && code !== "NGN") {
        await fetchLiveRates();
        if (getRate(code)) setActiveCurrency(code, false);
    }
}

function formatPrice(ngnAmount) {
    const currencyCode = getActiveCurrency();
    const rate = getRate(currencyCode);
    if (!rate) return formatPriceIn("NGN", ngnAmount);
    return formatPriceIn(currencyCode, ngnAmount, rate);
}

function formatPriceIn(currencyCode, ngnAmount, rateOverride) {
    const rate = rateOverride || getRate(currencyCode) || 1;
    const symbol = CURRENCY_SYMBOLS[currencyCode] || "";
    const converted = Number(ngnAmount) * rate;
    const decimals = currencyCode === "NGN" ? 0 : 2;
    return `${symbol}${converted.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}`;
}

function refreshDisplayedPrices() {
    document.querySelectorAll("[data-price-ngn]").forEach(element => {
        const ngn = element.dataset.priceNgn;
        if (ngn === undefined || ngn === "") return;
        const prefix = element.dataset.pricePrefix || "";
        element.textContent = prefix + formatPrice(ngn);
    });
}

function setupCurrencySwitcher() {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector(".currency-switcher")) return;

    const select = document.createElement("select");
    select.className = "currency-switcher";
    select.setAttribute("aria-label", "Choose currency");

    Object.keys(CURRENCY_SYMBOLS).forEach(code => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = `${CURRENCY_SYMBOLS[code]} ${code}`;
        select.appendChild(option);
    });

    select.value = getActiveCurrency();

    select.addEventListener("change", () => {
        setActiveCurrency(select.value, true);
    });

    const themeToggle = nav.querySelector(".theme-toggle");
    if (themeToggle) {
        nav.insertBefore(select, themeToggle);
    } else {
        nav.appendChild(select);
    }
}

/* =========================================================
   LANGUAGE
   English lives directly in the HTML (no en.json needed).
   Other languages are loaded from lang/<code>.json on demand
   and applied to every [data-i18n] (plain text) or
   [data-i18n-html] (preserves inner markup, e.g. a highlighted
   <span> inside a heading) element. Country auto-detection
   reuses the same geolocation lookup as currency detection
   (one fetch, not two). A manual pick from the switcher always
   wins over auto-detection from then on, same pattern as
   currency.
   ========================================================= */

const LANGUAGE_STORAGE_KEY = "mts_lang";
const LANGUAGE_MANUAL_KEY = "mts_lang_manual";
const LANGUAGE_LABELS = { en: "English", fr: "Français", es: "Español", pt: "Português", zh: "中文" };

const COUNTRY_TO_LANGUAGE = {
    FR: "fr", CI: "fr", SN: "fr", BJ: "fr", TG: "fr", CM: "fr", GA: "fr", TD: "fr",
    BF: "fr", ML: "fr", NE: "fr", GN: "fr", CD: "fr", CG: "fr", MG: "fr", LU: "fr",
    ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
    GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es",
    CR: "es", PA: "es", UY: "es", GQ: "es",
    PT: "pt", BR: "pt", AO: "pt", MZ: "pt", GW: "pt", CV: "pt", ST: "pt",
    CN: "zh", HK: "zh", TW: "zh", MO: "zh"
};

let translationsCache = {};

async function loadTranslations(lang) {
    if (lang === "en") return null;
    if (translationsCache[lang]) return translationsCache[lang];
    try {
        const res = await fetch(`lang/${lang}.json`);
        const data = await res.json();
        translationsCache[lang] = data;
        return data;
    } catch {
        return null;
    }
}

function getActiveLanguage() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGE_LABELS[stored] ? stored : "en";
}

function applyTranslations(lang, dict) {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        if (el.dataset.i18nOriginal === undefined) el.dataset.i18nOriginal = el.textContent;
        el.textContent = (lang !== "en" && dict && dict[el.dataset.i18n]) || el.dataset.i18nOriginal;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        if (el.dataset.i18nOriginal === undefined) el.dataset.i18nOriginal = el.innerHTML;
        el.innerHTML = (lang !== "en" && dict && dict[el.dataset.i18nHtml]) || el.dataset.i18nOriginal;
    });
}

async function setLanguage(lang, manual) {
    if (!LANGUAGE_LABELS[lang]) return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    if (manual) localStorage.setItem(LANGUAGE_MANUAL_KEY, "true");
    const dict = await loadTranslations(lang);
    applyTranslations(lang, dict);
    const select = document.querySelector(".language-switcher");
    if (select) select.value = lang;
}

function setupLanguageSwitcher() {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector(".language-switcher")) return;

    const select = document.createElement("select");
    select.className = "language-switcher";
    select.setAttribute("aria-label", "Choose language");

    Object.keys(LANGUAGE_LABELS).forEach(code => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = LANGUAGE_LABELS[code];
        select.appendChild(option);
    });

    select.value = getActiveLanguage();

    select.addEventListener("change", () => {
        setLanguage(select.value, true);
    });

    const themeToggle = nav.querySelector(".theme-toggle");
    if (themeToggle) {
        nav.insertBefore(select, themeToggle);
    } else {
        nav.appendChild(select);
    }
}

async function autoDetectLanguage() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGE_LABELS[stored]) {
        // Apply whatever was already chosen/detected on a previous visit.
        if (stored !== "en") await setLanguage(stored, false);
        return;
    }
    if (localStorage.getItem(LANGUAGE_MANUAL_KEY) === "true") return;

    const country = await fetchVisitorCountry();
    const lang = country ? COUNTRY_TO_LANGUAGE[country] : null;
    if (lang) await setLanguage(lang, false);
}

document.addEventListener("DOMContentLoaded", () => {
    setupCurrencySwitcher();
    setupLanguageSwitcher();
    autoDetectCurrency();
    autoDetectLanguage();
});

/* ---- Cart icon (injected into nav, same pattern as currency switcher) ---- */

function setupCartIcon() {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector(".cart-icon-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cart-icon-btn";
    btn.setAttribute("aria-label", "View cart");
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/>
        </svg>
        <span class="cart-count is-hidden">0</span>
    `;
    btn.addEventListener("click", () => setupCartDrawer(true));

    const themeToggle = nav.querySelector(".theme-toggle");
    if (themeToggle) {
        nav.insertBefore(btn, themeToggle);
    } else {
        nav.appendChild(btn);
    }
    updateCartBadge();
}

document.addEventListener("DOMContentLoaded", setupCartIcon);

/* ---- Account icon (injected into nav, same pattern as cart/currency) ---- */

function setupAccountIcon() {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector(".account-icon-btn") || window.location.pathname.endsWith("account.html")) return;

    const link = document.createElement("a");
    link.href = "account.html";
    link.className = "account-icon-btn";
    link.setAttribute("aria-label", "My account");
    link.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>
        </svg>
    `;

    const themeToggle = nav.querySelector(".theme-toggle");
    if (themeToggle) {
        nav.insertBefore(link, themeToggle);
    } else {
        nav.appendChild(link);
    }
}

document.addEventListener("DOMContentLoaded", setupAccountIcon);

/* ---- Cart drawer ---- */

function renderCartDrawerContents() {
    const body = document.querySelector(".cart-drawer-body");
    const footer = document.querySelector(".cart-drawer-footer");
    if (!body || !footer) return;

    const cart = getCart();

    if (!cart.length) {
        body.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
        footer.innerHTML = "";
        return;
    }

    body.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : ""}</div>
            <div class="cart-item-info">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${formatPrice(item.price)}</span>
                <div class="cart-item-qty">
                    <button type="button" class="cart-qty-btn" data-action="decrease">&minus;</button>
                    <span>${item.qty}</span>
                    <button type="button" class="cart-qty-btn" data-action="increase">+</button>
                </div>
            </div>
            <button type="button" class="cart-item-remove" aria-label="Remove">&times;</button>
        </div>
    `).join("");

    footer.innerHTML = `
        <div class="cart-total-row">
            <span>Total</span>
            <strong>${formatPrice(getCartTotal())}</strong>
        </div>
        <button type="button" class="button button-primary cart-checkout-btn">Checkout →</button>
    `;
}

function setupCartDrawer(forceOpen) {
    let drawer = document.querySelector(".cart-drawer");

    if (!drawer) {
        drawer = document.createElement("div");
        drawer.className = "cart-drawer hidden";
        drawer.innerHTML = `
            <div class="cart-drawer-backdrop"></div>
            <div class="cart-drawer-panel">
                <div class="cart-drawer-header">
                    <h3>Your Cart</h3>
                    <button type="button" class="cart-drawer-close" aria-label="Close">&times;</button>
                </div>
                <div class="cart-drawer-body"></div>
                <div class="cart-drawer-footer"></div>
            </div>
        `;
        document.body.appendChild(drawer);

        drawer.querySelector(".cart-drawer-backdrop").addEventListener("click", () => drawer.classList.add("hidden"));
        drawer.querySelector(".cart-drawer-close").addEventListener("click", () => drawer.classList.add("hidden"));

        drawer.addEventListener("click", event => {
            const item = event.target.closest(".cart-item");
            if (!item) return;
            const id = item.dataset.id;

            if (event.target.closest(".cart-item-remove")) {
                removeFromCart(id);
                renderCartDrawerContents();
            } else if (event.target.closest("[data-action='increase']")) {
                const cart = getCart();
                const found = cart.find(i => i.id === id);
                if (found) setCartQty(id, found.qty + 1);
                renderCartDrawerContents();
            } else if (event.target.closest("[data-action='decrease']")) {
                const cart = getCart();
                const found = cart.find(i => i.id === id);
                if (found) setCartQty(id, found.qty - 1);
                renderCartDrawerContents();
            }
        });

        drawer.addEventListener("click", event => {
            if (event.target.closest(".cart-checkout-btn")) {
                window.location.href = "checkout.html";
            }
        });
    }

    renderCartDrawerContents();

    if (forceOpen) {
        drawer.classList.remove("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => setupCartDrawer(false));

document.addEventListener("click", event => {
    const btn = event.target.closest(".add-to-cart-btn");
    if (!btn) return;
    addToCart({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price) || 0,
        image: btn.dataset.image || ""
    });
    const originalText = btn.textContent;
    btn.textContent = "Added ✓";
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 1400);
});

/* =========================================================
   BRAND ICONS
   Every page reuses the same .social-link / .contact-method
   markup, so this runs once, site-wide, instead of editing
   each page's HTML. It reads each icon's own visible label
   and applies that platform's real brand color as a CSS
   variable, with a hover reveal instead of a static tint.
   ========================================================= */

const BRAND_COLORS = {
    whatsapp: "#25D366",
    instagram: "#E1306C",
    tiktok: "#000000",
    facebook: "#1877F2",
    linkedin: "#0A66C2",
    twitter: "#000000",
    "x / twitter": "#000000",
    x: "#000000",
    email: "#EA4335",
    phone: "#25D366",
    call: "#25D366"
};

function brandColorFor(label) {
    const key = label.trim().toLowerCase();
    return BRAND_COLORS[key] || null;
}

function applyBrandIcons() {
    document.querySelectorAll(".social-link").forEach(link => {
        const label = link.textContent.trim();
        const color = brandColorFor(label);
        if (color) link.style.setProperty("--icon-brand", color);
    });

    document.querySelectorAll(".contact-method").forEach(method => {
        const label = method.querySelector("small")?.textContent || "";
        const color = brandColorFor(label);
        if (color) method.style.setProperty("--icon-brand", color);
    });
}

document.addEventListener("DOMContentLoaded", applyBrandIcons);

/* =========================================================
   CURSOR GLOW
   A soft light that follows the pointer — desktop/mouse only,
   skipped entirely on touch devices and for anyone who has
   asked their OS for reduced motion.
   ========================================================= */

function setupCursorGlow() {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduceMotion) return;

    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let renderedX = x;
    let renderedY = y;

    document.addEventListener("mousemove", event => {
        x = event.clientX;
        y = event.clientY;
        glow.style.opacity = "1";
    });

    document.addEventListener("mouseleave", () => {
        glow.style.opacity = "0";
    });

    function render() {
        renderedX += (x - renderedX) * 0.12;
        renderedY += (y - renderedY) * 0.12;
        glow.style.transform = `translate(${renderedX}px, ${renderedY}px)`;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

document.addEventListener("DOMContentLoaded", setupCursorGlow);

/* =========================================================
   HERO PARALLAX
   Subtle drift on the hero content as the visitor scrolls
   past it — throttled to one update per animation frame.
   ========================================================= */

function setupHeroParallax() {
    const hero = document.querySelector(".page-hero, .hero-content");
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;

    function update() {
        const rect = hero.getBoundingClientRect();
        const progress = Math.min(Math.max(-rect.top / (rect.height || 1), 0), 1);
        hero.style.transform = `translateY(${progress * 40}px)`;
        hero.style.opacity = String(1 - progress * 0.5);
        ticking = false;
    }

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
}

document.addEventListener("DOMContentLoaded", setupHeroParallax);

/* =========================================================
   DEMO VIDEO MODAL
   One shared modal, injected once, reused by every "Watch
   Demo" button on the page — including catalogue cards added
   after page load, since the click listener is delegated on
   document rather than bound per-button.
   ========================================================= */

function setupVideoModal() {
    if (document.querySelector(".video-modal")) return;

    const modal = document.createElement("div");
    modal.className = "video-modal hidden";
    modal.innerHTML = `
        <div class="video-modal-backdrop"></div>
        <div class="video-modal-content">
            <button type="button" class="video-modal-close" aria-label="Close video">&times;</button>
            <video controls playsinline></video>
        </div>
    `;
    document.body.appendChild(modal);

    const videoEl = modal.querySelector("video");

    function closeModal() {
        modal.classList.add("hidden");
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
    }

    modal.querySelector(".video-modal-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".video-modal-close").addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });

    document.addEventListener("click", event => {
        const trigger = event.target.closest(".watch-demo-btn");
        if (!trigger) return;
        const src = trigger.dataset.video;
        if (!src) return;
        videoEl.src = src;
        modal.classList.remove("hidden");
        videoEl.play().catch(() => { /* autoplay may be blocked; controls remain available */ });
    });
}

document.addEventListener("DOMContentLoaded", setupVideoModal);

/* =========================================================
   SITE PREVIEW MODAL
   Shows a product's live URL in an iframe inside the site
   instead of opening a new tab. Same delegated-click pattern
   as the video modal above.
   ========================================================= */

function setupSitePreviewModal() {
    if (document.querySelector(".site-preview-modal")) return;

    const modal = document.createElement("div");
    modal.className = "site-preview-modal hidden";
    modal.innerHTML = `
        <div class="site-preview-backdrop"></div>
        <div class="site-preview-content">
            <div class="site-preview-bar">
                <span class="site-preview-url"></span>
                <div class="site-preview-actions">
                    <a class="site-preview-open" href="#" target="_blank" rel="noopener">Open in new tab ↗</a>
                    <button type="button" class="site-preview-close" aria-label="Close preview">&times;</button>
                </div>
            </div>
            <iframe></iframe>
        </div>
    `;
    document.body.appendChild(modal);

    const iframe = modal.querySelector("iframe");
    const urlLabel = modal.querySelector(".site-preview-url");
    const openLink = modal.querySelector(".site-preview-open");

    function closeModal() {
        modal.classList.add("hidden");
        iframe.src = "about:blank";
    }

    modal.querySelector(".site-preview-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".site-preview-close").addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });

    document.addEventListener("click", event => {
        const trigger = event.target.closest(".view-live-btn");
        if (!trigger) return;
        const url = trigger.dataset.url;
        if (!url) return;
        iframe.src = url;
        urlLabel.textContent = url;
        openLink.href = url;
        modal.classList.remove("hidden");
    });
}

/* =========================================================
   PRODUCT DETAIL MODAL
   Tapping a catalogue card (anywhere except its buttons/links)
   opens a modal with the full product details. This is what
   lets card content stay compact on mobile - the full
   description isn't lost, it just moved into this view.
   ========================================================= */

function setupProductDetailModal() {
    if (document.querySelector(".product-detail-modal")) return;

    const modal = document.createElement("div");
    modal.className = "product-detail-modal hidden";
    modal.innerHTML = `
        <div class="product-detail-backdrop"></div>
        <div class="product-detail-content">
            <button type="button" class="product-detail-close" aria-label="Close">&times;</button>
            <div class="product-detail-image"></div>
            <div class="product-detail-body">
                <span class="product-detail-type"></span>
                <h3 class="product-detail-name"></h3>
                <strong class="product-detail-price"></strong>
                <p class="product-detail-description"></p>
                <div class="product-detail-actions"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    function closeModal() {
        modal.classList.add("hidden");
    }

    modal.querySelector(".product-detail-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".product-detail-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });

    document.addEventListener("click", event => {
        if (event.target.closest("a, button")) return;
        const card = event.target.closest(".catalogue-card");
        if (!card) return;

        const image = card.dataset.detailImage;
        modal.querySelector(".product-detail-image").innerHTML = image
            ? `<img src="${image}" alt="${card.dataset.detailName || ""}">`
            : "";
        modal.querySelector(".product-detail-type").textContent = card.dataset.detailType || "";
        modal.querySelector(".product-detail-name").textContent = card.dataset.detailName || "";
        modal.querySelector(".product-detail-price").textContent = card.dataset.detailPrice || "";
        modal.querySelector(".product-detail-description").textContent = card.dataset.detailDescription || "";

        const actionsSource = card.querySelector(".catalogue-card-actions");
        const actionsTarget = modal.querySelector(".product-detail-actions");
        actionsTarget.innerHTML = actionsSource ? actionsSource.innerHTML : "";

        modal.classList.remove("hidden");
    });
}

document.addEventListener("DOMContentLoaded", setupSitePreviewModal);

/* =========================================================
   WHATSAPP CHAT WIDGET
   A floating button + mini chat preview, present on every
   public page. Typing a message and hitting send opens
   WhatsApp with that message pre-filled — there's no real
   chat backend here, this is a lead-in to a real WhatsApp
   conversation, same pattern as most store chat widgets use.
   ========================================================= */

function setupWhatsAppWidget() {
    if (document.body.classList.contains("admin-page")) return;
    if (document.querySelector(".wa-widget")) return;

    const widget = document.createElement("div");
    widget.className = "wa-widget";
    widget.innerHTML = `
        <div class="wa-widget-panel hidden">
            <div class="wa-widget-header">
                <div class="wa-widget-avatar">
                    <img src="images/mars-tee-logo.png" alt="Mars Tee Studio">
                </div>
                <div class="wa-widget-header-text">
                    <strong>Mars Tee Studio</strong>
                    <span>Typically replies within 10 minutes</span>
                </div>
                <button type="button" class="wa-widget-close" aria-label="Close chat">&times;</button>
            </div>
            <div class="wa-widget-body">
                <div class="wa-widget-bubble">
                    Hi, welcome to Mars Tee Studio 👋 How can we help you today?
                    <span class="wa-widget-time"></span>
                </div>
            </div>
            <form class="wa-widget-input-row">
                <input type="text" placeholder="Type a message.." aria-label="Message" required>
                <button type="submit" aria-label="Send on WhatsApp">➤</button>
            </form>
        </div>
        <button type="button" class="wa-widget-toggle" aria-label="Chat on WhatsApp">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3.5A11.9 11.9 0 0 0 12.05 0C5.5 0 .17 5.32.17 11.88c0 2.1.55 4.15 1.6 5.96L.06 24l6.3-1.65a11.86 11.86 0 0 0 5.68 1.45h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.74.98 1-3.65-.24-.37a9.88 9.88 0 1 1 8.39 4.64Zm5.42-7.4c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.45s1.05 2.84 1.2 3.04c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.84.12.56-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35Z"/></svg>
        </button>
    `;
    document.body.appendChild(widget);

    const toggle = widget.querySelector(".wa-widget-toggle");
    const panel = widget.querySelector(".wa-widget-panel");
    const closeBtn = widget.querySelector(".wa-widget-close");
    const form = widget.querySelector(".wa-widget-input-row");
    const input = form.querySelector("input");
    const timeEl = widget.querySelector(".wa-widget-time");

    timeEl.textContent = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    function openPanel() {
        panel.classList.remove("hidden");
        toggle.classList.add("is-open");
        setTimeout(() => input.focus(), 150);
    }
    function closePanel() {
        panel.classList.add("hidden");
        toggle.classList.remove("is-open");
    }

    toggle.addEventListener("click", () => {
        panel.classList.contains("hidden") ? openPanel() : closePanel();
    });
    closeBtn.addEventListener("click", closePanel);

    form.addEventListener("submit", event => {
        event.preventDefault();
        const message = input.value.trim();
        if (!message) return;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
        input.value = "";
        closePanel();
    });
}

document.addEventListener("DOMContentLoaded", setupWhatsAppWidget);

/* =========================================================
   REVEAL-ON-INSERT
   The main reveal observer (below) only ever sees elements
   that exist when the page first loads. Catalogue cards and
   admin product cards are injected later, after a Supabase
   fetch, so without this they'd just appear instantly with
   no entrance animation. Call this after adding new cards.
   ========================================================= */

let sharedRevealObserver = null;

function observeReveal(elements) {
    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => element.classList.add("active"));
        return;
    }

    if (!sharedRevealObserver) {
        sharedRevealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("active");
                sharedRevealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.15 });
    }

    elements.forEach(element => sharedRevealObserver.observe(element));
}

/* =========================================================
   THEME + MOBILE NAV
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const body = document.body;
    const themeToggle = document.getElementById("themeToggle");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const THEME_STORAGE_KEY = "mts_theme";

    function applyTheme(isDark) {
        document.documentElement.classList.toggle("dark-theme", isDark);
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
        applyTheme(storedTheme === "dark");
    } else {
        applyTheme(systemTheme.matches);
    }

    themeToggle?.addEventListener("click", () => {
        const isDark = !document.documentElement.classList.contains("dark-theme");
        applyTheme(isDark);
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    });

    if (typeof systemTheme.addEventListener === "function") {
        systemTheme.addEventListener("change", event => {
            // Once the visitor has made an explicit choice, stop
            // following the OS setting so their choice sticks.
            if (!localStorage.getItem(THEME_STORAGE_KEY)) {
                applyTheme(event.matches);
            }
        });
    }

    const menuToggle = document.querySelector(".menu-toggle");
    const mainNav = document.querySelector(".main-nav");

    if (menuToggle && mainNav) {
        menuToggle.addEventListener("click", () => {
            const open = mainNav.classList.toggle("mobile-open");
            menuToggle.classList.toggle("active", open);
            menuToggle.setAttribute("aria-expanded", String(open));
        });

        mainNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mainNav.classList.remove("mobile-open");
                menuToggle.classList.remove("active");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    /* Existing site reveal system */
    const revealElements = document.querySelectorAll(
        ".reveal, .reveal-left, .reveal-right, .reveal-scale"
    );
    observeReveal([...revealElements]);
});

/* =========================================================
   CATALOGUE
   ========================================================= */

function getProductCategory(product) {
    const type = String(product.project_type || "").toLowerCase();

    if (type === "website") return "web";
    return "digital";
}

function getProductTier(product) {
    return String(product.package || product.Package || "").toLowerCase();
}

/* =========================================================
   FIXED TIER PRICING
   Every product's displayed price comes from here, based on
   its category + package — not from whatever was typed into
   the Price field in Supabase. This keeps pricing consistent
   automatically: change a number here and it updates every
   product in that tier at once, no per-product editing needed.
   Luxury has no ceiling, so it displays as "From ₦X" using
   this floor value rather than a flat price.
   ========================================================= */

const TIER_PRICING = {
    web: { basic: 60000, standard: 130000, premium: 300000, luxury: 750000 },
    digital: { basic: 15000, standard: 30000, premium: 60000, luxury: 150000 }
};

// Some tiers are genuinely priced as ranges/open-ended rather than
// a flat number - those show "From ₦X" using the floor of the range.
const FROM_PRICE_TIERS = {
    web: { luxury: true },
    digital: { basic: true, standard: true, premium: true, luxury: true }
};

function getTierPrice(category, tier) {
    return TIER_PRICING[category]?.[tier];
}

async function getProductImage(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(String(path))) return String(path);
    if (!siteSupabaseClient) return "";

    const cleanPath = String(path).replace(/^\/+/, "");

    try {
        const { data } = siteSupabaseClient.storage
            .from(PRODUCT_BUCKET)
            .getPublicUrl(cleanPath);

        return data?.publicUrl || "";
    } catch (error) {
        console.warn("Mars Tee Studio: product image URL error.", error);
        return "";
    }
}

async function loadCatalogueProducts() {
    const grid = document.querySelector(".catalogue-grid");
    if (!grid || !siteSupabaseClient) return;

    const showAll = new URLSearchParams(location.search).get("view") === "all";
    const PREVIEW_COUNT = 6;

    showGridLoading(grid, 3);

    try {
        const { data, error } = await siteSupabaseClient
            .from("Product")
            .select("*")
            .eq("Is_active", true);

        if (error) throw error;

        if (!data?.length) {
            restoreGridEmpty(grid);
            return;
        }

        const controls = document.querySelectorAll(".catalogue-controls, .catalogue-package-filter");
        const visibleData = showAll ? data : data.slice(0, PREVIEW_COUNT);

        if (!showAll) {
            controls.forEach(el => el.style.display = "none");
        }

        const products = await Promise.all(visibleData.map(async product => {
            const image = await getProductImage(
                product.Image_url || product.front_image_url || ""
            );

            const type = String(product.project_type || "Custom Service");
            const category = getProductCategory(product);
            const tier = getProductTier(product);
            const fixedPrice = getTierPrice(category, tier);
            const price = fixedPrice !== undefined ? fixedPrice : Number(product.Price);
            const priceHasValue = Number.isFinite(price) &&
                (fixedPrice !== undefined || (product.Price !== null && product.Price !== undefined));
            const pricePrefix = FROM_PRICE_TIERS[category]?.[tier] ? "From " : "";

            const demoVideoUrl = product.demo_video_url || "";
            const liveUrl = product.website_url || "";
            let demoButton = "";
            if (demoVideoUrl) {
                demoButton = `<button type="button" class="button button-secondary watch-demo-btn" data-video="${escapeHtml(demoVideoUrl)}">▶ Watch Demo</button>`;
            } else if (liveUrl) {
                demoButton = `<button type="button" class="button button-secondary view-live-btn" data-url="${escapeHtml(liveUrl)}">View Live Demo ↗</button>`;
            }

            const productName = product.Name || "Untitled Service";
            const whatsappMessage = encodeURIComponent(`Hi Mars Tee Studio, I'd like to ask about "${productName}".`);

            return `
                <article
                    class="catalogue-card reveal-scale"
                    data-category="${escapeHtml(category)}"
                    data-tier="${escapeHtml(tier)}"
                    data-price="${Number.isFinite(price) ? price : 0}"
                    data-featured="${product.is_featured ? "true" : "false"}"
                    data-rating="${Number(product.rating) || 0}"
                    data-detail-name="${escapeHtml(productName)}"
                    data-detail-description="${escapeHtml(product.Description || "")}"
                    data-detail-image="${escapeHtml(image || "")}"
                    data-detail-type="${escapeHtml(type.toUpperCase())}"
                    data-detail-price="${priceHasValue ? `${pricePrefix}${formatPrice(price)}` : ""}"
                >                    <div class="catalogue-image">
                        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName)}" loading="lazy">` : ""}
                    </div>
                    <div class="catalogue-info">
                        <span class="section-label">${escapeHtml(type.toUpperCase())}</span>
                        <h3>${escapeHtml(productName)}</h3>
                        <p>${escapeHtml(product.Description || "")}</p>
                        ${priceHasValue ? `<strong class="price-display" data-price-ngn="${price}" data-price-prefix="${pricePrefix}">${pricePrefix}${formatPrice(price)}</strong>` : ""}
                        <div class="catalogue-card-actions">
                            ${demoButton}
                            ${priceHasValue ? `<button type="button" class="button button-primary add-to-cart-btn" data-id="${escapeHtml(String(product.id))}" data-name="${escapeHtml(productName)}" data-price="${price}" data-image="${escapeHtml(image || "")}">Add to Cart</button>` : ""}
                            <a href="https://wa.me/2349124147362?text=${whatsappMessage}" target="_blank" rel="noopener" class="button button-secondary cart-chat-btn">Chat on WhatsApp</a>
                        </div>
                    </div>
                </article>
            `;
        }));

        grid.innerHTML = products.join("");
        observeReveal([...grid.querySelectorAll(".catalogue-card")]);

        if (!showAll && data.length > PREVIEW_COUNT) {
            grid.insertAdjacentHTML("afterend", `
                <div class="see-more-wrap">
                    <a href="catalogue.html?view=all" class="button button-secondary">See More Products →</a>
                </div>
            `);
        }

        initialiseCatalogueControls();
        setupProductDetailModal();

    } catch (error) {
        console.error("Catalogue error:", error);
        showGridError(grid, loadCatalogueProducts);
    }
}

function initialiseCatalogueControls() {
    const grid = document.querySelector(".catalogue-grid");
    if (!grid) return;

    const categoryButtons = document.querySelectorAll(".filter-button");
    const tierButtons = document.querySelectorAll(".tier-button");
    const sortSelect = document.getElementById("catalogueSort");

    let activeCategory = "all";
    let activeTier = "all";

    function applyFilters() {
        const cards = [...grid.querySelectorAll(".catalogue-card")];

        cards.forEach(card => {
            const category = card.dataset.category || "";
            const tier = card.dataset.tier || "";

            const categoryMatch =
                activeCategory === "all" || category === activeCategory;

            const tierMatch =
                activeTier === "all" || tier === activeTier.toLowerCase();

            card.hidden = !(categoryMatch && tierMatch);
        });
    }

    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            categoryButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            const value = button.dataset.filter || "all";
            const map = {
                "all": "all",
                "Websites": "web",
                "Digital Experiences": "digital"
            };

            activeCategory = map[value] || "all";
            applyFilters();
        });
    });

    tierButtons.forEach(button => {
        button.addEventListener("click", () => {
            tierButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            activeTier = button.dataset.tier || "all";
            applyFilters();
        });
    });

    sortSelect?.addEventListener("change", () => {
        const cards = [...grid.querySelectorAll(".catalogue-card")];
        const value = sortSelect.value;

        cards.sort((a, b) => {
            if (value === "price-low") {
                return Number(a.dataset.price) - Number(b.dataset.price);
            }
            if (value === "price-high") {
                return Number(b.dataset.price) - Number(a.dataset.price);
            }
            if (value === "rating") {
                return Number(b.dataset.rating) - Number(a.dataset.rating);
            }
            return Number(b.dataset.featured === "true") - Number(a.dataset.featured === "true");
        });

        cards.forEach(card => grid.appendChild(card));
        applyFilters();
    });

    applyFilters();
}

loadCatalogueProducts();

/* =========================================================
   PORTFOLIO — uses the same safe client as Catalogue
   ========================================================= */

async function getPortfolioImage(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(String(path))) return String(path);
    if (!siteSupabaseClient) return "";

    const cleanPath = String(path).replace(/^\/+/, "");

    try {
        const { data } = siteSupabaseClient.storage
            .from(PRODUCT_BUCKET)
            .getPublicUrl(cleanPath);
        return data?.publicUrl || "";
    } catch (error) {
        console.warn("Mars Tee Studio: portfolio image URL error.", error);
        return "";
    }
}

async function loadReviews() {
    const grid = document.getElementById("reviewsList");
    const summaryEl = document.getElementById("reviewsSummary");
    if (!grid || !siteSupabaseClient) return;

    showGridLoading(grid, 3);

    try {
        const { data, error } = await siteSupabaseClient
            .from("Review")
            .select("*")
            .eq("is_approved", true)
            .order("created_at", { ascending: false });

        if (error) throw error;
        if (!data?.length) {
            restoreGridEmpty(grid);
            if (summaryEl) summaryEl.innerHTML = "";
            return;
        }

        if (summaryEl) {
            const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
            const avgRounded = Math.round(avg * 10) / 10;
            const fullStars = Math.round(avg);
            const summaryStars = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
            summaryEl.innerHTML = `
                <span class="reviews-summary-score">${avgRounded.toFixed(1)}</span>
                <div class="reviews-summary-detail">
                    <div class="reviews-summary-stars">${summaryStars}</div>
                    <span>Based on ${data.length} review${data.length === 1 ? "" : "s"}</span>
                </div>
            `;
        }

        const AVATAR_COLORS = ["#0b63f6", "#e0473e", "#1a9c6b", "#c9750c", "#7b4fd6", "#0aa1a8"];

        const cards = data.map(review => {
            const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
            const date = review.created_at
                ? new Date(review.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : "";
            const name = review.name || "Anonymous";
            const initial = name.trim().charAt(0).toUpperCase() || "?";
            const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;
            const avatarColor = AVATAR_COLORS[colorIndex] || AVATAR_COLORS[0];

            return `
                <article class="review-card reveal-scale">
                    <div class="review-card-top">
                        <span class="review-avatar" style="background:${avatarColor}">${escapeHtml(initial)}</span>
                        <div class="review-author">
                            <strong>${escapeHtml(name)}</strong>
                            <span>${escapeHtml(review.service || "")}${review.service && date ? " · " : ""}${escapeHtml(date)}</span>
                        </div>
                    </div>
                    <div class="review-rating">${stars}</div>
                    <p class="review-message">${escapeHtml(review.message || "")}</p>
                </article>
            `;
        });

        grid.innerHTML = cards.join("");
        observeReveal([...grid.querySelectorAll(".review-card")]);

    } catch (error) {
        console.error("Reviews error:", error);
        showGridError(grid, loadReviews);
        if (summaryEl) summaryEl.innerHTML = "";
    }
}

document.addEventListener("DOMContentLoaded", loadReviews);

async function loadPortfolioProducts() {
    const grid = document.querySelector(".portfolio-grid");
    if (!grid || !siteSupabaseClient) return;

    const showAll = new URLSearchParams(location.search).get("view") === "all";
    const PREVIEW_COUNT = 6;

    showGridLoading(grid, 3);

    try {
        const { data, error } = await siteSupabaseClient
            .from("Product")
            .select("*")
            .eq("Is_active", true);

        if (error) throw error;
        if (!data?.length) {
            restoreGridEmpty(grid);
            return;
        }

        const portfolioFilterRow = document.querySelector(".portfolio-filters");
        const visibleData = showAll ? data : data.slice(0, PREVIEW_COUNT);

        if (!showAll && portfolioFilterRow) {
            portfolioFilterRow.style.display = "none";
        }

        const products = await Promise.all(visibleData.map(async product => {
            const image = await getPortfolioImage(
                product.Image_url || product.front_image_url || ""
            );

            const type = String(product.project_type || "").toLowerCase();
            const category = getProductCategory(product);
            const labels = {
                web: "WEB DEVELOPMENT",
                digital: "DIGITAL EXPERIENCE"
            };

            const demoVideoUrl = product.demo_video_url || "";
            const demoButton = demoVideoUrl
                ? `<button type="button" class="button button-secondary watch-demo-btn" data-video="${escapeHtml(demoVideoUrl)}">▶ Watch Demo</button>`
                : "";

            return `
                <article class="portfolio-card reveal-scale" data-category="${escapeHtml(category)}">
                    <div class="portfolio-visual">
                        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.Name || "Project")}" loading="lazy">` : ""}
                    </div>
                    <div class="portfolio-info">
                        <span>${labels[category] || type.toUpperCase()}</span>
                        <h3>${escapeHtml(product.Name || "Untitled Project")}</h3>
                        <p>${escapeHtml(product.Description || "")}</p>
                        ${demoButton}
                    </div>
                </article>
            `;
        }));

        grid.innerHTML = products.join("");
        observeReveal([...grid.querySelectorAll(".portfolio-card")]);

        if (!showAll && data.length > PREVIEW_COUNT) {
            grid.insertAdjacentHTML("afterend", `
                <div class="see-more-wrap">
                    <a href="portfolio.html?view=all" class="button button-secondary">See More Work →</a>
                </div>
            `);
        } else {
            setupPortfolioFilters();
        }
    } catch (error) {
        console.error("Portfolio error:", error);
        showGridError(grid, loadPortfolioProducts);
    }
}

function setupPortfolioFilters() {
    const buttons = document.querySelectorAll(".portfolio-filter");
    const cards = document.querySelectorAll(".portfolio-card");

    buttons.forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            const filter = button.dataset.portfolioFilter || "all";

            buttons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            cards.forEach(card => {
                card.style.display =
                    filter === "all" || card.dataset.category === filter
                        ? ""
                        : "none";
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", setupPortfolioFilters);
loadPortfolioProducts();

/* =========================================================
   IMAGE VIEWER
   ========================================================= */

document.addEventListener("click", event => {
    const img = event.target.closest(".catalogue-card img, .portfolio-card img");
    if (!img) return;

    const viewer = document.createElement("div");
    viewer.className = "image-viewer";
    viewer.innerHTML = `
        <button class="image-viewer-close" aria-label="Close image viewer">×</button>
        <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || "")}">
    `;

    document.body.appendChild(viewer);

    viewer.addEventListener("click", event => {
        if (event.target === viewer || event.target.classList.contains("image-viewer-close")) {
            viewer.remove();
        }
    });
});

/* Cinematic intro logic now lives in js/intro.js */

/* =========================================================
   HOMEPAGE PREMIUM SCROLL REVEALS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll(
        ".intro-section, .services-preview, .featured-work-section, .process-preview, .home-cta"
    );

    const staggerGroups = document.querySelectorAll(
        ".services-grid .service-card, .featured-work-grid .work-card, .process-grid .process-step"
    );

    if (!("IntersectionObserver" in window)) {
        sections.forEach(section => section.classList.add("is-visible"));
        staggerGroups.forEach(item => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    sections.forEach(section => {
        section.classList.add("home-scroll-reveal");
        observer.observe(section);
    });

    staggerGroups.forEach(item => {
        item.classList.add("home-scroll-stagger");
        observer.observe(item);
    });
});

/* =========================================================
   CONTACT FORM — EMAILJS + WHATSAPP DELIVERY
   Submitting sends the enquiry to Gmail via EmailJS
   automatically, then opens a pre-filled WhatsApp message to
   the business number for the customer to send as a second,
   optional channel. Only runs where the EmailJS SDK is
   actually loaded (contact.html) — every other page that
   shares this script simply skips it.
   ========================================================= */

const EMAILJS_SERVICE_ID = "service_15ay3dd";
const EMAILJS_TEMPLATE_ID = "template_91i42c8";
const EMAILJS_PUBLIC_KEY = "aUIqFhKJXEPEKGVKd";
const WHATSAPP_NUMBER = "2349124147362";

if (typeof emailjs !== "undefined") {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById("contactForm");
    const reviewForm = document.getElementById("reviewForm");

    // Safety net: this form has no type="submit" button anymore, but if
    // anything ever triggers a native submit, don't let it reload the page.
    contactForm?.addEventListener("submit", event => event.preventDefault());

    function getContactFields() {
        return {
            name: contactForm.querySelector("#contactName")?.value.trim() || "",
            email: contactForm.querySelector("#contactEmail")?.value.trim() || "",
            service: contactForm.querySelector('input[name="service"]:checked')?.value || "",
            budget: contactForm.querySelector('input[name="budget"]:checked')?.value || "Not specified",
            message: contactForm.querySelector("#contactMessage")?.value.trim() || ""
        };
    }

    function showContactStatus(message, isError) {
        const status = document.getElementById("contactFormStatus");
        if (!status) return;
        status.className = `form-status ${isError ? "error-message" : "success-message"}`;
        status.textContent = message;
    }

    const whatsappBtn = document.getElementById("sendWhatsappBtn");
    const emailBtn = document.getElementById("sendEmailBtn");

    whatsappBtn?.addEventListener("click", () => {
        if (!contactForm.reportValidity()) return;

        const { name, email, service, budget, message } = getContactFields();
        const whatsappText = `New enquiry from ${name}\nEmail: ${email}\nService: ${service}\nBudget: ${budget}\n\n${message}`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`, "_blank");

        showContactStatus("WhatsApp is opening in a new tab — just hit send there.", false);
    });

    emailBtn?.addEventListener("click", () => {
        if (!contactForm.reportValidity()) return;

        const { name, email, service, budget, message } = getContactFields();

        const originalText = emailBtn.textContent;
        emailBtn.disabled = true;
        emailBtn.textContent = "Sending...";
        showContactStatus("", false);

        if (typeof emailjs === "undefined") {
            showContactStatus("Email isn't fully set up yet — please use WhatsApp instead.", true);
            emailBtn.disabled = false;
            emailBtn.textContent = originalText;
            return;
        }

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { name, email, service, budget, message })
            .then(() => {
                showContactStatus("Thanks! Your enquiry has been emailed to us — we'll be in touch soon.", false);
                contactForm.reset();
            })
            .catch(error => {
                console.error("EmailJS error:", error);
                showContactStatus("Something went wrong sending that email. Please try WhatsApp instead.", true);
            })
            .finally(() => {
                emailBtn.disabled = false;
                emailBtn.textContent = originalText;
            });
    });

    reviewForm?.addEventListener("submit", event => {
        event.preventDefault();

        const status = document.getElementById("reviewFormStatus");
        if (!status) return;

        const name = reviewForm.querySelector("#reviewName")?.value.trim() || "";
        const email = reviewForm.querySelector("#reviewEmail")?.value.trim() || "";
        const service = reviewForm.querySelector("#reviewService")?.value || "";
        const rating = Number(reviewForm.querySelector('input[name="rating"]:checked')?.value) || null;
        const message = reviewForm.querySelector("#reviewMessage")?.value.trim() || "";

        if (!siteSupabaseClient) {
            status.className = "form-status error-message";
            status.textContent = "Reviews aren't set up yet — please try again later.";
            return;
        }

        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting...";
        }
        status.className = "form-status";
        status.textContent = "";

        siteSupabaseClient
            .from("Review")
            .insert({ name, email, service, rating, message, is_approved: true })
            .then(({ error }) => {
                if (error) throw error;
                status.className = "form-status success-message";
                status.textContent = "Thank you! Your review has been published.";
                reviewForm.reset();
                if (typeof loadReviews === "function") loadReviews();
            })
            .catch(error => {
                console.error("Review submit error:", error);
                status.className = "form-status error-message";
                status.textContent = "Something went wrong submitting your review. Please try again.";
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
    });
});

window.addEventListener("load", () => {
    document.body.classList.add("fully-loaded");
    document.documentElement.classList.add("js-ready");
});

/* =========================================================
   HOMEPAGE HERO SLIDER
   Guarded by #heroSlider so this is a no-op on every page
   except the homepage.
   ========================================================= */

function setupHeroSlider() {
    const slider = document.getElementById("heroSlider");
    if (!slider) return;

    const slides = [...slider.querySelectorAll(".hero-slide")];
    const dots = [...slider.querySelectorAll(".hero-slider-dot")];
    const prevBtn = slider.querySelector(".hero-slider-prev");
    const nextBtn = slider.querySelector(".hero-slider-next");
    if (slides.length < 2) return;

    let current = 0;
    let autoTimer = null;

    function show(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle("is-active", i === current));
        dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
    }

    function startAuto() {
        stopAuto();
        autoTimer = setInterval(() => show(current + 1), 6000);
    }
    function stopAuto() {
        if (autoTimer) clearInterval(autoTimer);
    }

    prevBtn?.addEventListener("click", () => { show(current - 1); startAuto(); });
    nextBtn?.addEventListener("click", () => { show(current + 1); startAuto(); });
    dots.forEach((dot, i) => dot.addEventListener("click", () => { show(i); startAuto(); }));

    show(0);
    startAuto();
}

document.addEventListener("DOMContentLoaded", setupHeroSlider);

/* =========================================================
   CINEMATIC INTRO
   Homepage-only logo reveal. Present only on index.html, so
   this is a no-op (and costs nothing) on every other page.

   - Plays once per browser session (repeat visits/reloads
     within the same session skip straight to the homepage).
   - Skippable by tapping/clicking anywhere on the overlay.
   - Skipped entirely for prefers-reduced-motion.
   ========================================================= */

window.addEventListener("load", () => {
    const intro = document.getElementById("cinematicIntro");
    if (!intro) return;

    const INTRO_KEY = "mts_intro_played";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyPlayed = sessionStorage.getItem(INTRO_KEY) === "1";

    if (reduceMotion || alreadyPlayed) {
        intro.remove();
        return;
    }

    let done = false;
    function endIntro() {
        if (done) return;
        done = true;
        sessionStorage.setItem(INTRO_KEY, "1");
        intro.classList.add("is-hidden");
        setTimeout(() => intro.remove(), 700);
    }

    intro.addEventListener("click", endIntro);
    setTimeout(endIntro, 4900);
});

console.log("%cMars Tee Studio", "font-size:22px;font-weight:800;color:#2563eb;");
console.log("%cDigital experiences. Premium design. Built to impress.", "font-size:12px;color:#64748b;");
