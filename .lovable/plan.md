
# Phase A: Commission & Hire System

## What This Builds

A complete hire-to-commission pipeline in the admin dashboard, covering:
1. **Hires Management Tab** - View/manage all hiring confirmations, record hires manually, track hire lifecycle
2. **Commission Tracking** - Auto-calculate 60% commission on confirmed hires, track collection status
3. **Manual Payment Entry** - Record offline payments (bKash, cash, bank transfer) against commission invoices
4. **Commission Reminders** - Flag overdue commissions, send reminder notifications

---

## Database Changes

### New table: `commission_records`
Tracks commission owed and collected per hire:
- `id`, `hiring_confirmation_id` (FK), `tutor_id`, `parent_id`, `job_id`
- `agreed_salary`, `commission_pct`, `commission_amount`, `amount_paid`, `amount_due`
- `status` (pending, partial, paid, waived)
- `due_date`, `created_at`, `updated_at`
- RLS: admin-only CRUD

### New table: `commission_payments`
Individual payment entries against a commission record:
- `id`, `commission_id` (FK), `amount`, `payment_method` (bkash/cash/bank/online)
- `payment_reference`, `received_by` (admin user_id), `notes`
- `payment_date`, `created_at`
- RLS: admin-only CRUD

### Migration on `hiring_confirmations`
- Add `commission_status` column (text, default 'pending') to quickly filter hires by commission state
- Add `admin_notes` column (text, nullable) for internal notes

---

## New Components

### 1. `AdminHiresTab` (`src/components/admin/AdminHiresTab.tsx`)
- Table of all `hiring_confirmations` joined with profiles, jobs
- Status filters (pending_tutor, confirmed, cancelled)
- "Record Hire" dialog for admin to manually create a hire from an application
- Detail view showing tutor/parent info, agreed salary, commission breakdown
- Button to create commission record upon hire confirmation

### 2. `AdminCommissionTab` (`src/components/admin/AdminCommissionTab.tsx`)
- Summary cards: total owed, total collected, overdue count
- Table of all commission records with status badges
- "Record Payment" dialog: amount, method (bKash/cash/bank), reference number, date
- Overdue highlighting (configurable days threshold from platform_settings)
- "Send Reminder" button that creates a notification for the tutor
- Waive commission option with reason

---

## Admin Dashboard Integration

- Add two new sidebar items under the "Finance" group:
  - "Hires" (value: `hires`, icon: CheckCircle2)
  - "Commissions" (value: `commissions`, icon: Percent)
- Wire `activeTab === 'hires'` and `activeTab === 'commissions'` to render the new components

---

## Commission Calculation Logic

Uses existing `src/lib/commission.ts` (`getPlatformCommissionPct`, `computeFeeSplit`). When a hire is confirmed:
- Fetch `platform_commission_pct` from `platform_settings` (default 20%)
- Calculate: `commission_amount = agreed_salary * commission_pct / 100`
- Auto-create a `commission_records` row with `due_date` = hire start_date + 30 days

---

## Implementation Order

1. Database migration (2 new tables + alter hiring_confirmations)
2. `AdminHiresTab` component
3. `AdminCommissionTab` component  
4. Wire both into AdminDashboard sidebar and tab renderer
