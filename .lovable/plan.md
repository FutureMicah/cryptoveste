# Plan — Expanded Admin Controls & Stronger Signup

Big scope, so I'll ship in two batches. Confirm and I'll start with **Batch 1** immediately.

## Batch 1 — Admin power tools (highest impact)

### 1. Edit user profile from admin
In `UsersManager` user-detail sheet, add an **"Edit profile"** card:
- First name, last name, username, phone, country, avatar URL
- Saves to `profiles` (admin RLS already allows update)
- Logs `profile_updated` to audit log

### 2. Edit / reverse / delete deposits & withdrawals
New admin RPCs (server-side role check + audit log):
- `admin_update_deposit(id, new_amount, new_status, note)` — reverses wallet credit if approved→rejected, re-credits delta on amount change
- `admin_delete_deposit(id)` — reverses wallet impact then deletes
- `admin_update_withdrawal(id, new_amount, new_status, note)` — refunds wallet if approved→rejected
- `admin_delete_withdrawal(id)` — refunds if needed then deletes
UI: pencil + trash icons on each row in `DepositsApproval` and `WithdrawalsApproval` with confirm dialogs.

### 3. Reset password / force logout
New edge function `admin-user-actions` (uses service role key):
- `reset_password`: triggers Supabase recovery email
- `force_signout`: invokes `auth.admin.signOut(user_id, 'global')`
- `update_email`: admin can change a user's email
Buttons in `UsersManager` sheet. All actions audit-logged.

### 4. Broadcast notifications & email blast
New admin tab **Broadcasts**:
- Compose subject + body, choose channel (in-app toast + announcement / email / both)
- In-app: inserts an announcement row with `severity='info'` + immediate `starts_at`
- Email: edge function `broadcast-email` loops over `profiles.email` via Resend (already configured)
- Optional segment filter (all / banned excluded / KYC-approved only)

## Batch 2 — Signup hardening

### 5. Phone number at signup
- Add **phone** field (with country code via `react-phone-number-input` styled to match) to `SignUpFlow` identity step
- Pass into `auth.signUp` meta → `handle_new_user` already inserts into `profiles.phone` (need migration to read from raw_user_meta_data)
- E.164 validation, mark required

### 6. Mandatory KYC step in signup
- Insert a new step in `SignUpFlow` after identity/payment: collect full name, DOB, ID type, ID number + upload (front, back, selfie) → `user_kyc` row with `status='pending'`
- Dashboard already blocks withdrawal until approved; we'll also gate access to `/invest` behind KYC submitted (not necessarily approved) with a soft banner

## Technical notes
- All new admin RPCs use `SECURITY DEFINER` + `has_role` check + `log_admin_action`
- Edge functions require `SUPABASE_SERVICE_ROLE_KEY` (already set)
- New `broadcast-email` function uses existing `RESEND_API_KEY`
- No new tables needed for Batch 1; reuse `announcements` for in-app broadcasts
- Batch 2 adds `phone` validation only — `profiles.phone` column already exists

Reply **"go"** to start Batch 1, or tell me to reorder/skip anything.
