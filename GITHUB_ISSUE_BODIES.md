# GitHub Issue Bodies (Copy/Paste Ready)

Use each block as a new GitHub issue.

## Agent Control Plane Hardening

- For the `agents.routes.ts` hardening batch, use `AGENTS_HARDENING_BACKLOG.md`.
- It includes a Cursor master prompt plus 10 copy-paste issue bodies in execution order.

---

## 1) [P0] Add Cross-Role Smoke Test Suite

**Labels:** `P0`, `qa`, `regression`, `roles`  
**Owner:** QA + Frontend

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

### Definition of Done
- CI job added
- Test report visible in PR checks
- Runbook note added for failures

---

## 2) [P1] Complete UI Token Coverage on Secondary Pages

**Labels:** `P1`, `frontend`, `design-system`, `ui-consistency`  
**Owner:** Frontend

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

### Definition of Done
- Lint clean
- Spot QA across mobile/tablet/desktop

---

## 3) [P0] Add Performance Baseline for Top 10 Routes

**Labels:** `P0`, `frontend`, `backend`, `performance`, `observability`  
**Owner:** Frontend + Backend

### Goal
Measure and track initial load + interactive time for core routes.

### Scope
- `/login`, `/pin`, `/child`, `/teacher`, `/parent`, `/admin`
- `/child/tutor`, `/child/lesson/[id]`, `/teacher/reports`, `/parent/messages`

### Acceptance Criteria
- Documented baseline for TTI and API latency
- P95 dashboard route latency published weekly
- Action list created for worst 3 routes

### Definition of Done
- Metrics doc committed
- Dashboard or report output available for team

---

## 4) [P0] Build Teacher “Autopilot Quick Actions” Panel

**Labels:** `P0`, `frontend`, `backend`, `teacher`, `ai`, `productivity`  
**Owner:** Frontend + Backend

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

### Definition of Done
- Teacher UX flow demo-ready
- Permission checks pass

---

## 5) [P1] Improve Parent Daily Co-Pilot Action Quality

**Labels:** `P1`, `frontend`, `product`, `parent`, `ux`  
**Owner:** Product + Frontend

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

### Definition of Done
- Telemetry added for action clicks
- Copy reviewed for clarity

---

## 6) [P1] Add Child “Resume Last Activity” Shortcut

**Labels:** `P1`, `frontend`, `child`, `engagement`  
**Owner:** Frontend

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

### Definition of Done
- Behavior validated on refresh/reopen
- Edge cases handled (deleted module, empty state)

---

## 7) [P1] Add Admin Pilot Metrics Summary Card

**Labels:** `P1`, `frontend`, `backend`, `admin`, `analytics`, `pilot`  
**Owner:** Backend + Frontend

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

### Definition of Done
- KPI definitions documented
- QA against known seed data

---

## 8) [P2] Create School Onboarding Starter Dataset

**Labels:** `P2`, `backend`, `onboarding`, `seed-data`  
**Owner:** Backend

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

### Definition of Done
- Seed script docs updated
- Verified in clean environment

---

## 9) [P0] Run Permission Matrix Regression Before Pilot

**Labels:** `P0`, `backend`, `qa`, `security`, `permissions`, `regression`  
**Owner:** Backend + QA

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

### Definition of Done
- Security review sign-off
- Test suite integrated into CI

---

## 10) [P1] Establish Weekly KPI Reporting Cadence

**Labels:** `P1`, `product`, `ops`, `kpi`, `operations`  
**Owner:** Product + Ops

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

### Definition of Done
- First 2 weekly reports completed
- Follow-up actions tracked to closure

