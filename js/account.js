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
        // Glass-card morph: the card collapses to a glowing diamond, then re-forms as the other view.
        const card = document.getElementById("authArea");
        if (card && !card.querySelector(".ac-loader")) {
            const l = document.createElement("div"); l.className = "ac-loader"; l.setAttribute("aria-hidden", "true"); l.innerHTML = "<i></i>";
            card.appendChild(l);
        }
        function morphTo(swap) {
            if (!card || matchMedia("(prefers-reduced-motion: reduce)").matches) { swap(); return; }
            card.classList.add("ac-morph");
            setTimeout(swap, 560);
            setTimeout(() => card.classList.remove("ac-morph"), 1150);
        }
        document.getElementById("showLoginBtn")?.addEventListener("click", () => morphTo(showLoginView));
        document.getElementById("showSignupBtn")?.addEventListener("click", () => morphTo(showSignupView));
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


    // ---- Password reset (forgot password) and password change, both confirmed with an emailed code ----
    function morph(swap) {
        const card = document.getElementById("authArea");
        if (!card || matchMedia("(prefers-reduced-motion: reduce)").matches) { swap(); return; }
        card.classList.add("ac-morph");
        setTimeout(swap, 560);
        setTimeout(() => card.classList.remove("ac-morph"), 1150);
    }
    function showAuthView(id) {
        document.querySelectorAll("#authArea .account-auth-view").forEach(v => v.classList.toggle("is-hidden", v.id !== id));
        document.getElementById("authArea")?.classList.toggle("in-otp", id === "otpView" || id === "resetView" || id === "forgotView");
    }
    const pwOk = (a, b, el) => {
        if (a.length < 6) { el.textContent = "Use at least 6 characters."; return false; }
        if (a !== b) { el.textContent = "The two passwords do not match."; return false; }
        return true;
    };

    function setupForgotPassword() {
        const supabase = client;
        document.getElementById("showForgotBtn")?.addEventListener("click", () => {
            const v = document.getElementById("loginEmail")?.value.trim();
            if (v) document.getElementById("forgotEmail").value = v;
            morph(() => showAuthView("forgotView"));
        });
        document.getElementById("forgotBackBtn")?.addEventListener("click", () => morph(showLoginView2));
        function showLoginView2() { showAuthView("loginView"); }

        document.getElementById("forgotForm")?.addEventListener("submit", async e => {
            e.preventDefault();
            const errEl = document.getElementById("forgotError"); errEl.textContent = "";
            const sb = supabase(); if (!sb) { errEl.textContent = "This is not available right now - please try again shortly."; return; }
            const email = document.getElementById("forgotEmail").value.trim();
            const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
            const { error } = await sb.auth.resetPasswordForEmail(email);
            btn.disabled = false;
            if (error) { errEl.textContent = error.message || "Could not send the code. Please try again."; return; }
            morph(() => {
                showAuthView("otpView");
                MtsOtp.mount(document.getElementById("resetOtpHost"), {
                    length: 6,
                    sub: "Enter the 6-digit security code sent to " + email.replace(/[<>&"]/g, ""),
                    resend: async () => { const r = await sb.auth.resetPasswordForEmail(email); if (r.error) throw r.error; },
                    onVerify: async code => {
                        const { error: vErr } = await sb.auth.verifyOtp({ email, token: code, type: "recovery" });
                        return vErr ? { ok: false, message: "That code is not right or has expired." } : { ok: true };
                    },
                    onDone: () => { document.getElementById("authArea")?.classList.remove("is-green"); showAuthView("resetView"); }
                });
            });
        });

        document.getElementById("resetForm")?.addEventListener("submit", async e => {
            e.preventDefault();
            const errEl = document.getElementById("resetError"); errEl.textContent = "";
            const pw = document.getElementById("resetPassword").value, again = document.getElementById("resetConfirm").value;
            if (!pwOk(pw, again, errEl)) return;
            const sb = supabase(); if (!sb) return;
            const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
            const { data, error } = await sb.auth.updateUser({ password: pw });
            btn.disabled = false;
            if (error) { errEl.textContent = error.message || "Could not save the new password."; return; }
            e.target.reset();
            showAccountArea(data.user);
        });
    }

    function setupChangePassword() {
        const intro = document.getElementById("changePwIntro"), form = document.getElementById("changePwForm"), host = document.getElementById("changePwOtpHost");
        if (!form) return;
        const done = document.getElementById("changePwDone");
        document.getElementById("changePwBtn")?.addEventListener("click", () => { intro.classList.add("is-hidden"); form.classList.remove("is-hidden"); });
        form.addEventListener("submit", async e => {
            e.preventDefault();
            const errEl = document.getElementById("changePwError"); errEl.textContent = "";
            const pw = document.getElementById("changePwNew").value, again = document.getElementById("changePwConfirm").value;
            if (!pwOk(pw, again, errEl)) return;
            const sb = client(); if (!sb) return;
            const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
            const { error } = await sb.auth.reauthenticate();
            btn.disabled = false;
            if (error) { errEl.textContent = error.message || "Could not send the code. Please try again."; return; }
            form.classList.add("is-hidden"); host.classList.remove("is-hidden");
            MtsOtp.mount(host, {
                length: 6,
                sub: "Enter the 6-digit security code sent to your email",
                resend: async () => { const r = await sb.auth.reauthenticate(); if (r.error) throw r.error; },
                onVerify: async code => {
                    const { error: uErr } = await sb.auth.updateUser({ password: pw, nonce: code });
                    return uErr ? { ok: false, message: "That code is not right or has expired." } : { ok: true };
                },
                onDone: () => {
                    host.classList.add("is-hidden"); host.innerHTML = "";
                    document.querySelector(".account-security")?.classList.remove("is-green");
                    form.reset(); intro.classList.remove("is-hidden");
                    done.textContent = "Your password has been changed."; done.classList.remove("is-hidden");
                }
            });
        });
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
        setupForgotPassword();
        setupChangePassword();
        checkSession();
    });
})();
