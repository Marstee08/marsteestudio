(function () {
    "use strict";

    /* IMPORTANT: replace this with your real Paystack public key
       (Paystack Dashboard -> Settings -> API Keys & Webhooks).
       Use the TEST key while trying this out, switch to the LIVE
       key only once you're ready to accept real payments. */
    const PAYSTACK_PUBLIC_KEY = "pk_live_5b5d0c72810d9ccf276896f1f61f8dacf54ff282";

    function formatNaira(amount) {
        return "₦" + Math.round(amount).toLocaleString("en-NG");
    }

    function renderSummary() {
        const cart = typeof getCart === "function" ? getCart() : [];
        const itemsEl = document.getElementById("checkoutItems");
        const totalEl = document.getElementById("checkoutTotal");
        if (!itemsEl || !totalEl) return cart;

        if (!cart.length) {
            itemsEl.innerHTML = `<p class="checkout-empty">Your cart is empty. <a href="catalogue.html">Browse the catalogue</a> to add something first.</p>`;
            totalEl.textContent = formatNaira(0);
            const payBtn = document.getElementById("payButton");
            const waBtn = document.getElementById("whatsappOrderButton");
            if (payBtn) payBtn.disabled = true;
            if (waBtn) waBtn.disabled = true;
            return cart;
        }

        itemsEl.innerHTML = cart.map(item => `
            <div class="checkout-item">
                ${item.image ? `<img class="checkout-item-thumb" src="${item.image}" alt="">` : ""}
                <span class="checkout-item-name">${item.name} <span class="checkout-item-qty">× ${item.qty}</span></span>
                <span class="checkout-item-price">${formatNaira(item.price * item.qty)}</span>
            </div>
        `).join("");

        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        totalEl.textContent = formatNaira(total);
        const localEl = document.getElementById("checkoutTotalLocal");
        if (localEl) {
            const local = typeof cartTotalInActiveCurrency === "function" ? cartTotalInActiveCurrency() : "";
            localEl.hidden = !local;
            localEl.textContent = local ? `${local} (the price you saw), charged as ${formatNaira(total)}` : "";
        }
        return cart;
    }

    let currentUser = null; // set by checkLoginState() if the shopper is logged in

    function getFormValues() {
        return {
            name: document.getElementById("checkoutName")?.value.trim() || "",
            email: document.getElementById("checkoutEmail")?.value.trim() || "",
            phone: document.getElementById("checkoutPhone")?.value.trim() || "",
            notes: document.getElementById("checkoutAddress")?.value.trim() || ""
        };
    }

    async function checkLoginState() {
        const supabase = typeof siteSupabaseClient !== "undefined" ? siteSupabaseClient : null;
        if (!supabase) return;

        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        currentUser = data.session.user;
        const nameField = document.getElementById("checkoutName");
        const emailField = document.getElementById("checkoutEmail");
        if (nameField && !nameField.value) nameField.value = currentUser.user_metadata?.full_name || "";
        if (emailField && !emailField.value) emailField.value = currentUser.email || "";

        const banner = document.getElementById("checkoutLoginBanner");
        if (banner) {
            banner.innerHTML = `Checking out as <strong>${currentUser.email}</strong> - orders will be saved to your account. <a href="account.html">Not you?</a>`;
            banner.classList.remove("is-hidden");
        }
    }

    const VERIFY_PAYMENT_URL = "https://iggffzkopskzzemuksay.supabase.co/functions/v1/verify-payment";

    function makeUuid() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
            const r = Math.random() * 16 | 0;
            return (ch === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // Saved BEFORE the payment popup opens (status "pending"). The database
    // refuses the order if any price is below the real price, so a tampered
    // cart can never reach the payment step. Because the order and its
    // reference already exist, Paystack's webhook can mark it paid even if
    // the customer closes their browser right after paying.
    async function saveOrder(cart, values, reference, total) {
        const supabase = typeof siteSupabaseClient !== "undefined" ? siteSupabaseClient : null;
        if (!supabase) return { id: null, error: "We couldn't reach our server. Please check your connection and try again." };

        // Generated client-side rather than read back via .select() - a guest
        // order has no login, so it wouldn't pass the SELECT policy needed to
        // read the row back after inserting it (RETURNING is subject to RLS too).
        const orderId = makeUuid();

        try {
            const { error } = await supabase.from("Order").insert({
                id: orderId,
                user_id: currentUser ? currentUser.id : null,
                customer_name: values.name,
                customer_email: values.email,
                customer_phone: values.phone,
                items: cart,
                total_amount: total,
                paystack_reference: reference,
                status: "pending"
            });

            if (error) return { id: null, error: error.message || "We couldn't start your order.", rejected: error.code === "P0001" };
            return { id: orderId, error: null };
        } catch (e) {
            return { id: null, error: "We couldn't start your order. Please try again." };
        }
    }

    async function verifyPayment(reference, orderId) {
        if (!orderId) return; // no order row to reconcile against - skip quietly
        try {
            const res = await fetch(VERIFY_PAYMENT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference, orderId })
            });
            const result = await res.json().catch(() => ({}));
            if (!result.verified) console.warn("Payment confirmation pending:", result);
        } catch {
            // Server-side confirmation is a defense-in-depth check, not something
            // that should block the customer's success screen if it hiccups -
            // the order still sits recorded as "pending" for manual follow-up.
        }
    }

    function validateForm(values) {
        if (!values.name || !values.email || !values.phone) {
            alert("Please fill in your name, email, and phone number before continuing.");
            return false;
        }
        return true;
    }

    function setupPaystackButton() {
        const payButton = document.getElementById("payButton");
        if (!payButton) return;

        payButton.addEventListener("click", async () => {
            const cart = typeof getCart === "function" ? getCart() : [];
            if (!cart.length) {
                alert("Your cart looks empty. Please add something from the catalogue before checking out.");
                return;
            }

            const values = getFormValues();
            if (!validateForm(values)) return;

            if (typeof PAYSTACK_PUBLIC_KEY === "undefined" || PAYSTACK_PUBLIC_KEY.includes("REPLACE_WITH")) {
                alert("Online payment isn't fully set up yet - please use the WhatsApp option below, or contact us directly.");
                return;
            }

            const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

            const label = payButton.textContent;
            payButton.disabled = true;
            payButton.textContent = "Preparing your payment…";

            const reference = "MTS-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
            const saved = await saveOrder(cart, values, reference, total);

            if (saved.error) {
                payButton.disabled = false;
                payButton.textContent = label;
                alert(saved.error);
                if (saved.rejected && typeof saveCart === "function") {
                    saveCart([]);          // stale prices: start the cart fresh
                    renderSummary();
                }
                return;
            }
            const orderId = saved.id;

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: values.email,
                amount: Math.round(total * 100), // Paystack expects kobo
                currency: "NGN",
                ref: reference,
                metadata: {
                    custom_fields: [
                        { display_name: "Name", variable_name: "name", value: values.name },
                        { display_name: "Phone", variable_name: "phone", value: values.phone },
                        { display_name: "Notes", variable_name: "notes", value: values.notes },
                        { display_name: "Order", variable_name: "order", value: cart.map(i => `${i.name} x${i.qty}`).join(", ") }
                    ]
                },
                // NOTE: this is written as a plain function (not `async function`)
                // on purpose - Paystack's own inline.js does its own runtime check
                // on this value and, on at least some versions, rejects an async
                // function with "Attribute callback must be a valid function" even
                // though it's completely valid JS. Wrapping the async work in an
                // inner IIFE sidesteps that check entirely.
                callback: function (response) {
                    (async () => {
                        verifyPayment(response.reference, orderId); // marks the order paid; the webhook is the backup
                        if (typeof saveCart === "function") saveCart([]);
                        const actionsBox = document.getElementById("checkoutActions"); if (actionsBox) actionsBox.hidden = true;
                        document.getElementById("checkoutForm").innerHTML = `
                            <div class="checkout-success">
                                <h3>Payment received - thank you!</h3>
                                <p>Reference: ${response.reference}</p>
                                <p>We'll reach out shortly to confirm your order details. You can also message us directly on WhatsApp if you'd like to speak now.</p>
                                <a href="https://wa.me/2349124147362" class="button button-primary">Chat With Us →</a>
                            </div>
                        `;
                    })();
                },
                onClose: function () {
                    // closed without paying: let them try again
                    payButton.disabled = false;
                    payButton.textContent = label;
                }
            });
            handler.openIframe();
        });
    }

    function setupWhatsAppOrderButton() {
        const waButton = document.getElementById("whatsappOrderButton");
        if (!waButton) return;

        waButton.addEventListener("click", () => {
            const cart = typeof getCart === "function" ? getCart() : [];
            if (!cart.length) return;

            const values = getFormValues();
            if (!validateForm(values)) return;

            const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
            const lines = [
                `Hi Mars Tee Studio, I'd like to place an order:`,
                ``,
                ...cart.map(i => `- ${i.name} x${i.qty} (${formatNaira(i.price * i.qty)})`),
                ``,
                `Total: ${formatNaira(total)}`,
                ``,
                `Name: ${values.name}`,
                `Phone: ${values.phone}`,
                values.notes ? `Notes: ${values.notes}` : ""
            ].filter(Boolean);

            const message = encodeURIComponent(lines.join("\n"));
            window.open(`https://wa.me/2349124147362?text=${message}`, "_blank");
        });
    }

    function setupPaymentPlanButton() {
        const planButton = document.getElementById("paymentPlanButton");
        if (!planButton) return;

        planButton.addEventListener("click", () => {
            const cart = typeof getCart === "function" ? getCart() : [];
            if (!cart.length) return;

            const values = getFormValues();
            const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
            const lines = [
                "Hi Mars Tee Studio, I'd like to ask about paying in installments for this order:",
                "",
                ...cart.map(i => `- ${i.name} x${i.qty} (${formatNaira(i.price * i.qty)})`),
                "",
                `Total: ${formatNaira(total)}`,
                values.name ? `Name: ${values.name}` : "",
                values.phone ? `Phone: ${values.phone}` : ""
            ].filter(Boolean);

            window.open(`https://wa.me/2349124147362?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupPaymentPlanButton();
        renderSummary();
        document.addEventListener("mts-prices-changed", renderSummary);
        setupPaystackButton();
        setupWhatsAppOrderButton();
        checkLoginState();
    });
})();
