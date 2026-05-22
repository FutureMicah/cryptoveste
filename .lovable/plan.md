
# Crypto Investment Platform — Rebuild Plan

Reuse: Supabase auth (email/password + Google), `profiles`, `user_roles`, `payment-screenshots` storage bucket, USDT BEP20 wallet `0x37e39CcC88bfcD0a78087DD1188619530C355a95`, admin login (`futuremicah4@gmail.com` / PIN 4303).

Replace: landing page, signup flow, user dashboard, admin dashboard, referral/enrollment logic.

## 1. Database (migration)

New tables:
- `investment_plans` — name, description, min_amount, max_amount, roi_percent, duration_days, is_active. Admin-managed only.
- `user_investments` — user_id, plan_id, amount, expected_return, status (active/completed/cancelled), starts_at, ends_at, total_paid.
- `deposits` — user_id, amount_usd, tx_hash, sender_wallet, screenshot_url, status (pending/approved/rejected), admin_notes, reviewed_by, reviewed_at.
- `withdrawals` — user_id, amount_usd, wallet_address, status (pending/approved/rejected/paid), admin_notes, reviewed_by, reviewed_at.
- `wallets` — user_id (unique), balance_usd, total_invested, total_earned, total_withdrawn. Auto-created on signup.

Triggers:
- On signup: create wallet row.
- On deposit approved: add amount to wallet.balance_usd.
- On user_investment insert: deduct from wallet.balance_usd, add to total_invested.
- On withdrawal approved: deduct from wallet.balance_usd, add to total_withdrawn.
- Admin RPC `credit_investment_roi(investment_id, amount)` to credit ROI to wallet.

RLS: users see only their own rows; admins see/manage all. Plans publicly readable.

Seed 4 default plans (Starter / Bronze / Silver / Gold).

## 2. Frontend

### Landing page (`/`)
Hero with tagline, "How it works" 3-step, plans preview cards (live from DB), live BTC/ETH/USDT prices via CoinGecko public API, CTA → signup/login.

### Auth (`/auth`)
Single page: email/password sign in + sign up tabs, Google button, forgot password.

### User dashboard (`/dashboard`)
- Wallet summary: balance, total invested, total earned, total withdrawn.
- Active investments list with progress bars.
- Tabs: **Invest** (browse plans, pick amount, confirm), **Deposit** (show USDT address, copy, form for tx hash + screenshot upload), **Withdraw** (amount + wallet address form), **History** (deposits/withdrawals/investments).
- Live price ticker.

### Admin dashboard (`/admin`)
Login gate as today. Tabs:
- **Overview**: totals (users, deposits pending, withdrawals pending, AUM).
- **Plans**: CRUD investment plans.
- **Deposits**: pending list with screenshot viewer → approve/reject.
- **Withdrawals**: pending list → approve/reject/mark paid.
- **Investments**: list active investments → credit ROI button.
- **Users**: list users with wallet balance.

## 3. Files

Delete/ignore (no longer routed):
- signup flow components, referral leaderboard, bank details form, payment activation, intro sequence, session timeout, support chat, push notifications. (Leave files; just stop importing them.)

New/replaced:
- `src/pages/Landing.tsx`, `src/pages/Auth.tsx`, `src/pages/Dashboard.tsx`, `src/pages/AdminDashboard.tsx` (replace).
- `src/components/invest/{PlanCard, InvestModal, DepositPanel, WithdrawPanel, WalletSummary, PriceTicker, HistoryTable}.tsx`.
- `src/components/admin/{PlansManager, DepositsApproval, WithdrawalsApproval, InvestmentsManager, AdminOverview}.tsx`.
- `src/hooks/useCryptoPrices.ts` (CoinGecko fetch + cache).
- `src/hooks/useWallet.ts`.
- Update `src/App.tsx` routes.

## 4. Out of scope (ask if needed later)
- Automatic on-chain verification (deposits stay manual screenshot + admin approval).
- Email notifications.
- Referral system removed.

Proceeding will run a DB migration first, then write code.
