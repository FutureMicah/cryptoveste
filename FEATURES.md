# BlackPAL Platform - Feature Documentation

## Overview
Comprehensive onboarding and payment system with regional pricing, KYC verification, and admin management.

---

## 1. Enhanced Geo-Detection & Regional Pricing

### Features
- **Automatic Location Detection**: Uses IP geolocation to detect user's country
- **VPN/Proxy Detection**: Blocks VPN and proxy connections for compliance
- **Regional Pricing Tiers**:
  - 🇳🇬 **Nigeria**: ₦25,000
  - 🌍 **Africa**: $100
  - 🌎 **International**: $200

### Security
- Multiple IP verification services
- VPN/Proxy blocking with retry mechanism
- Geo data saved to user profile for audit trails

### Payment Methods by Region
- **Nigeria**: Paystack, Bank Transfer, Crypto
- **Africa**: Flutterwave, Skrill, Crypto
- **International**: Skrill, Crypto

---

## 2. Multiple Payment Methods

### Supported Payment Providers

#### Paystack (Nigeria)
- Card payments via Paystack gateway
- Automatic payment verification
- Transaction screenshot upload for manual review

#### Flutterwave (Africa)
- African payment gateway integration
- Multi-currency support
- Bank transfer and mobile money

#### Skrill (International)
- International payment processor
- Supports major credit/debit cards
- Multi-currency transactions

#### Cryptocurrency (All Regions)
- **Supported Coins**:
  - USDT (TRC-20) - Tron network
  - USDT (ERC-20) - Ethereum network
  - Bitcoin (BTC)
  - Ethereum (ETH)
  - USD Coin (USDC)
- Transaction hash verification
- Wallet address tracking
- Blockchain confirmation monitoring

---

## 3. Account Name Verification

### How It Works
1. User enters first and last name during signup
2. During payment, user enters the name on their payment account
3. System normalizes and compares names (removes spaces, special chars)
4. Verification status stored: `verified` or `failed`

### Admin Review
- Name mismatches are flagged for manual admin verification
- Admin can approve/reject based on screenshot and account details
- Rejection reasons stored for user notification

---

## 4. Investor KYC Flow

### Required Documents
1. **Government ID** (Required)
   - Passport, Driver's License, or National ID
2. **Proof of Address** (Required)
   - Utility bill or bank statement (max 3 months old)
3. **Bank Statement** (Recommended)
   - Last 3 months
4. **Source of Funds** (Recommended)
   - Documentation proving source of investment capital

### Document Upload
- Supports: PDF, JPG, PNG
- Max file size: 10MB
- Encrypted storage
- Status tracking: pending → approved/rejected

### Compliance Interview
- **Scheduling**: Admin schedules after document review
- **Duration**: 15-30 minutes
- **Format**: Video call via meeting link
- **Purpose**: Identity verification, compliance checks
- **Status Types**:
  - `scheduled` - Pending interview
  - `completed` - Interview done
  - `cancelled` - Cancelled by user/admin
  - `rescheduled` - Needs new time
  - `no_show` - User didn't attend

---

## 5. Admin Dashboard

### Access
- Route: `/admin`
- Authentication: Admin or Super Admin role required
- Automatic redirect if not authorized

### Features

#### Payment Verification Tab
- **View all payment submissions**
- **Filter by status**: submitted, approved, rejected
- **Name verification flags**: Shows mismatched names
- **Actions**:
  - ✅ Approve payment
  - ❌ Reject with reason
- **Details displayed**:
  - User full name
  - Amount and currency
  - Payment account name
  - Submission timestamp

#### KYC Documents Tab
- **Document review interface**
- **Document types**: Government ID, Proof of Address, Bank Statement, etc.
- **Status management**: pending, approved, rejected, requires_resubmission
- **Actions**:
  - ✅ Approve KYC document
  - ❌ Reject with reason
- **Details displayed**:
  - Investor name
  - Document type
  - Submission timestamp
  - Current status

#### Interviews Tab
- **Scheduled interviews list**
- **Interview details**:
  - User information
  - Scheduled date/time
  - Duration
  - Meeting link
  - Status
- **Status indicators**: scheduled, completed, cancelled, no-show
- **Quick actions**: Join meeting link

#### Quick Stats Dashboard
- **Pending Payments**: Count of unverified payments
- **Pending KYC**: Count of documents awaiting review
- **Scheduled Interviews**: Count of upcoming interviews
- **Total Users**: Platform-wide user count

---

## 6. User Roles & Permissions

### Role Types (app_role enum)
1. **student** - Default role for student users
2. **investor** - Users with investor account type
3. **admin** - Can review payments, KYC, schedule interviews
4. **super_admin** - Full system access

