# Agent Control Plane Hardening Backlog

Focused hardening plan for `backend/src/routes/agents.routes.ts`, designed for small, isolated tickets and low regression risk.

## Cursor Master Prompt

```text
You are working in the repo himprapatel-rgb/kinderspark-pro.

Goal:
Resolve backend issues in backend/src/routes/agents.routes.ts safely, one issue at a time, with minimal regressions.

Rules:
1. Only work on the single issue provided.
2. Do not refactor unrelated files.
3. Prefer small diffs.
4. Add or update tests for every behavior/security fix.
5. Preserve existing API shape unless the issue explicitly requires changing it.
6. If an env var is security-sensitive, fail closed, not open.
7. Replace permissive auth with explicit 401/403 responses.
8. Remove silent failure paths for critical operations.
9. Use TypeScript types instead of any wherever touched.
10. At the end of each issue, provide:
   - changed files
   - summary of fix
   - risks
   - test coverage added
   - follow-up issues noticed but not solved
```

## Working Rule

- One issue = one clear defect or one narrow refactor.
- One PR = one issue.
- Require tests for backend security or behavior changes.
- Do not combine auth, refactor, and UX changes in the same ticket.

---

## Issue 1 — Fix `agentAuth`

```text
Title: Fix broken agentAuth middleware in backend/src/routes/agents.routes.ts

Problem:
The current agentAuth middleware checks x-agent-secret but still calls next() when the secret is missing or invalid.

Why it matters:
This leaves agent-only endpoints effectively unprotected, including memory writes, inbox reads, broadcasts, and cross-agent messaging.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/__tests__/... (create if needed)

Tasks:
1. Update agentAuth so it returns 401 when x-agent-secret is missing or invalid.
2. Do not call next() after failed auth.
3. Add typed Express middleware signatures.
4. Add tests for:
   - valid secret => allowed
   - missing secret => 401
   - invalid secret => 401

Acceptance criteria:
- All routes using agentAuth reject unauthorized requests.
- Tests pass.
- No permissive fallback remains.
```

## Issue 2 — Fix `dashboardAuth`

```text
Title: Fix broken dashboardAuth middleware in backend/src/routes/agents.routes.ts

Problem:
dashboardAuth currently allows requests through when no Authorization header is present, and also falls through to next() without enforcing any real auth.

Why it matters:
This can expose dashboard/internal endpoints such as /memory, /conversations, /stats, /runs, and /trigger.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/middleware/auth.middleware.ts
- backend/src/__tests__/...

Tasks:
1. Replace dashboardAuth with strict authorization.
2. Allow either:
   - valid x-agent-secret for machine access, or
   - authenticated JWT user with role admin or teacher.
3. Remove anonymous dev bypass.
4. Add tests for:
   - valid secret => allowed
   - valid admin/teacher JWT => allowed
   - anonymous request => rejected
   - invalid secret => rejected

Acceptance criteria:
- No dashboard route is reachable anonymously.
- Only approved secret or authenticated teacher/admin can access dashboard routes.
- Tests pass.
```

## Issue 3 — Remove insecure default secret

```text
Title: Remove insecure AGENT_SECRET fallback and fail closed

Problem:
AGENT_SECRET currently defaults to 'ks-agent-secret' when the environment variable is missing.

Why it matters:
A predictable default secret makes protected agent endpoints trivial to access if deployed without proper config.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/config/... (create config module if needed)
- backend/src/index.ts or startup entry

Tasks:
1. Remove the hardcoded default secret fallback.
2. Add startup config validation for AGENT_SECRET where required.
3. Fail startup in production if AGENT_SECRET is missing.
4. Add tests for config validation behavior.

Acceptance criteria:
- Production cannot run with a default agent secret.
- Missing AGENT_SECRET produces an explicit error.
- No hardcoded secret remains.
```

## Issue 4 — Add request validation for all agent routes

```text
Title: Add schema validation to agent routes

Problem:
agents.routes.ts only performs minimal field presence checks and accepts loosely shaped request bodies.

Why it matters:
Malformed or oversized payloads can create bad memory records, invalid messages, unsafe metadata, or unexpected runtime behavior.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/validation/... (create if needed)

Tasks:
1. Introduce request validation using Zod or existing project validation pattern.
2. Validate payloads for:
   - /memory
   - /message
   - /broadcast
   - /trigger
   - /ask
   - /issue
3. Enforce string length limits and allowed enum-like values.
4. Return structured 400 errors on invalid payloads.

Acceptance criteria:
- Invalid payloads are rejected consistently.
- Route handlers no longer rely on ad hoc field checks alone.
- Tests cover common invalid payloads.
```

## Issue 5 — Stop silent failure in `/ask`

