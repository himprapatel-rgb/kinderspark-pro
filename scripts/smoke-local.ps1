# Local smoke checks for KinderSpark (run with frontend on :3000, backend on :4000).
# Usage: .\scripts\smoke-local.ps1
# Auth flows need PostgreSQL + migrate + seed (see docker-compose, prisma migrate/seed).

$ErrorActionPreference = 'Stop'
$fe = if ($env:SMOKE_FE_URL) { $env:SMOKE_FE_URL } else { 'http://localhost:3000' }
$be = if ($env:SMOKE_BE_URL) { $env:SMOKE_BE_URL } else { 'http://localhost:4000' }

$failed = 0

function Test-Url($name, $url, $expect = 200) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    $code = [int]$r.StatusCode
    if ($code -ne $expect) {
      Write-Host "[FAIL] $name -> $code (expected $expect)" -ForegroundColor Red
      $script:failed++
    } else {
      Write-Host "[ OK ] $name -> $code" -ForegroundColor Green
    }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $code = [int]$resp.StatusCode
      if ($code -eq $expect) {
        Write-Host "[ OK ] $name -> $code" -ForegroundColor Green
      } else {
        Write-Host "[FAIL] $name -> $code" -ForegroundColor Red
        $script:failed++
      }
    } else {
      Write-Host "[FAIL] $name -> $($_.Exception.Message)" -ForegroundColor Red
      $script:failed++
    }
  }
}

Write-Host "`n=== Backend ===" -ForegroundColor Cyan
try {
  $h = Invoke-RestMethod -Uri "$be/health" -Method Get
  Write-Host "[ OK ] GET /health -> $($h.status) db=$($h.db)" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] GET /health -> $($_.Exception.Message)" -ForegroundColor Red
  $failed++
}

try {
  $d = Invoke-RestMethod -Uri "$be/api/diag/recent" -Method Get
  if ($d.ok) { Write-Host "[ OK ] GET /api/diag/recent -> ok count=$($d.count)" -ForegroundColor Green }
  else { Write-Host "[FAIL] diag recent" -ForegroundColor Red; $failed++ }
} catch {
  Write-Host "[FAIL] GET /api/diag/recent -> $($_.Exception.Message)" -ForegroundColor Red
  $failed++
}

try {
  $body = '{"pin":"1234","role":"teacher","schoolCode":"SUN001"}'
  Invoke-RestMethod -Uri "$be/api/auth/pin" -Method Post -Body $body -ContentType 'application/json' | Out-Null
  Write-Host "[ OK ] POST /api/auth/pin (teacher demo)" -ForegroundColor Green
} catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  if ($code -eq 401 -or $code -eq 400) {
    Write-Host "[WARN] POST /api/auth/pin -> $code (expected if DB not seeded)" -ForegroundColor Yellow
  } elseif ($code -eq 500) {
    Write-Host "[WARN] POST /api/auth/pin -> 500 (check DATABASE_URL, migrate, seed)" -ForegroundColor Yellow
  } else {
    Write-Host "[FAIL] POST /api/auth/pin -> $code $($_.Exception.Message)" -ForegroundColor Red
    $failed++
  }
}

Write-Host "`n=== Frontend (static routes) ===" -ForegroundColor Cyan
@(
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/pin?role=teacher',
  '/pin?role=child',
  '/pin?role=parent',
  '/pin?role=admin',
  '/child',
  '/child/learn',
  '/child/settings',
  '/parent',
  '/parent/homework',
  '/parent/messages',
  '/parent/profile',
  '/teacher',
  '/teacher/profile',
  '/teacher/reports',
  '/admin',
  '/admin/profile',
  '/dashboard/agents'
) | ForEach-Object { Test-Url "GET $_" "$fe$_" 200 }

Write-Host "`nDone. Failures: $failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
exit $failed
