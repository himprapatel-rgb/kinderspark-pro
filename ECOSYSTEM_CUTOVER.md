# Ecosystem Cutover and Dual-Read Runbook

## Goal
Migrate from legacy role tables (`Admin`, `Teacher`, `Student`, `Class`) to normalized identity/profile relationships without downtime.

## Rollout Phases

1. Additive schema migration
- Run Prisma migration `20260327_full_ecosystem_profiles`.
- Keep all legacy tables and routes active.

2. Backfill
- Run:
  - `cd backend`
  - `npm run prisma:backfill-ecosystem`
- Verify row counts:
  - `User`, `RoleAssignment`, `TeacherProfile`, `StudentProfile`, `ParentProfile`, `ClassGroup`, `StudentClassEnrollment`.

3. Dual-read period
- Auth first tries new `User` identity model and falls back to legacy tables.
- New profile/assignment/relationship APIs available under:
  - `/api/profiles`
  - `/api/schools`
  - `/api/assignments`
  - `/api/relationships`
- Existing APIs continue serving legacy model data.

4. Progressive frontend switch
- Profile pages consume `/api/profiles/me`.
- Role switcher uses `availableRoles` and `switchRole` state.
- Keep legacy pages and flows unchanged until relationship-aware pages are fully migrated.

5. Final cutover (future release)
- Move remaining legacy route reads to normalized tables.
- Freeze writes to legacy role tables.
- Remove legacy fallback logic in auth once parity is verified.
- Deprecate old tables in a dedicated migration.

## Verification Checklist

- Login works for teacher/admin/child/parent accounts.
- Role switching works for multi-role users.
- Parent-child links restrict access to linked children only.
- Teacher sees only assigned class groups in normalized endpoints.
- School overview renders class, teacher, and student counts.

## Rollback

- Do not drop legacy tables during dual-read.
- If new model APIs regress, revert frontend usage to legacy APIs while keeping migration data intact.
- Auth fallback preserves operational login paths.
