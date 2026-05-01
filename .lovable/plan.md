
# Guardian Dashboard — Gap Analysis & Implementation Plan

## Current State vs Requirements

| Feature | Status | Notes |
|---------|--------|-------|
| **Dashboard Home** | |
| Active job posts count | Done | Shows open jobs count |
| Total applications received | Done | Shows total applicants |
| Shortlisted tutors count | Missing | Not shown as a stat card |
| Contact info released count | Missing | No "contact released" pipeline stage exists |
| Hired tutors count | Done | Shows "Hired" (in_progress jobs) |
| Active tuitions count | Missing | No separate tuition tracking |
| Quick action: Post a Job | Done | Button in sidebar + overview |
| Quick action: Browse Tutors | Done | Link in sidebar |
| Quick action: View Applications | Done | Sidebar nav to applicants |
| Free posting banner | Missing | No "Free Posting" badge/banner |
| **Profile & Family Management** | |
| Guardian personal info | Done | Name, phone, email, district, avatar via ParentProfileEdit |
| Multiple student profiles | Missing | No child/student profile management |
| Verification badges (phone, email, address) | Missing | Fields exist but no badges shown |
| **Post a Job (Free)** | |
| Core job form fields | Done | All key fields present |
| "Job Description Pitch" field | Partial | Description field exists but not branded as "pitch" |
| Save drafts | Missing | No draft saving capability |
| "Free Posting" badge | Missing | Not shown on form |
| University preference field | Missing | Not in job form |
| **My Job Posts** | |
| Status filters | Done | All, Active, Hired, Paused, Completed |
| Applications count per card | Done | Shows applicant count |
| Views count per card | Missing | No view tracking for jobs |
| Days posted per card | Done | Shows days/hours live |
| Edit, Pause, Repost, Delete | Done | All actions present |
| "Filled" and "Expired" status | Missing | Only open/in_progress/completed/cancelled/pending_approval |
| **Applications Inbox** | |
| Per-job application list | Done | Expandable per job |
| Tutor profile snapshot | Done | Photo, name, experience |
| Verified Badge (prominent) | Partial | Small checkmark, not prominent blue badge |
| University info | Missing | Not shown in application cards |
| Distance from home | Missing | Not calculated/shown |
| Ratings | Missing | No rating system exists |
| "Tutor's Application Pitch" | Partial | cover_message exists but not prominently displayed |
| Sort by match/rating/verified/proximity | Missing | No sorting options |
| **Application Pipeline** | |
| Stages: New, Shortlisted, Contact Requested, Contact Released, Hired, Rejected | Partial | Missing "Contact Requested" and "Contact Released" stages |
| Bulk actions | Missing | Only individual actions |
| **Browse Tutors Directly** | |
| Search/filter tutors | Done | Via /tutors page (external link) |
| "Verified Tutors Only" toggle | Missing | Not in tutor search |
| Direct contact request without job | Missing | No standalone contact request flow |
| **Demo Class Tracker** | |
| Demo booking list | Done | Shows all bookings |
| Mark completed/no-show | Partial | Can confirm or cancel, no "no-show" option |
| Post-demo feedback | Missing | No feedback/review submission |
| **Hired Tutors & Active Tuitions** | |
| Per-child tutor list | Missing | No child-linked tuition tracking |
| Schedule, salary, start date | Missing | No active tuition detail view |
| Hiring triggers commission | Missing | No commission confirmation flow |
| **Hiring Confirmation Flow** | |
| Structured confirmation form | Missing | Currently just "Accept" button |
| Both parties confirm details | Missing | No mutual confirmation |
| Commission record creation | Missing | No formal hiring contract |
| **Help & Support** | |
| FAQ section | Missing | No parent help page |
| Hiring guides | Missing | |
| Dispute filing | Partial | Report dialog exists for tutor issues |
| Refund requests | Missing | Table exists but no parent UI |
| Ticket system | Missing | Table exists but no parent UI |
| **Settings** | |
| Account security | Missing | No parent settings page |
| Notification preferences | Missing | |
| Saved addresses | Missing | |
| Privacy controls | Missing | |
| **Notifications** | |
| In-app notifications | Done | NotificationBell component |
| Email/SMS/push preferences | Missing | No preference management |

---

## Implementation Plan (4 Phases)

### Phase 1: Enhanced Dashboard Stats, Free Posting Banner & Verified Badge Prominence

1. Add missing stat cards: Shortlisted Tutors, Active Tuitions count
2. Add "Free Posting" banner on overview + badge on job form
3. Make verified badge prominent (blue checkmark) on application cards
4. Show tutor's cover_message (Application Pitch) prominently in applicant view
5. Show tutor university/education info in application cards

### Phase 2: Student Profiles, Hiring Confirmation & Active Tuitions

1. **Database**: Create `student_profiles` table (parent_id, name, age, class, school, medium, learning_needs) and `hiring_confirmations` table (application_id, agreed_salary, start_date, subjects, days_per_week, guardian_confirmed, tutor_confirmed)
2. Student profile CRUD in Profile section
3. Hiring confirmation flow — structured form when accepting a tutor
4. Active Tuitions section showing per-child hired tutors with details

### Phase 3: Help & Support, Settings, Sorting & Pipeline

1. Parent Help & Support page (FAQ, guides, ticket submission, refund requests)
2. Parent Settings page (notification prefs, privacy controls, saved addresses)
3. Application sorting (by verified status, experience, salary)
4. Add "Contact Requested" / "Contact Released" pipeline stages
5. Bulk actions for applicant management

### Phase 4: Job Views, Drafts, Demo Feedback & Reviews

1. Job view tracking (count views per job post)
2. Save draft jobs feature
3. Post-demo feedback/review submission
4. "Filled" and "Expired" job statuses with auto-expiry logic

Each phase is self-contained and can be shipped independently. Shall I start with Phase 1?
