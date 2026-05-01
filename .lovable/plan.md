
## Phase 3: Support, Settings & Pipeline for Guardian Dashboard

### 1. Help & Support Section
Add a new "Help & Support" sidebar section to the Parent Dashboard with:
- **FAQ accordion** tailored for parents (hiring guides, dispute filing, refund requests)
- **Ticket submission form** using existing `support_tickets` table (subject, category, description, priority)
- **My Tickets list** showing ticket history with status badges
- Categories: General, Dispute, Refund, Tutor No-Show, Other

### 2. Settings Section
Add a "Settings" sidebar section with:
- **Account Security**: password change (via Supabase auth)
- **Notification Preferences**: toggles for email/SMS/push (stored in profiles or a new preferences column)
- **Saved Addresses**: manage home/tuition addresses
- **Privacy Controls**: toggle visibility of phone/email to tutors

### 3. Application Pipeline Enhancement
Update the applicant management to add:
- **"Contact Requested"** and **"Contact Released"** status stages in the application flow
- Sorting/filtering by application date, proposed rate
- Bulk shortlist/reject actions

### Technical Details
- Extend `SectionKey` type to include `'help' | 'settings'`
- Add sidebar items and bottom nav entries for Help & Settings
- Reuse existing `support_tickets` and `ticket_messages` tables (already in DB)
- Add `contact_status` column to `applications` table via migration for the contact pipeline stages
- No new tables needed for settings (use profile fields or a lightweight JSON column)
