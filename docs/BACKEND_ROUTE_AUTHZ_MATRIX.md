# Backend Route Authorization Matrix

Purpose: single source of truth for backend route authentication/authorization expectations.

Last updated: 2026-03-31

## Global Rules

- Every mounted API route must enforce authentication unless explicitly public.
- Role checks must be performed server-side; frontend role UI is not authorization.
- Parent writes/reads for child records require verified parent-child linkage.
- Teacher access to student/class data must be scoped to assigned class/school.
- Internal control-plane routes must fail closed on missing security config.

## Mounted Routes and Expected Access

| Mount Path | File | Auth Requirement | Notes |
|---|---|---|---|
| `/api/auth` | `backend/src/routes/auth.routes.ts` | Public entry + secure cookie issuance | PIN auth must be school-scoped + throttled |
| `/api/students` | `backend/src/routes/student.routes.ts` | Authenticated; teacher/admin scope checks | Student mutations require class/school scope |
| `/api/teacher` | `backend/src/routes/teacher.routes.ts` | `teacher`/`admin` only | No cross-school reads |
| `/api/homework` | `backend/src/routes/homework.routes.ts` | Authenticated + role action checks | Parent/child reads must be relationship-scoped |
| `/api/syllabuses` | `backend/src/routes/syllabus.routes.ts` | Authenticated; teacher/admin write | Shared/public syllabus operations audited |
| `/api/messages` | `backend/src/routes/message.routes.ts` | Authenticated | Thread participant checks on every read/write |
| `/api/progress` | `backend/src/routes/progress.routes.ts` | Authenticated | Child self-write / linked-parent write / scoped teacher read |
| `/api/ai` | `backend/src/routes/ai.routes.ts` | Authenticated + AI rate limit | Child-safe prompt/output rules required |
| `/api/admin` | `backend/src/routes/admin.routes.ts` | `admin`/`principal` only | School-scoped dashboards |
| `/api/attendance` | `backend/src/routes/attendance.ts` | Authenticated role checks | Class-scope enforcement required |
| `/api/push` | `backend/src/routes/push.routes.ts` | Authenticated user-bound subscriptions | Prevent cross-user token registration |
| `/api/classes` | `backend/src/routes/classes.ts` | Authenticated teacher/admin | Class ownership checks |
| `/api/ai-sessions` | `backend/src/routes/aiSessions.ts` | Authenticated + scoped reads | No cross-student session leakage |
| `/api/feedback` | `backend/src/routes/feedback.ts` | Authenticated + role checks | Student/parent privacy constraints |
| `/api/agents` | `backend/src/routes/agents.routes.ts` | Secret and/or role-gated per endpoint | Hardened Issues 1-10 completed |
| `/api/ecosystem` | `backend/src/routes/ecosystem.routes.ts` | Internal/admin only | Must not be open internet-facing |
| `/api/profiles` | `backend/src/routes/profiles.routes.ts` | Authenticated + owner/school checks | High privacy surface |
| `/api/diag` | `backend/src/routes/diag.routes.ts` | Internal/admin only | No public diagnostics |
| `/api/schools` | `backend/src/routes/schools.routes.ts` | Admin/super-admin only | Tenant boundaries enforced |
| `/api/assignments` | `backend/src/routes/assignments.routes.ts` | Authenticated + teacher/admin write | Parent/child read scope enforced |
| `/api/relationships` | `backend/src/routes/relationships.routes.ts` | Authenticated + strict ownership checks | Parent-child link integrity critical |
| `/api/activity` | `backend/src/routes/activity.routes.ts` | Authenticated + role checks | Media and post visibility rules |
| `/api/privacy` | `backend/src/routes/privacy.routes.ts` | Authenticated + owner/admin constraints | Export/delete/audit sensitivity |
| `/api/drawings` | `backend/src/routes/drawing.routes.ts` | Authenticated + owner checks | Child media privacy and deletion |
| `/api/modules` | `backend/src/routes/modules.routes.ts` | Authenticated read, restricted write | Curriculum integrity |
| `/api/tts` | `backend/src/routes/tts.routes.ts` | Authenticated + per-user limits | Abuse and cost controls |

## Verification Checklist (Use in PR Reviews)

- Route uses `requireAuth` (or explicit public exception documented).
- Role checks are explicit and fail closed.
- Parent-child and teacher-class scopes verified in data reads/writes.
- School/tenant boundary enforced in query predicates or access helper.
- Tests added/updated for allow and deny paths on changed endpoints.
