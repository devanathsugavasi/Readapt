# Readapt Launch Runbook (Web + Razorpay + Subscriptions)

## 1. Production Environment Variables
Set these in your deployment platform (Vercel):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CHROME_WEBSTORE_URL` (set this after extension publish)
- `NEXT_PUBLIC_SUPPORT_EMAIL` (optional, defaults to `support@readapt.app`)

## 2. Database Subscription Fields (Recommended)
If your `user_profiles` table does not already have these columns, add them.

```sql
alter table public.user_profiles
  add column if not exists subscription_renewal_date timestamptz,
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_customer_id text,
  add column if not exists payment_provider text;

create index if not exists idx_user_profiles_subscription_status
  on public.user_profiles (subscription_status);
```

## 3. Razorpay Dashboard Setup
1. Create live API keys in Razorpay dashboard.
2. Add webhook endpoint:
   - URL: `https://<your-domain>/api/razorpay/webhook`
   - Secret: same value as `RAZORPAY_WEBHOOK_SECRET`
3. Enable at least these events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.halted`

## 4. Payment Confirmation Flow (Mandatory)
Client flow after Razorpay checkout success:
1. Create order via `POST /api/razorpay/order`.
2. Complete checkout in browser.
3. Send `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `userId`, `plan`, `currency` to:
   - `POST /api/razorpay/verify`
4. Only after successful verify, unlock Pro in UI.

## 5. Subscription Status Source of Truth
- Primary status field: `user_profiles.subscription_status`
- Recommended values:
  - `active`
  - `past_due`
  - `cancelled`
- Renewal date:
  - `user_profiles.subscription_renewal_date` (preferred)
  - fallback in `preset.subscription.renewalDate`

## 6. Geo + Currency Logic
Current behavior:
- India (`IN`) -> INR
- non-India -> USD
- geolocation fallback to header-based country detection if user denies location

Verify on production with VPN/device testing:
- India IP => INR values and Razorpay order in INR
- US/other IP => USD values and Razorpay order in USD

## 7. Extension Launch Requirements
1. Publish extension to Chrome Web Store.
2. Set `NEXT_PUBLIC_CHROME_WEBSTORE_URL` to published listing URL.
3. Verify these links open store listing:
   - Landing page "Get the Extension"
   - Dashboard "Install Extension"

## 8. Pre-Launch Test Matrix
- Auth:
  - signup/login/logout
  - callback flow
- Preset storage:
  - quiz score write/read
  - adapt settings save/load
- Payments:
  - create order
  - successful verify
  - failed signature rejected
  - webhook updates subscription status
- Subscription UI:
  - free user sees no manage-subscription tab
  - pro user sees status + renewal date
- Extension sync:
  - A/B/C sync
  - guest sync
  - lock fallback for expired preview

## 9. Go-Live Day Sequence
1. Deploy app with live env vars.
2. Configure and save Razorpay webhook in live mode.
3. Run one real low-value payment test in live mode.
4. Confirm:
   - `/api/razorpay/verify` marks user active
   - webhook updates user profile
   - dashboard shows subscription status and renewal date
5. Publish extension and set `NEXT_PUBLIC_CHROME_WEBSTORE_URL`.
6. Smoke test all critical paths on desktop + mobile.

## 10. Rollback/Safety
- If payment verification fails, do not grant Pro.
- Keep webhook logs (provider + app) for audit.
- Keep manual support fallback through billing support email.
