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

# Phase F: Content & Mobile ✅

CMS for FAQ/Terms, notification templates, mobile-optimized quick actions.
- `cms_pages` table with RLS (public read for published, admin full access).
- `notification_templates` table with RLS (admin-only).
- `AdminCMSTab` — Create/edit/publish CMS pages (FAQ, Terms, Privacy, custom). Markdown/HTML content editor, preview, publish/unpublish toggle.
- `AdminNotificationTemplatesTab` — Manage in-app notification templates with {{variable}} placeholders. Seed defaults, edit, enable/disable, live preview with sample data.
- `AdminMobileQuickActions` — 4-column grid of quick-access buttons (mobile only) on the Overview tab with badge counts for pending items.
- New "Content" sidebar group with CMS Pages and Notification Templates tabs.

# Phase G: Gap Closure — Command Center & Operations ✅

Closing gaps identified in the 20-point admin dashboard audit.

## Command Center (AdminCommandCenter)
- Real-time "Today's Activity" widgets: guardian signups, tutor signups, jobs posted, applications, hires confirmed — with yesterday comparison trends.
- Revenue snapshot: today, this week, this month, plus commission due/overdue totals.
- Pending action items with quick-navigate buttons.

## Operations Tools (AdminOperationalTools)
- `AdminSendNotification` — Send individual in-app notifications to any user by search.
- `AdminManualContactRelease` — Release guardian contact info to a tutor for a specific application.
- `AdminOfflinePaymentEntry` — Record bKash/Nagad/cash commission payments with amount, method, reference.
- `AdminCommissionReminders` — View outstanding commissions, send payment reminder notifications to tutors.

## Enforcement & Disputes (AdminEnforcementTab)
- `AdminEnforcementTab` — Scan overdue commissions, auto-mark as overdue, suspend tutors with confirmation dialog. Bans profile, disables availability, sends notification.
- `AdminDisputeQueueTab` — Commission dispute resolution queue. Actions: enforce full, reduce amount, or waive entirely. Notifies tutor of resolution.

## Sidebar Reorganization
- New "Operations" sidebar group: Send Notification, Contact Release, Offline Payments, Commission Reminders, Enforcement, Dispute Queue.

# Phase H: Gap Closure — Bulk Actions, Comms Log, Refunds, KPIs ✅

Addressing remaining critical gaps from the 20-point admin dashboard audit.

## Bulk Actions (AdminBulkActionsTab)
- Multi-select pending users or pending jobs with checkboxes.
- Bulk approve or reject with confirmation dialog and audit logging.

## Communication Log (AdminCommunicationLogTab)
- Full history of all in-app notifications sent (broadcasts, application updates, admin notices).
- Filter by type, search by title/message, paginated view.
- CSV export for record-keeping.

## Refund Management (AdminRefundTab)
- View completed payments, process full or partial refunds.
- Refund reason tracking, amount validation, user notification.
- Summary cards: total payments, refund count, refund amount.
- DB: Added `refund_reason`, `refund_amount`, `refunded_at` columns to `payment_transactions`.

## Performance KPIs (AdminPerformanceKPIs)
- 30-day metrics with month-over-month change percentages on Overview tab.
- KPIs: New Signups, Jobs Posted, Applications, Hires, Revenue, Conversion Rate, Pending Verifications.
- Trend indicators (up/down arrows with percentage changes).

## Sidebar Updates
- Operations: Added Bulk Actions tab.
- Communication: Added Communication Log tab.
- Finance: Added Refunds tab.
