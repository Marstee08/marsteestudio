# Going live with real payments (Paystack)

Do these in order. The admin panel (Dashboard) shows a banner telling you if the keys match.

1. **Activate your Paystack business**: in the Paystack dashboard, complete the "Go live" steps
   (business details, bank account for payouts). Until it is approved you only get test keys.
2. **Copy your LIVE keys** (Settings -> API Keys & Webhooks): the *public* key starts `pk_live_`,
   the *secret* key starts `sk_live_`.
3. **Website**: DONE - `js/paystack-key.js` already contains your `pk_live_...` public key. (Only sync it to GitHub AFTER step 4.)
4. **Supabase**: Project -> Edge Functions -> Secrets -> set `PAYSTACK_SECRET_KEY` to the `sk_live_...` key.
   (Public and secret key must BOTH be live, or both test. The admin banner flags a mismatch.)
5. **Webhook** (so a payment is never missed even if the customer closes the page):
   Paystack dashboard -> Settings -> API Keys & Webhooks -> Webhook URL:
   `https://iggffzkopskzzemuksay.supabase.co/functions/v1/paystack-webhook`
6. **Phone alerts**: install the free **ntfy** app, tap "+", subscribe to the topic
   `mars-tee-orders-w808qs6rfr50`. You get a push the moment an order is paid.
7. **Make one small real payment** yourself with a real card (use your cheapest product, or ask a friend),
   then check: the order shows **paid** in Admin -> Orders, and your phone buzzed.

If you change a price on the website (`TIER_PRICING` in `script.js`), change it in the Supabase table
`price_tiers` too. Raising a price without updating the table is safe; LOWERING it without updating the
table makes the database refuse those orders.
