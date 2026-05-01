# Phase A: Commission & Hire System ✅

Track hires, auto-calculate commission, record offline payments (bKash/cash), overdue reminders.
- `commission_records`, `commission_payments` tables
- `AdminHiresTab`, `AdminCommissionTab` components

# Phase B: Operations & Accountability ✅

Internal notes per user, phone follow-up logs, master audit log for all admin actions.
- `internal_notes`, `phone_followups`, `activity_logs` tables
- `AdminNotesWidget`, `AdminPhoneLogTab`, `AdminActivityLogTab` components
- `logAdminAction` helper retrofitted across dashboard

# Phase C: User Detail Views ✅

360° guardian/tutor detail pages with full activity timelines and financial history.
- `/admin/guardian-detail/:id` and `/admin/tutor-detail/:id` routes
- Stats cards, tabbed views (Applications, Hires, Finance, Notes, Activity)

# Phase D: Intelligence & Pipeline ✅

Smart matching tools, pipeline visualizations, admin "apply/shortlist on behalf" workflows.
- `AdminSmartMatchTab` — Score-based tutor-job matching (district +30, area +15, gender +15, subject +20 each, budget +10, verified +10, experience up to +15). Apply/shortlist/accept on behalf with notifications.
- `AdminPipelineTab` — Conversion funnel visualization (Jobs Posted → With Applications → Shortlisted → Demo → Accepted → Hired) with period filters, conversion rate cards, and per-job stage breakdown.
- New "Intelligence" sidebar group with both tabs.

# Phase E: Financials & Reports ✅

Unified transaction ledger, PDF invoice generation, conversion funnel analytics.
- `AdminTransactionLedgerTab` — Unified ledger merging payment_transactions, commission_records, and commission_payments with filters (type, status, date range), summary cards, and CSV export.
- `AdminInvoiceTab` — Invoice generation from commission records with print and HTML download. Professional branded invoice template.
- `AdminConversionFunnelTab` — Visual funnel (Signups → Tutor Profiles → Jobs → Applications → Shortlisted → Accepted → Hired) with period filters and 6-month trend table.

# Phase F: Content & Mobile

CMS for FAQ/Terms, notification templates, mobile-optimized quick actions.
