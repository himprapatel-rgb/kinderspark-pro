# KinderSpark Market Readiness Checklist

## 1) Security and Permission Regression

- Re-verify role guard coverage for all sensitive endpoints:
  - teacher/admin generation endpoints
  - parent/child ownership endpoints
  - admin analytics endpoints
- Re-run API regression tests before release.
- Confirm no production default secrets are in use.

## 2) Reliability and Fallbacks

- AI routes must have deterministic fallback responses.
- Weather/location widgets must fail gracefully.
- Message stream must degrade to polling without blocking UI.
- Critical routes must show consistent loading/error/empty states.

## 3) School Onboarding Readiness

- Seed scripts produce a demo-ready school/class dataset.
- Role logins validated end-to-end for teacher/child/parent/admin.
- Setup docs match current deploy process.

## 4) KPI Reporting Readiness

- Weekly KPI owner assigned for:
  - learning outcomes
  - engagement
  - parent communication
  - screen health
- Baseline dashboard snapshots archived weekly.

## 5) Launch Controls

- Feature flags for high-risk modules enabled by cohort.
- Staged rollout sequence defined:
  1) internal/staging
  2) pilot school
  3) broader school cohort
- Rollback plan and incident owner defined before rollout.

