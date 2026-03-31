# KinderSpark Issue Pack (Ready for GitHub)

Use these as direct GitHub issues. Each includes priority, owner role, scope, and acceptance criteria.

---

## Issue 1: Add Cross-Role Smoke Test Suite

- **Priority:** P0
- **Owner:** QA + Frontend
- **Labels:** `qa`, `regression`, `roles`

### Goal
Create a repeatable smoke suite for teacher, child, parent, and admin critical flows.

### Scope
- Teacher: class select, homework create, message send, report generate
- Child: dashboard load, activity open, lesson complete
- Parent: dashboard load, message read/reply, homework status view
- Admin: stats load, leaderboard load, class analytics load

### Acceptance Criteria
- One command runs all smoke checks
- Failures identify route + step
- Baseline pass rate >= 95% on staging

---

## Issue 2: Complete UI Token Coverage (Secondary Pages)

- **Priority:** P1
- **Owner:** Frontend
- **Labels:** `design-system`, `ui-consistency`

### Goal
Finish replacing remaining one-off spacing/surface/button styles on secondary routes.

### Scope
- Teacher builder/reports subviews
- Parent homework/messages subviews
- Child secondary activity pages
- Admin secondary analytics blocks

### Acceptance Criteria
- No major hardcoded card/bg/spacing values on target pages
- Shared tokens/classes used for surfaces, inputs, tabs, buttons
- Visual regression screenshots show consistent spacing rhythm

---

## Issue 3: Performance Baseline for Top 10 Routes

- **Priority:** P0
- **Owner:** Frontend + Backend
- **Labels:** `performance`, `observability`

### Goal
Measure and track initial load + interactive time for core routes.

### Scope
- `/login`, `/pin`, `/child`, `/teacher`, `/parent`, `/admin`
- `/child/tutor`, `/child/lesson/[id]`, `/teacher/reports`, `/parent/messages`

### Acceptance Criteria
- Documented baseline for TTI and API latency
- P95 dashboard route latency published weekly
- Action list created for worst 3 routes

---

## Issue 4: Teacher Autopilot Quick Actions Panel

- **Priority:** P0
- **Owner:** Frontend + Backend
- **Labels:** `teacher`, `ai`, `productivity`

### Goal
Give teachers one-click AI actions for daily planning tasks.

### Scope
- Generate homework draft
- Build quick syllabus draft
- Generate weekly report draft

### Acceptance Criteria
- All actions accessible within 1 click from teacher home
- Outputs editable before save/send
- Error states have graceful fallback text

---

## Issue 5: Parent Daily Co-Pilot Improvement

- **Priority:** P1
- **Owner:** Product + Frontend
- **Labels:** `parent`, `ux`

### Goal
Improve parent’s daily “what should I do now” card quality.

### Scope
- Better action ranking (urgency + impact)
- Simpler wording for next step
- 5-minute helper guidance block

### Acceptance Criteria
- Parent dashboard shows one clear daily action
- Action includes expected time and benefit
- Parent click-through on action improves week-over-week

---

## Issue 6: Child Resume-Last-Activity Shortcut

- **Priority:** P1
- **Owner:** Frontend
- **Labels:** `child`, `engagement`

### Goal
Help children continue from where they stopped, instantly.

### Scope
- Save last active module/activity in local state
- Show “Resume” card in child dashboard hero zone
- Fallback to next recommended activity if none

### Acceptance Criteria
- Resume card appears when prior activity exists
- Navigation resumes correct route/state
- No impact to current “Continue Learning” behavior

---

## Issue 7: Admin Pilot Metrics Card

- **Priority:** P1
- **Owner:** Backend + Frontend
- **Labels:** `admin`, `analytics`, `pilot`

### Goal
Add pilot-level KPI summary in admin dashboard.

### Scope
- Completion rate
- Weekly active users by role
- Parent read/reply rate
- At-risk class count

### Acceptance Criteria
- Metrics visible in single admin panel block
- Values update from real data (no placeholders)
- Handles empty data gracefully

---

## Issue 8: School Onboarding Starter Dataset

- **Priority:** P2
- **Owner:** Backend
- **Labels:** `onboarding`, `seed-data`

### Goal
Provide clean starter templates for new school/class setup.

### Scope
- Seed starter classes/students/modules safely
- Minimal setup wizard assumptions
- Region-agnostic naming defaults

### Acceptance Criteria
- New environment can be demo-ready in <10 minutes
- Seed does not expose sensitive/internal defaults
- Starter data supports all four roles

---

## Issue 9: Permission Matrix Regression Before Pilot

- **Priority:** P0
- **Owner:** Backend + QA
- **Labels:** `security`, `permissions`, `regression`

### Goal
Re-run route-level role/ownership verification before pilot release.

### Scope
- Re-check role guards on sensitive endpoints
- Re-check parent/child ownership constraints
- Re-check teacher/admin scope boundaries

### Acceptance Criteria
- Updated permission matrix documented
- All critical endpoints covered by tests
- No unauthorized access paths in regression report

---

## Issue 10: Weekly KPI Reporting Cadence

- **Priority:** P1
- **Owner:** Product + Ops
- **Labels:** `kpi`, `operations`

### Goal
Establish a weekly KPI review routine with owners and actions.

### Scope
- Define owners per KPI
- Define source of truth per KPI
- Weekly review template + action tracker

### Acceptance Criteria
- Weekly KPI summary posted on fixed day/time
- Each KPI has owner + threshold + trend
- Underperforming KPI gets next-step action item

---

## Suggested Label Set

- `P0`, `P1`, `P2`
- `frontend`, `backend`, `qa`, `product`
- `ai`, `design-system`, `security`, `performance`, `analytics`

## Suggested Milestones

- `M1 Product Quality Baseline`
- `M2 Signature Differentiators`
- `M3 Pilot Readiness`

