(function () {
    "use strict";

    /* IMPORTANT: replace this with your real Paystack public key
       (Paystack Dashboard -> Settings -> API Keys & Webhooks).
       Use the TEST key while trying this out, switch to the LIVE
       key only once you're ready to accept real payments. */
    const PAYSTACK_PUBLIC_KEY = "pk_test_1afc4d70e6acbfbf33bf070a20f9483c758eeb77";

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
                <span class="checkout-item-name">${item.name} <span class="checkout-item-qty">× ${item.qty}</span></span>
                <span class="checkout-item-price">${formatNaira(item.price * item.qty)}</span>
            </div>
        `).join("");

        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        totalEl.textContent = formatNaira(total);
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

    async function saveOrder(cart, values, reference, total) {
        const supabase = typeof siteSupabaseClient !== "undefined" ? siteSupabaseClient : null;
        if (!supabase) return null; // order still succeeded with Paystack - just isn't recorded on our side

        // Generated client-side rather than read back via .select() - a guest
        // order has no login, so it wouldn't pass the SELECT policy needed to
        // read the row back after inserting it (RETURNING is subject to RLS too).
        const orderId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;

        try {
            const { error } = await supabase.from("Order").insert({
                id: orderId || undefined,
                user_id: currentUser ? currentUser.id : null,
                customer_name: values.name,
                customer_email: values.email,
                customer_phone: values.phone,
                items: cart,
                total_amount: total,
                paystack_reference: reference,
                status: "pending"
            });

            if (error) return null;
            return orderId;
        } catch {
            // Payment already succeeded with Paystack - a failed order record
            // shouldn't block the success message the customer sees.
            return null;
        }
    }

    async function verifyPayment(reference, orderId) {
        if (!orderId) return; // no order row to reconcile against - skip quietly
        try {
            await fetch(VERIFY_PAYMENT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference, orderId })
            });
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

        payButton.addEventListener("click", () => {
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

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: values.email,
                amount: Math.round(total * 100), // Paystack expects kobo
                currency: "NGN",
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
                        const orderId = await saveOrder(cart, values, response.reference, total);
                        verifyPayment(response.reference, orderId); // fire-and-forget - see comment above
                        if (typeof saveCart === "function") saveCart([]);
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
                    // user closed the payment popup without paying - nothing to do
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

    document.addEventListener("DOMContentLoaded", () => {
        renderSummary();
        setupPaystackButton();
        setupWhatsAppOrderButton();
        checkLoginState();
    });
})();
