/* eslint-disable no-console */
// Release smoke checks for KinderSpark API.
//
// Usage:
//   node scripts/release-smoke.js
//
// Environment:
//   SMOKE_API_BASE=http://localhost:4000            (optional)
//   SMOKE_TEACHER_TOKEN=...                         (optional)
//   SMOKE_PARENT_TOKEN=...                          (optional)
//   SMOKE_ADMIN_TOKEN=...                           (optional)
//   SMOKE_CLASS_ID=...                              (optional)
//   SMOKE_CLASS_GROUP_ID=...                        (optional)
//   SMOKE_STUDENT_PROFILE_ID=...                    (optional)
//   SMOKE_PARENT_PROFILE_ID=...                     (optional)
//
// Notes:
// - Authenticated checks are skipped when required env vars are absent.
// - The script is intentionally read-safe; no destructive mutations.

const API_BASE = (process.env.SMOKE_API_BASE || 'http://localhost:4000').replace(/\/+$/, '')

async function call(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options)
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function assertStatus(label, got, accepted) {
  if (!accepted.includes(got)) {
    throw new Error(`${label}: expected [${accepted.join(', ')}], got ${got}`)
  }
  console.log(`PASS  ${label} -> ${got}`)
}

async function run() {
  console.log(`Running release smoke checks against ${API_BASE}`)

  // 1) Public health
  {
    const res = await call('/health')
    assertStatus('GET /health', res.status, [200])
  }

  // 2) Protected baseline checks (no token should be denied)
  {
    const checks = [
      ['/api/messages/threads', 401],
      ['/api/profiles/me', 401],
      ['/api/assignments/class-group/any', 401],
      ['/api/relationships/children/any', 401],
    ]
    for (const [path, expected] of checks) {
      const res = await call(path)
      assertStatus(`GET ${path} (no auth)`, res.status, [expected])
    }
  }

  // 3) Teacher guarded legacy messaging check
  // Expected: 200 for assigned class OR 403 for unassigned (both are valid secure outcomes).
  if (process.env.SMOKE_TEACHER_TOKEN && process.env.SMOKE_CLASS_ID) {
    const classId = encodeURIComponent(process.env.SMOKE_CLASS_ID)
    const res = await call(`/api/messages?classId=${classId}`, {
      headers: { ...authHeaders(process.env.SMOKE_TEACHER_TOKEN) },
    })
    assertStatus('GET /api/messages?classId=... (teacher token)', res.status, [200, 403])
  } else {
    console.log('SKIP  teacher legacy messaging check (missing SMOKE_TEACHER_TOKEN or SMOKE_CLASS_ID)')
  }

  // 4) Threaded messaging access checks
  if (process.env.SMOKE_TEACHER_TOKEN && process.env.SMOKE_CLASS_GROUP_ID) {
    const classGroupId = encodeURIComponent(process.env.SMOKE_CLASS_GROUP_ID)
    const res = await call(`/api/messages/threads?scopeType=classGroup&classGroupId=${classGroupId}`, {
      headers: { ...authHeaders(process.env.SMOKE_TEACHER_TOKEN) },
    })
    assertStatus('GET /api/messages/threads (teacher class-group)', res.status, [200, 403])
  } else {
    console.log('SKIP  teacher thread scope check (missing SMOKE_TEACHER_TOKEN or SMOKE_CLASS_GROUP_ID)')
  }

  if (process.env.SMOKE_PARENT_TOKEN && process.env.SMOKE_STUDENT_PROFILE_ID) {
    const studentProfileId = encodeURIComponent(process.env.SMOKE_STUDENT_PROFILE_ID)
    const res = await call(`/api/messages/threads?scopeType=student&studentProfileId=${studentProfileId}`, {
      headers: { ...authHeaders(process.env.SMOKE_PARENT_TOKEN) },
    })
    assertStatus('GET /api/messages/threads (parent student scope)', res.status, [200, 403])
  } else {
    console.log('SKIP  parent thread scope check (missing SMOKE_PARENT_TOKEN or SMOKE_STUDENT_PROFILE_ID)')
  }

  // 5) Ecosystem route ownership checks
  if (process.env.SMOKE_ADMIN_TOKEN && process.env.SMOKE_CLASS_GROUP_ID) {
    const classGroupId = encodeURIComponent(process.env.SMOKE_CLASS_GROUP_ID)
    const res = await call(`/api/assignments/class-group/${classGroupId}`, {
      headers: { ...authHeaders(process.env.SMOKE_ADMIN_TOKEN) },
    })
    assertStatus('GET /api/assignments/class-group/:id (admin/principal)', res.status, [200, 403])
  } else {
    console.log('SKIP  assignments class-group check (missing SMOKE_ADMIN_TOKEN or SMOKE_CLASS_GROUP_ID)')
  }

  if (process.env.SMOKE_PARENT_TOKEN && process.env.SMOKE_PARENT_PROFILE_ID) {
    const parentProfileId = encodeURIComponent(process.env.SMOKE_PARENT_PROFILE_ID)
    const res = await call(`/api/relationships/children/${parentProfileId}`, {
      headers: { ...authHeaders(process.env.SMOKE_PARENT_TOKEN) },
    })
    assertStatus('GET /api/relationships/children/:parentProfileId (parent)', res.status, [200, 403])
  } else {
    console.log('SKIP  relationships parent check (missing SMOKE_PARENT_TOKEN or SMOKE_PARENT_PROFILE_ID)')
  }

  console.log('Release smoke checks completed.')
}

run().catch((err) => {
  console.error(`FAIL  ${err.message}`)
  process.exit(1)
})

