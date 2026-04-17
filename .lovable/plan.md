
The user wants a shortlist → invite-to-demo → demo result workflow shared between Admins and Guardians.

Looking at the schema:
- `applications.status` is an enum `application_status` (currently uses 'pending', 'accepted', 'rejected'). I need to check if 'shortlisted' and 'invited' values exist.
- `demo_bookings` already exists with statuses pending/approved/confirmed/completed/cancelled and links parent_id + tutor_id.
- Admin Applications tab and Parent inline applicants list already exist.

I'll need to:
1. Extend `application_status` enum with `shortlisted` and `invited_to_demo`.
2. Add UI actions on both Admin Applications tab and Parent dashboard applicant rows.
3. "Invite to demo" opens a small dialog → creates a `demo_bookings` row (status `pending` if guardian-initiated requires admin approval per existing demo workflow memory; admin-initiated can go straight to `approved`). Application moves to `invited_to_demo`.
4. Guardian confirms result after demo (Confirmed → hire / Cancelled → reject) from a "Demo Classes" view in Parent dashboard. This already partly exists via `demo_bookings` but no parent-side result UI.
5. Admin sees demo bookings + can take action (approve invite, mark completed, refund, etc.) — admin already has SupportTickets/Revenue tabs but no dedicated Demo Bookings tab. Add one.
6. Notifications to tutor at each step (shortlisted, invited, demo approved, demo result).

## Plan

### 1. Database (migration)
- Add values to `application_status` enum: `shortlisted`, `invited_to_demo`.
- (Optional) Add `application_id` nullable column to `demo_bookings` to link the invite back to the application.

### 2. Workflow

```text
[pending] --shortlist--> [shortlisted] --invite--> [invited_to_demo] --hire--> [accepted]
                                                                  \-reject--> [rejected]
```

Demo lifecycle (existing `demo_bookings.status`):
`pending → approved (admin) → confirmed (tutor) → completed/cancelled (parent result)`

### 3. Parent Dashboard (`src/pages/ParentDashboard.tsx`)
- Inline applicants list + "All Applicants" table: add buttons
  - **Shortlist** (when status = pending) → updates application to `shortlisted` + notifies tutor.
  - **Invite to Demo** (when status = pending or shortlisted) → opens dialog (date, time, duration, fee). Creates `demo_bookings` row (status `pending` for admin approval, per platform vetting memory) and sets application to `invited_to_demo` + notifies tutor.
  - Existing **Hire** / **Reject** buttons remain.
- New sidebar item **Demo Classes**: lists this parent's `demo_bookings`. After status = `completed` or `confirmed`, parent sees:
  - **Mark Result: Confirmed (Hire Tutor)** → sets demo_booking `completed`, application `accepted`, job `in_progress`.
  - **Mark Result: Cancelled** → opens reason field → demo `cancelled`, application stays.
  - Optionally **Request Refund** → creates `refund_requests` row.

### 4. Admin Dashboard (`src/pages/AdminDashboard.tsx`)
- Applications tab: same shortlist / invite-to-demo / hire / reject buttons (admin acts on behalf of parent).
- New sidebar item **Demo Classes** with badge for pending demo approvals:
  - Pending invites → **Approve** / **Reject** the demo invite (sets demo_booking `approved`/`cancelled`).
  - Confirmed/completed demos → review parent's reported result; can take action (issue refund, ban tutor via existing tools, mark dispute).

### 5. Notifications (client-side inserts to `notifications` table)
- Tutor on shortlist: "You've been shortlisted for {job}".
- Tutor on demo invite: "Demo class invitation for {job} on {date} at {time}".
- Parent + Tutor when admin approves the demo invite.
- Tutor on parent-reported demo result (confirmed/cancelled).

### 6. Files to edit/create
- New migration: alter `application_status` enum.
- `src/pages/ParentDashboard.tsx` — new buttons, invite-to-demo dialog, "Demo Classes" sidebar section + result UI.
- `src/pages/AdminDashboard.tsx` — same action buttons in Applications tab + new "Demo Classes" sidebar section with admin actions.
- Reuse existing `BookDemoClassDialog.tsx` styling/structure but a slimmer parent-initiated invite form.

### 7. Out of scope (won't do unless asked)
- Tutor-side accept/decline of demo invite UI (tutors already have demo_bookings RLS to update status, but a polished UI is separate work).
- Automated payment for demo at invite time — keeping fee field manual; payment handled by existing PayStation flow elsewhere.
