/* MtsOtp - glass code-verification box.
   Same sequence as the reference clip: type the code -> Verify -> the digits tumble,
   gather into a cross/ring, spin, then turn into a green check ("Verified & Secured").
   Used for the payment confirmation (auto-typed) and for password reset / change (real codes). */
(function () {
    "use strict";

    const ICON_KEY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/></svg>';
    const ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>';
    const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mmss = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

    function mount(host, options) {
        const o = Object.assign({
            length: 6,
            title: "Verify <em>OTP</em>",
            sub: "Enter the security code we sent you",
            okTitle: "Verified <em>Successfully</em>",
            okSub: "Your security verification code has been confirmed.",
            btn: "Verify &amp; Proceed &rarr;",
            btnBusy: "Verifying Code...",
            btnOk: "Verified &amp; Secured",
            timer: 60,
            resend: null,      // async () => {} ; null hides the resend row
            auto: null,        // string of digits to type automatically (payment screen)
            onVerify: async () => ({ ok: true }),
            onDone: null
        }, options || {});

        const N = o.length;
        host.innerHTML = `
        <div class="otp-card">
            <div class="otp-icon"><span class="oi-a">${ICON_KEY}</span><span class="oi-b">${ICON_SHIELD}</span></div>
            <h3 class="otp-title"><span class="ot-a">${o.title}</span><span class="ot-b">${o.okTitle}</span></h3>
            <p class="otp-sub"><span class="os-a">${o.sub}</span><span class="os-b">${o.okSub}</span></p>
            <div class="otp-board">
                <div class="otp-row">${Array.from({ length: N }, () => '<div class="otp-cell"><input class="otp-box" type="text" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Code digit"><i class="otp-caret"></i></div>').join("")}</div>
                <div class="otp-ring"><i></i></div>
                <div class="otp-check">${ICON_CHECK}</div>
            </div>
            <p class="otp-msg" role="alert"></p>
            ${o.resend ? '<p class="otp-resend">Didn\'t receive the code? <button type="button" class="otp-timer" disabled>Resend in 00:00</button></p>' : ""}
            <button type="button" class="otp-btn"><span class="ob-a">${o.btn}</span><span class="ob-b"><i class="otp-spin"></i>${o.btnBusy}</span><span class="ob-c">${ICON_SHIELD}${o.btnOk}</span></button>
        </div>`;

        const card = host.querySelector(".otp-card");
        const board = card.querySelector(".otp-board");
        const row = card.querySelector(".otp-row");
        const boxes = [...card.querySelectorAll(".otp-box")];
        const msg = card.querySelector(".otp-msg");
        const btn = card.querySelector(".otp-btn");
        const outer = host.closest(".account-auth-card, .checkout-form-card, .account-security");
        let busy = false, done = false, tiles = [];

        function code() { return boxes.map(b => b.value).join(""); }
        function setMsg(t) { msg.textContent = t || ""; }
        function refreshFocus() { boxes.forEach(b => b.parentElement.classList.toggle("is-focus", document.activeElement === b)); }

        boxes.forEach((b, i) => {
            b.addEventListener("input", () => {
                b.value = b.value.replace(/\D/g, "").slice(-1);
                b.parentElement.classList.toggle("is-filled", !!b.value);
                if (b.value && i < N - 1) boxes[i + 1].focus();
                setMsg(""); card.classList.remove("is-error");
                if (code().length === N && !o.auto) btn.focus();
            });
            b.addEventListener("keydown", e => {
                if (e.key === "Backspace" && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ""; boxes[i - 1].parentElement.classList.remove("is-filled"); }
                if (e.key === "ArrowLeft" && i > 0) boxes[i - 1].focus();
                if (e.key === "ArrowRight" && i < N - 1) boxes[i + 1].focus();
                if (e.key === "Enter") run();
            });
            b.addEventListener("paste", e => {
                const t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, N);
                if (!t) return;
                e.preventDefault();
                boxes.forEach((x, k) => { x.value = t[k] || ""; x.parentElement.classList.toggle("is-filled", !!x.value); });
                boxes[Math.min(t.length, N - 1)].focus();
            });
            b.addEventListener("focus", refreshFocus);
            b.addEventListener("blur", () => setTimeout(refreshFocus, 0));
        });
        btn.addEventListener("click", run);

        function center(el) { const r = el.getBoundingClientRect(), b = board.getBoundingClientRect(); return [r.left + r.width / 2 - (b.left + b.width / 2), r.top + r.height / 2 - (b.top + b.height / 2)]; }
        function place(t, x, y, r, s) { t.style.setProperty("--x", x + "px"); t.style.setProperty("--y", y + "px"); t.style.setProperty("--r", r + "deg"); t.style.setProperty("--s", s); }

        function buildTiles() {
            tiles = boxes.map(b => {
                const t = document.createElement("b");
                t.className = "otp-tile"; t.textContent = b.value;
                const [x, y] = center(b.parentElement);
                place(t, x, y, 0, 1);
                board.appendChild(t);
                return t;
            });
            row.style.visibility = "hidden";
        }
        const home = () => boxes.map(b => center(b.parentElement));

        async function tumble() {
            buildTiles();
            await wait(60);
            card.classList.add("is-tumble");
            tiles.forEach((t, i) => {                       // scatter, each tile twisting a different way
                const a = (i / N) * Math.PI * 2 + 0.6, rad = 58 + (i % 2) * 14;
                place(t, Math.cos(a) * rad, Math.sin(a) * rad * 0.8, (i % 2 ? 1 : -1) * (14 + i * 3), 1);
            });
            await wait(reduced() ? 50 : 1150);
            tiles.forEach((t, i) => {                       // gather: 4 digits make the cross, more make a ring
                const a = (i / N) * Math.PI * 2 - Math.PI / 2, rad = N <= 4 ? 36 : 56;
                place(t, Math.cos(a) * rad, Math.sin(a) * rad, 0, 0.9);
            });
            await wait(reduced() ? 50 : 950);
            tiles.forEach(t => place(t, 0, 0, 0, 0.15));   // collapse into the spinner
            card.classList.add("is-ring");
            await wait(reduced() ? 50 : 900);
        }

        async function run() {
            if (busy || done) return;
            const c = code();
            if (c.length < N) { card.classList.add("is-error"); setMsg("Enter all " + N + " digits."); setTimeout(() => card.classList.remove("is-error"), 500); return; }
            busy = true; setMsg(""); card.classList.add("is-busy");
            boxes.forEach(b => b.blur());
            const verifying = Promise.resolve().then(() => o.onVerify(c)).catch(e => ({ ok: false, message: (e && e.message) || "Something went wrong." }));
            await tumble();
            const res = await verifying;
            if (!res || !res.ok) { await fail((res && res.message) || "That code is not right."); return; }
            card.classList.remove("is-ring"); card.classList.add("is-ok");
            outer?.classList.add("is-green");
            done = true;
            await wait(reduced() ? 100 : 1600);
            if (o.onDone) o.onDone(c);
        }

        async function fail(message) {
            const h = home();
            tiles.forEach((t, i) => place(t, h[i][0], h[i][1], 0, 1));
            card.classList.remove("is-ring", "is-tumble");
            await wait(reduced() ? 50 : 700);
            tiles.forEach(t => t.remove()); tiles = [];
            row.style.visibility = "";
            card.classList.remove("is-busy"); card.classList.add("is-error");
            setMsg(message); busy = false;
            boxes.forEach(b => { b.value = ""; b.parentElement.classList.remove("is-filled"); });
            boxes[0].focus();
            setTimeout(() => card.classList.remove("is-error"), 600);
        }

        // resend countdown
        if (o.resend) {
            const t = card.querySelector(".otp-timer");
            let left = 0, iv = null;
            const start = () => {
                left = o.timer; t.disabled = true; clearInterval(iv);
                const tick = () => { t.textContent = left > 0 ? "Resend in " + mmss(left) : "Resend code"; if (left <= 0) { t.disabled = false; clearInterval(iv); } left--; };
                tick(); iv = setInterval(tick, 1000);
            };
            t.addEventListener("click", async () => {
                t.disabled = true; t.textContent = "Sending...";
                try { await o.resend(); setMsg("A new code is on its way."); } catch (e) { setMsg((e && e.message) || "Could not resend the code."); }
                start();
            });
            start();
        }

        // auto-typed mode (payment screen): digits appear one by one, then it verifies itself
        if (o.auto) {
            boxes.forEach(b => (b.readOnly = true));
            (async () => {
                await wait(reduced() ? 0 : 500);
                for (let i = 0; i < N; i++) {
                    boxes[i].focus(); refreshFocus();
                    await wait(reduced() ? 0 : 420);
                    boxes[i].value = o.auto[i] || "0"; boxes[i].parentElement.classList.add("is-filled");
                    await wait(reduced() ? 0 : 160);
                }
                boxes[N - 1].blur(); refreshFocus();
                await wait(reduced() ? 0 : 450);
                run();
            })();
        } else {
            setTimeout(() => boxes[0].focus(), 50);
        }
        return { run, get done() { return done; } };
    }

    window.MtsOtp = { mount };
})();
