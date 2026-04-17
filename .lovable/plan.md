
The user wants to restructure the Admin Applications tab from a flat list of all applications into a **two-level drill-down view**:

**Level 1 — Jobs list**: Show jobs that have applications, with columns: Ref ID, Job Name, Posted Date, Status, # Applicants. Click a row to drill in.

**Level 2 — Applicants for that job**: Show the list of tutors who applied to the selected job, with action buttons per row (Shortlist, Hire/Accept, Reject, Withdraw, Invite, etc.) and the existing status filter chips (All, Pending, Shortlisted, Invited, Waiting, Accepted, Rejected, Withdrawn) scoped to just this job.

## Plan

### 1. Restructure Admin Applications tab (`src/pages/AdminDashboard.tsx`)

Add view state:
```ts
const [appsView, setAppsView] = useState<'jobs' | 'applicants'>('jobs');
const [selectedAppsJob, setSelectedAppsJob] = useState<any>(null);
```

**Jobs list view** (default):
- Group `allApplications` by `job_id` to derive a job list with `{ job, applicantCount, pendingCount, shortlistedCount }`.
- Render a table: Ref ID (`job_reference`) | Job Name | Posted Date | Job Status | Applicants (with pending/shortlisted sub-counts) | Action (View Applicants button).
- Search box filters by job title / reference.
- Sort by newest first.

**Applicants drill-in view** (when a job is selected):
- Header: "← Back to Jobs", job title, ref ID, posted date, job status badge.
- Status filter chips (existing All/Pending/Shortlisted/Invited/Waiting/Accepted/Rejected/Withdrawn), but counts scoped to the selected job.
- Applicants table: Tutor name + ref + avatar | Applied Date | Proposed Rate | Cover Message (truncated) | Status badge | Actions.
- Action buttons per row, conditional on current status:
  - Shortlist (if pending)
  - Invite to Demo (if shortlisted/pending)
  - Accept / Hire (any non-final)
  - Reject (any non-final)
  - Mark Withdrawn (admin override)
- Each action calls existing update logic on `applications.status` and refreshes data.

### 2. Reuse existing infrastructure

- Existing `allApplications` fetch already pulls jobs + tutor + profile data — no new query needed.
- Existing real-time channel will refresh both views automatically.
- Status update mutations and chip styling already exist; just scope them to `selectedAppsJob.id`.

### 3. UX polish

- Breadcrumb-style back button at top of Level 2.
- Empty states ("No applications yet" on jobs list, "No applicants match this filter" on drill-in).
- Preserve currently-selected status chip when switching jobs (default to All).

### Files to edit
- `src/pages/AdminDashboard.tsx` (only file)

### Out of scope (ask if wanted)
- URL persistence of selected job / filter
- Bulk actions on the drill-in view (already discussed earlier)
- CSV export of applicants per job

