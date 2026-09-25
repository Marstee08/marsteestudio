(function () {
    "use strict";

    function client() {
        return typeof siteSupabaseClient !== "undefined" ? siteSupabaseClient : null;
    }

    function showAuthArea() {
        document.getElementById("authArea")?.classList.remove("is-hidden");
        document.getElementById("accountArea")?.classList.add("is-hidden");
        showSignupView(); // reset to the default (signup-first) view for next time
    }

    function showAccountArea(user) {
        document.getElementById("authArea")?.classList.add("is-hidden");
        document.getElementById("accountArea")?.classList.remove("is-hidden");
        const nameEl = document.getElementById("accountName");
        const emailEl = document.getElementById("accountEmail");
        const name = user?.user_metadata?.full_name;
        if (nameEl) nameEl.textContent = name ? `Hi, ${name}` : "Welcome back";
        if (emailEl) emailEl.textContent = user?.email || "";
        loadOrders();
    }

    function showSignupView() {
        document.getElementById("signupView")?.classList.remove("is-hidden");
        document.getElementById("loginView")?.classList.add("is-hidden");
    }

    function showLoginView() {
        document.getElementById("loginView")?.classList.remove("is-hidden");
        document.getElementById("signupView")?.classList.add("is-hidden");
    }

    function setupViewSwitching() {
        document.getElementById("showLoginBtn")?.addEventListener("click", showLoginView);
        document.getElementById("showSignupBtn")?.addEventListener("click", showSignupView);
    }

    async function signInWithGoogle() {
        const supabase = client();
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin + "/account.html" }
        });
        // Browser navigates away to Google, then back here - checkSession()
        // on the next page load picks up the resulting session.
    }

    function setupGoogleButtons() {
        document.getElementById("googleSignupBtn")?.addEventListener("click", signInWithGoogle);
        document.getElementById("googleLoginBtn")?.addEventListener("click", signInWithGoogle);
    }

    function setupLoginForm() {
        const form = document.getElementById("loginForm");
        const errorEl = document.getElementById("loginError");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorEl.textContent = "";
            const supabase = client();
            if (!supabase) {
                errorEl.textContent = "Account sign-in isn't available right now - please try again shortly.";
                return;
            }

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const submitBtn = form.querySelector("button[type=submit]");
            submitBtn.disabled = true;

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            submitBtn.disabled = false;

            if (error) {
                errorEl.textContent = error.message || "Couldn't log in - check your email and password.";
                return;
            }
            showAccountArea(data.user);
        });
    }

    function setupSignupForm() {
        const form = document.getElementById("signupForm");
        const errorEl = document.getElementById("signupError");
        const successEl = document.getElementById("signupSuccess");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorEl.textContent = "";
            successEl.classList.add("is-hidden");
            const supabase = client();
            if (!supabase) {
                errorEl.textContent = "Account creation isn't available right now - please try again shortly.";
                return;
            }

            const name = document.getElementById("signupName").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value;
            const submitBtn = form.querySelector("button[type=submit]");
            submitBtn.disabled = true;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });
            submitBtn.disabled = false;

            if (error) {
                errorEl.textContent = error.message || "Couldn't create your account - please try again.";
                return;
            }

            if (data.session) {
                showAccountArea(data.user);
            } else {
                successEl.textContent = "Account created! Check your email to confirm it, then log in.";
                successEl.classList.remove("is-hidden");
                form.reset();
            }
        });
    }

    function setupLogout() {
        const btn = document.getElementById("logoutButton");
        if (!btn) return;
        btn.addEventListener("click", async () => {
            const supabase = client();
            if (supabase) await supabase.auth.signOut();
            showAuthArea();
        });
    }

    function renderOrders(orders) {
        const list = document.getElementById("orderList");
        if (!list) return;

        if (!orders.length) {
            list.innerHTML = `<p class="account-empty">No orders yet - once you check out, they'll show up here.</p>`;
            return;
        }

        list.innerHTML = orders.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsText = items.map(i => `${i.name} × ${i.qty}`).join(", ");
            const date = new Date(order.created_at).toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric"
            });
            const total = "₦" + Math.round(order.total_amount).toLocaleString("en-NG");
            return `
                <div class="order-card">
                    <div class="order-card-top">
                        <span class="order-date">${date}</span>
                        <span class="order-status order-status-${order.status}">${order.status}</span>
                    </div>
                    <p class="order-items">${itemsText}</p>
                    <div class="order-card-bottom">
                        <strong>${total}</strong>
                        ${order.paystack_reference ? `<span class="order-ref">Ref: ${order.paystack_reference}</span>` : ""}
                    </div>
                </div>
            `;
        }).join("");
    }

    async function loadOrders() {
        const list = document.getElementById("orderList");
        const supabase = client();
        if (!supabase || !list) return;

        const { data, error } = await supabase
            .from("Order")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            list.innerHTML = `<p class="account-empty">Couldn't load your orders right now - please try again shortly.</p>`;
            return;
        }
        renderOrders(data || []);
    }

    async function checkSession() {
        const supabase = client();
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            showAccountArea(data.session.user);
        } else {
            showAuthArea();
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupViewSwitching();
        setupGoogleButtons();
        setupLoginForm();
        setupSignupForm();
        setupLogout();
        checkSession();
    });
})();