### Role Assignment
- **Automatic**: `student` role assigned on signup via trigger
- **Manual**: Admins can assign roles via database

### Permission System
- Uses `has_role()` function for RLS policies
- Security definer functions prevent infinite recursion
- Role-based access control on all sensitive tables

---

## 7. Database Schema

### New Tables

#### `investor_kyc_documents`
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- document_type (enum: government_id, proof_of_address, etc.)
- document_id (UUID, FK to document_uploads)
- status (enum: pending, approved, rejected, requires_resubmission)
- rejection_reason (TEXT)
- reviewed_by (UUID, FK to auth.users)
- reviewed_at (TIMESTAMP)
- created_at, updated_at
```

#### `admin_interviews`
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- scheduled_by (UUID, FK to auth.users)
- scheduled_at (TIMESTAMP)
- duration_minutes (INTEGER)
- meeting_link (TEXT)
- status (enum: scheduled, completed, cancelled, rescheduled, no_show)
- notes (TEXT)
- compliance_approved (BOOLEAN)
- created_at, updated_at
```

#### `crypto_payments`
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- payment_id (UUID, FK to payments)
- cryptocurrency (enum: USDT_TRC20, USDT_ERC20, BTC, ETH, USDC)
- wallet_address (TEXT)
- expected_amount (NUMERIC)
- transaction_hash (TEXT)
- network (TEXT)
- status (enum: pending, confirming, confirmed, failed)
- confirmations (INTEGER)
- created_at, updated_at
```

### Updated Tables

#### `profiles` (added columns)
- `country_code` - ISO country code
- `detected_country` - Full country name
- `ip_address` - User's IP address
- `vpn_detected` - Boolean flag for VPN detection
- `geo_zone` - Regional zone (nigeria, africa, international)

#### `payment_proofs` (added columns)
- `payment_account_name` - Name on payment account
- `name_verification_status` - (pending, verified, failed)

#### `payments` (added column)
- `payment_provider` - (paystack, flutterwave, skrill, crypto, bank_transfer)

---

## 8. Security Features

### Data Protection
- Row-Level Security (RLS) enabled on all tables
- User data isolated by `auth.uid()`
- Admin access via role-based policies

### VPN/Proxy Detection
- Multi-service verification (ipapi.co, vpnapi.io)
- Blocks suspicious connections
- Retry mechanism for legitimate users

### Account Name Verification
- Prevents fraudulent payments
- Normalized string comparison
- Admin review for mismatches

### Document Security
- Encrypted file storage
- Access controlled via RLS
- Audit trail for all actions

---

## 9. User Flow Diagrams

### Student Onboarding
```
Preload → Path Selection → Identity Creation → Geo Detection → 
Payment Method Selection → Payment Submission → Screenshot Upload → 
Name Verification → Admin Review (if needed) → Welcome
```

### Investor Onboarding
```
Preload → Path Selection → Identity Creation → Geo Detection → 
KYC Document Upload → Interview Request → Admin Scheduling → 
Compliance Interview → Payment → Welcome
```

---

## 10. Admin Workflows

### Payment Verification Workflow
1. User submits payment screenshot
2. System checks name verification
3. If name matches → Auto-approve or admin review
4. If name doesn't match → Flag for admin review
5. Admin reviews screenshot and details
6. Admin approves or rejects with reason
7. User notified of decision

### KYC Review Workflow
1. Investor uploads required documents
2. Documents appear in admin KYC tab
3. Admin reviews each document
4. Admin approves or rejects with reason
5. If approved → Investor can request interview
6. Admin schedules interview
7. Interview conducted
8. Compliance approval granted or denied

---

## 11. Environment Configuration

### Required Secrets
- `PAYSTACK_PUBLIC_KEY` - Paystack integration
- `PAYSTACK_SECRET_KEY` - Paystack webhook verification

### Optional Integrations
- Flutterwave API keys (for African payments)
- Skrill merchant credentials
- Crypto wallet addresses (configured in code)

---

## 12. Future Enhancements

### Planned Features
- [ ] Automated crypto payment verification via blockchain API
- [ ] Flutterwave payment gateway integration
- [ ] Skrill payment gateway integration
- [ ] Real-time interview video integration
- [ ] Automated KYC document OCR verification
- [ ] Payment reminders via email/SMS
- [ ] Referral tracking and rewards
- [ ] Multi-language support

---

## Support

For technical support or feature requests, contact the development team or create an issue in the repository.

**Admin Dashboard Access**: Navigate to `/admin` (requires admin privileges)