```text
Title: Remove silent fire-and-forget failure path in POST /api/agents/ask

Problem:
The /ask endpoint returns { ok: true } immediately, then performs AI and workflow operations in the background while swallowing failures.

Why it matters:
The UI can show success even when Claude response generation, memory writes, or workflow dispatch fail.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/services/... (create orchestration service if needed)

Tasks:
1. Refactor /ask so failures are observable.
2. Return a job/request ID or a concrete execution result.
3. Log failures for Claude calls, memory operations, and workflow dispatch.
4. Remove empty catch blocks for critical operations.
5. Add tests for failure scenarios.

Acceptance criteria:
- The caller can distinguish success, queued, and failure outcomes.
- Critical failures are logged and not silently ignored.
```

## Issue 6 — Lock down GitHub workflow trigger route

```text
Title: Harden POST /api/agents/trigger authorization and auditing

Problem:
The workflow trigger route is protected by dashboardAuth, which is currently permissive, and it triggers GitHub Actions workflows directly.

Why it matters:
Unauthorized callers could trigger operational workflows if auth remains weak.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/services/... (optional)
- backend/src/__tests__/...

Tasks:
1. Ensure /trigger is reachable only by:
   - admin/teacher JWT, or
   - valid machine secret if explicitly intended.
2. Add audit logging for workflow name, actor, timestamp, outcome.
3. Add input validation for workflow and inputs.
4. Add rate limiting or throttling protection.

Acceptance criteria:
- Unauthorized callers cannot trigger workflows.
- Every trigger attempt is logged safely.
- Tests cover allowed and denied cases.
```

## Issue 7 — Harden GitHub issue creation route

```text
Title: Harden POST /api/agents/issue authorization, validation, and response checks

Problem:
The route creates GitHub issues from request input and broadcasts the created issue without strong validation or role isolation.

Why it matters:
This can create spammy or malformed GitHub issues and may expose automation to abuse.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/__tests__/...

Tasks:
1. Restrict /issue to authenticated authorized users only.
2. Validate title, body, and labels.
3. Verify GitHub response status before assuming issue creation succeeded.
4. Only broadcast after confirmed successful issue creation.
5. Add tests for success and failure paths.

Acceptance criteria:
- Failed GitHub issue creation does not masquerade as success.
- Broadcast only happens after confirmed creation.
- Unauthorized callers are rejected.
```

## Issue 8 — Secure dashboard read endpoints

```text
Title: Apply least-privilege access rules to dashboard read endpoints

Problem:
Endpoints like /memory, /conversations, /stats, /runs, and /issues expose broad operational data and currently depend on weak dashboardAuth.

Why it matters:
Even after auth fixes, these routes need explicit role policy so sensitive operational data is not overexposed.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/middleware/auth.middleware.ts

Tasks:
1. Define route-by-route access rules.
2. Restrict all-system views to admin or authorized internal operator roles.
3. Keep teacher visibility only where business-appropriate.
4. Document the access matrix in code comments or a small internal doc.

Acceptance criteria:
- Each dashboard route has an explicit least-privilege rule.
- Broad cross-agent data is not available to unauthorized users.
```

## Issue 9 — Add SSE stability protections to `/feed`

```text
Title: Harden SSE /api/agents/feed against leaks and runaway connections

Problem:
The /feed route opens an SSE stream and polls every 15 seconds, but has limited protection against too many open streams or operational failure patterns.

Why it matters:
Long-lived connections can create memory pressure, noisy logs, or degraded service if left unmanaged.

Files:
- backend/src/routes/agents.routes.ts

Tasks:
1. Keep strict auth on /feed.
2. Add connection lifecycle safety and cleanup guarantees.
3. Add heartbeat/ping behavior intentionally.
4. Add basic observability for opened/closed streams.
5. Add tests where practical.

Acceptance criteria:
- Streams clean up correctly on disconnect.
- Feed behavior is bounded and observable.
```

## Issue 10 — Remove `any` types from this route

```text
Title: Replace any typing in backend/src/routes/agents.routes.ts

Problem:
The file uses req: any, res: any, and multiple loose casts.

Why it matters:
This removes TypeScript’s protection in a sensitive route that handles auth, AI, GitHub automation, and operational data.

Files:
- backend/src/routes/agents.routes.ts
- backend/src/types/... (create if needed)

Tasks:
1. Replace any with proper Express Request/Response/NextFunction types.
2. Define typed request body interfaces or schemas.
3. Remove loose casts where possible.
4. Keep behavior unchanged except for type safety improvements.

Acceptance criteria:
- File compiles without broad any usage in touched code.
- Types reflect actual request/response shapes.
```

---

## Execution Order

1. Issue 1 — `agentAuth`
2. Issue 2 — `dashboardAuth`
3. Issue 3 — `AGENT_SECRET` fail-closed
4. Issue 4 — request validation
5. Issue 6 — trigger hardening
6. Issue 7 — issue creation hardening
7. Issue 5 — `/ask` failure observability
8. Issue 8 — least-privilege dashboard reads
9. Issue 9 — SSE stability
10. Issue 10 — type cleanup

