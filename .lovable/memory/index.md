# Memory: index.md
Updated: now

# Project Memory

## Core
- English-only platform. No bilingual support or toggles.
- Strict 'one profile, one role' policy. No role switching.
- Mandatory vetting: all new users and jobs default to 'pending' for manual Admin approval.
- Bangladesh phone format is strictly 01XXXXXXXXX (11 digits, no +880, no dashes) globally.
- No internal messaging. Prevent bypassing of platform commission.
- Tech Stack: Supabase (RLS, Storage, Edge Functions), Lovable managed Google OAuth, PayStation gateway.
- Compact UI: 1200px max width container, 14px base font, 0.5rem unified border radius.

## Memories
- [Core Purpose & Geography](mem://platform/core-purpose-and-geography) — Home tuition marketplace for Bangladesh (64 districts), location-based matching
- [Monetization Strategy](mem://monetization/three-tier-model) — 3 tiers: Tutor subscriptions, commissions on matches, premium/featured listings
- [User Roles & Exclusivity](mem://auth/user-roles) — Four strict roles (Parent, Tutor, Agency, Admin), unique references
- [No Internal Messaging](mem://features/messaging-removal) — Messaging intentionally removed to protect business model
- [Dashboard UI Structure](mem://ui/dashboard-structure) — Consistent sidebar, /dashboard redirector, role-based pages
- [Google Managed Login](mem://auth/google-managed-login) — Google OAuth handled via Lovable Cloud
- [Featured Listings Automation](mem://features/featured-listings-automation) — pg_cron and Edge Functions deactivate expired profile boosts
- [Search & Conversion Flow](mem://ui/search-and-conversion-flow) — Dual search portal, SearchableSelect combobox, non-tutor redirect on apply
- [In-App Notifications](mem://features/notification-system) — Real-time alerts for applications, status changes, new local jobs
- [Regional Phone Format](mem://constraints/regional-phone-format) — Strict 01XXXXXXXXX 11-digit format
- [Visual Identity & Layout](mem://style/visual-identity) — Blue palette, sticky header, 1200px max width, 14px base font
- [PayStation Payment Gateway](mem://payments/payment-gateway-paystation) — Edge functions (paystation-init, paystation-webhook) for transactions
- [Super Admin Panel](mem://features/admin-management-suite) — Revenue tracking, tickets, impersonation, RBAC, CRUD
- [Tuition Jobs Lifecycle](mem://features/tuition-jobs) — MT-00001 refs, pending_approval default, multi-subject
- [Tutor Profile Requirements](mem://features/tutor-profile-requirements) — 70% completeness, personal/education data, 30s video intro
- [Demo Class Workflow](mem://features/demo-classes) — Parent requests are pending until Admin approval
- [Tutor Verification Badge](mem://features/tutor-verification-badge) — ৳50 fee via PayStation, admin togglable
- [Tutor CV Generation](mem://features/tutor-cv-generation) — PDF CV generated from dashboard HTML template
- [Platform Vetting Workflow](mem://features/platform-vetting-workflow) — Mandatory manual review for users and jobs
