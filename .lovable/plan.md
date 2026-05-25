# Build Plan

## 1. Multi-crypto deposit addresses
- Add a `deposit_addresses` table (currency, network, address, qr_url, is_active, min_amount) — admin editable.
- Seed defaults: USDT BEP20 (existing), BTC, ETH, USDT TRC20.
- `DepositPanel`: currency selector chips → shows the matching address + QR + min amount. Screenshot upload stays mandatory; no tx hash field (manual review).
- Admin **Wallets** tab to add/edit/disable any address at any time.

## 2. KYC (mandatory for withdrawal, admin-only approval)
- New `user_kyc` table: full_name, dob, country, id_type, id_number, id_front_url, id_back_url, selfie_url, status (pending/approved/rejected), reviewed_by, reviewed_at, rejection_reason.
- Storage bucket `kyc-documents` (private, user-scoped paths).
- User `/kyc` page to submit and view status.
- `WithdrawPage` blocks submission unless KYC = approved, with a CTA to /kyc.
- Admin **KYC** tab: review, view docs (ProofViewer), approve/reject with reason.

## 3. Profile + avatar upload
- Add `avatar_url`, `phone`, `country` to profiles.
- Storage bucket `avatars` (public).
- New `/profile` page (mobile, lime aesthetic): avatar upload, name, phone, country, bank details, change password, sign out.
- Avatar shown in AppShell header.

## 4. Full admin control over user accounts
New admin tabs/screens:
- **Users**: list all users with search; per-user drawer showing wallet, investments, KYC, deposits, withdrawals. Actions:
  - Manual credit/debit balance (writes a `manual_adjustments` row + updates wallet via SECURITY DEFINER function `admin_adjust_balance`).
  - Create investment on user's behalf (any plan, any amount — uses SECURITY DEFINER `admin_create_investment` bypassing balance check).
  - Cancel/refund an active investment (`admin_cancel_investment` — refunds remaining principal to wallet).
  - Ban / unban user (adds `is_banned` to profiles; auth gate redirects banned users to a "suspended" screen and signs them out).
  - Reset/force sign-out (revoke sessions via admin API — or set `is_banned` flag that client honors).
- **Deposits/Withdrawals**: keep existing approve/reject, plus admin can manually create a deposit for a user (top-up).
- **Plans**: existing CRUD continues.
- **Investments**: existing list + `distribute_due_roi` + new per-row cancel.

## 5. Announcements
- `announcements` table (title, body, severity, is_active, starts_at, ends_at, created_by).
- Admin **Announcements** tab: create / edit / toggle active.
- User dashboard shows the latest active announcement as a dismissible banner; realtime updates via Supabase channel.

## 6. Live chat / support
- The project already has `support_tickets` and `support_messages` tables + `SupportChatWidget` and `SupportChatManagement`. Wire them in:
  - Mount `SupportChatWidget` on Dashboard (floating bubble above BottomNav).
  - Add **Support** tab in admin pointing at `SupportChatManagement`.

## 7. ROI ↔ investment coupling (verification)
ROI already flows through `distribute_due_roi()` pro-rata against `expected_return = principal × (1 + plan.roi_percent/100)` over `duration_days`. Add a cron-style "Auto-distribute" toggle in admin (manual button stays). Confirm InvestPanel displays the exact ROI % and dollar profit from the selected plan and that completed investments stop accruing.

## 8. UX polish
- Bottom nav: add a 6th item or fold Profile under header avatar (keep 5 nav items: Home / Invest / Deposit / Send / History; Profile via avatar tap).
- All new screens use the lime aesthetic + EmptyState + mobile-first 320px layout.

---

## Database migrations (single migration)
- New tables: `deposit_addresses`, `user_kyc`, `manual_adjustments`, `announcements`.
- New columns: `profiles.avatar_url`, `profiles.phone`, `profiles.country`, `profiles.is_banned`.
- New SECURITY DEFINER functions: `admin_adjust_balance`, `admin_create_investment`, `admin_cancel_investment`, `admin_credit_deposit`.
- New storage buckets: `avatars` (public), `kyc-documents` (private).
- RLS: users read own (kyc/adjustments); admins manage all; deposit_addresses + active announcements readable by everyone.

## New / edited files (high level)
- New pages: `src/pages/KycPage.tsx`, `src/pages/ProfilePage.tsx`.
- New admin components: `UsersManager.tsx`, `KycApproval.tsx`, `AnnouncementsManager.tsx`, `DepositAddressesManager.tsx`, plus per-user `UserDetailDrawer.tsx`.
- Edited: `DepositPanel.tsx` (currency selector + dynamic address), `WithdrawPanel.tsx` (KYC gate), `AppShell.tsx` (avatar + announcement banner), `AdminDashboard.tsx` (new tabs), `App.tsx` (new routes), `BottomNav.tsx` (unchanged; Profile via header).

## Out of scope for this pass
- Email notifications on KYC/deposit decisions (Resend secret exists; can wire in a follow-up).
- Real-time push beyond what already exists.
- Cron-scheduled auto ROI (keep manual button for now; can add a pg_cron job later).

Once you approve, I'll ship it as one migration + the file changes above.
