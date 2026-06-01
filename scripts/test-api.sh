#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Salonin API — Full endpoint test suite
# Usage: bash scripts/test-api.sh 2>&1 | tee scripts/test-results.txt
# ─────────────────────────────────────────────────────────────────────────────

set -eo pipefail

BASE="https://salonin-production.up.railway.app"
TS=$(date +%s)
WORKER_EMAIL="test-worker-${TS}@salonin.test"
SALON_EMAIL="test-salon-${TS}@salonin.test"
PASSWORD="TestPass123!"

PASSED=0
FAILED=0
SLOW=0
TOTAL_MS=0
COUNT=0
BODY=""
STATUS=""
MS=0

# macOS-compatible milliseconds via python3
now_ms() { python3 -c "import time; print(int(time.time() * 1000))"; }

# ── helpers ──────────────────────────────────────────────────────────────────

ok()   { echo "✅  $*"; }
fail() { echo "❌  $*"; }
slow() { echo "⚠️   $*"; }

# call <label> <expected_status> [curl_flags...]
# Stores response in $BODY, status in $STATUS, time in $MS
call() {
  local label="$1"
  local expected="$2"
  shift 2

  local tmpfile
  tmpfile=$(mktemp)
  BODY=""
  STATUS="000"
  MS=0

  local start end ms
  start=$(now_ms)
  STATUS=$(curl -s -o "$tmpfile" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    --max-time 10 \
    "$@" 2>/dev/null) || STATUS="000"
  end=$(now_ms)
  ms=$(( end - start ))
  MS=$ms
  BODY=$(cat "$tmpfile")
  rm -f "$tmpfile"

  COUNT=$(( COUNT + 1 ))
  TOTAL_MS=$(( TOTAL_MS + ms ))

  # Determine pass/fail/slow (expected can be space-separated list)
  local matched=false
  for e in $expected; do
    [[ "$STATUS" == "$e" ]] && matched=true && break
  done
  if [[ "$matched" == "false" ]]; then
    FAILED=$(( FAILED + 1 ))
    fail "$label — HTTP $STATUS (expected $expected) — ${ms}ms"
    if [[ -n "$BODY" ]]; then
      echo "     body: $(echo "$BODY" | head -c 200)"
    fi
    return 1
  fi

  if (( ms > 2000 )); then
    FAILED=$(( FAILED + 1 ))
    fail "$label — ${ms}ms CRITICAL >2000ms"
    return 1
  elif (( ms > 500 )); then
    SLOW=$(( SLOW + 1 ))
    slow "$label — ${ms}ms (SLOW >500ms)"
  else
    PASSED=$(( PASSED + 1 ))
    ok "$label — ${ms}ms"
  fi
  return 0
}

# ── section header ────────────────────────────────────────────────────────────
section() { echo; echo "── $* ──────────────────────────────────────────────"; }

WORKER_TOKEN=""
WORKER_REFRESH=""
WORKER_ID=""
SALON_TOKEN=""
SALON_REFRESH=""
SALON_USER_ID=""
WORKER_PROFILE_ID=""
SALON_PROFILE_ID=""
JOB_ID=""
APP_ID=""
CONV_ID=""
MSG_ID=""

# ─────────────────────────────────────────────────────────────────────────────
section "AUTH FLOW"
# ─────────────────────────────────────────────────────────────────────────────

# 1. Register worker
call "POST /auth/register (worker)" "201" \
  -X POST "$BASE/auth/register" \
  -d "{\"name\":\"Test Worker\",\"email\":\"$WORKER_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"WORKER\",\"cityId\":\"dmv\"}" || true

# 2. Register salon
call "POST /auth/register (salon)" "201" \
  -X POST "$BASE/auth/register" \
  -d "{\"name\":\"Test Salon\",\"email\":\"$SALON_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"SALON\",\"cityId\":\"dmv\"}" || true

# 3. Login worker → capture token
call "POST /auth/login (worker)" "200" \
  -X POST "$BASE/auth/login" \
  -d "{\"email\":\"$WORKER_EMAIL\",\"password\":\"$PASSWORD\"}" || true
WORKER_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
WORKER_REFRESH=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "")
WORKER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

# 4. Login salon → capture token
call "POST /auth/login (salon)" "200" \
  -X POST "$BASE/auth/login" \
  -d "{\"email\":\"$SALON_EMAIL\",\"password\":\"$PASSWORD\"}" || true
SALON_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
SALON_REFRESH=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "")
SALON_USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

# 5. Refresh tokens
if [[ -n "$WORKER_REFRESH" ]]; then
  call "POST /auth/refresh (worker)" "200" \
    -X POST "$BASE/auth/refresh" \
    -d "{\"refreshToken\":\"$WORKER_REFRESH\"}" || true
  # Update both tokens after rotation
  NEW_WORKER_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
  NEW_WORKER_REFRESH=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "")
  [[ -n "$NEW_WORKER_TOKEN" ]] && WORKER_TOKEN="$NEW_WORKER_TOKEN"
  [[ -n "$NEW_WORKER_REFRESH" ]] && WORKER_REFRESH="$NEW_WORKER_REFRESH"
fi

# 6. Logout — requires Bearer token (JwtAuthGuard) + returns 204
call "POST /auth/logout (worker)" "204" \
  -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d "{\"refreshToken\":\"$WORKER_REFRESH\"}" || true

# Re-login after logout
call "POST /auth/login (re-login after logout)" "200" \
  -X POST "$BASE/auth/login" \
  -d "{\"email\":\"$WORKER_EMAIL\",\"password\":\"$PASSWORD\"}" || true
WORKER_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
WORKER_REFRESH=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 || echo "")

# ─────────────────────────────────────────────────────────────────────────────
section "WORKERS"
# ─────────────────────────────────────────────────────────────────────────────

call "GET /workers/nearby (PostGIS)" "200" \
  "$BASE/workers/nearby?lat=38.9072&lng=-77.0369&radiusMiles=15&cityId=dmv" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

# Verify no NOT_AVAILABLE in results
if echo "$BODY" | grep -q '"NOT_AVAILABLE"'; then
  fail "GET /workers/nearby — contains NOT_AVAILABLE workers"
  FAILED=$(( FAILED + 1 ))
fi

call "GET /workers/me" "200" \
  "$BASE/workers/me" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true
WORKER_PROFILE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /workers/:id (public)" "200" \
  "$BASE/workers/${WORKER_PROFILE_ID:-missing}" || true

call "PATCH /workers/me (update bio)" "200" \
  -X PATCH "$BASE/workers/me" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d '{"bio":"API test bio updated"}' || true

call "PATCH /workers/availability (NOW)" "200" \
  -X PATCH "$BASE/workers/availability" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d '{"availability":"NOW"}' || true

call "POST /workers/location" "204" \
  -X POST "$BASE/workers/location" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d '{"lat":38.9072,"lng":-77.0369}' || true

# ─────────────────────────────────────────────────────────────────────────────
section "SALONS"
# ─────────────────────────────────────────────────────────────────────────────

call "GET /salons/me" "200" \
  "$BASE/salons/me" \
  -H "Authorization: Bearer $SALON_TOKEN" || true
SALON_PROFILE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /salons/:id (public)" "200" \
  "$BASE/salons/${SALON_PROFILE_ID:-missing}" || true

call "PATCH /salons/me (update bio)" "200" \
  -X PATCH "$BASE/salons/me" \
  -H "Authorization: Bearer $SALON_TOKEN" \
  -d '{"description":"We are a premium test salon."}' || true

call "PATCH /salons/hiring-status (isHiring=true)" "200" \
  -X PATCH "$BASE/salons/hiring-status" \
  -H "Authorization: Bearer $SALON_TOKEN" \
  -d '{"isHiring":true}' || true

# ─────────────────────────────────────────────────────────────────────────────
section "JOBS"
# ─────────────────────────────────────────────────────────────────────────────

EXPIRES_AT=$(date -u -v+30d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+30 days' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo "2026-07-01T00:00:00Z")

call "POST /jobs (create)" "201" \
  -X POST "$BASE/jobs" \
  -H "Authorization: Bearer $SALON_TOKEN" \
  -d "{\"title\":\"API Test Job\",\"description\":\"Test job from automated suite\",\"specialty\":\"Hairstylist\",\"payStructure\":\"\$20/hr\",\"type\":\"FULL_TIME\",\"cityId\":\"dmv\",\"expiresAt\":\"$EXPIRES_AT\"}" || true
JOB_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /jobs?cityId=dmv" "200" \
  "$BASE/jobs?cityId=dmv" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

if [[ -n "$JOB_ID" ]] && ! echo "$BODY" | grep -q "$JOB_ID"; then
  fail "GET /jobs — created job $JOB_ID not found in feed"
  FAILED=$(( FAILED + 1 ))
fi

call "GET /jobs/:id" "200" \
  "$BASE/jobs/${JOB_ID:-missing}" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

call "POST /jobs/:id/apply" "201" \
  -X POST "$BASE/jobs/${JOB_ID:-missing}/apply" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true
APP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /jobs/:id/applicants (salon)" "200" \
  "$BASE/jobs/${JOB_ID:-missing}/applicants" \
  -H "Authorization: Bearer $SALON_TOKEN" || true

if [[ -n "$APP_ID" ]]; then
  call "PATCH /jobs/:id/applicants/:appId (VIEWED)" "200" \
    -X PATCH "$BASE/jobs/${JOB_ID:-missing}/applicants/${APP_ID}" \
    -H "Authorization: Bearer $SALON_TOKEN" \
    -d '{"status":"VIEWED"}' || true
fi

call "GET /workers/me/applications" "200" \
  "$BASE/workers/me/applications" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

call "PATCH /jobs/:id (update title)" "200" \
  -X PATCH "$BASE/jobs/${JOB_ID:-missing}" \
  -H "Authorization: Bearer $SALON_TOKEN" \
  -d '{"title":"API Test Job (edited)"}' || true

call "DELETE /jobs/:id (soft delete)" "204" \
  -X DELETE "$BASE/jobs/${JOB_ID:-missing}" \
  -H "Authorization: Bearer $SALON_TOKEN" || true

# ─────────────────────────────────────────────────────────────────────────────
section "MESSAGING"
# ─────────────────────────────────────────────────────────────────────────────

call "POST /conversations (worker→salon)" "201" \
  -X POST "$BASE/conversations" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d "{\"otherUserId\":\"$SALON_USER_ID\"}" || true
CONV_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /conversations" "200" \
  "$BASE/conversations" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

if [[ -n "$CONV_ID" ]] && ! echo "$BODY" | grep -q "$CONV_ID"; then
  fail "GET /conversations — conversation $CONV_ID not in list"
  FAILED=$(( FAILED + 1 ))
fi

call "POST /conversations/:id/messages" "201" \
  -X POST "$BASE/conversations/${CONV_ID:-missing}/messages" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d '{"content":"Hello from automated test suite"}' || true
MSG_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

call "GET /conversations/:id/messages" "200" \
  "$BASE/conversations/${CONV_ID:-missing}/messages" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

if [[ -n "$MSG_ID" ]] && ! echo "$BODY" | grep -q "$MSG_ID"; then
  fail "GET /conversations/:id/messages — sent message not found"
  FAILED=$(( FAILED + 1 ))
fi

call "PATCH /conversations/:id/read" "200" \
  -X PATCH "$BASE/conversations/${CONV_ID:-missing}/read" \
  -H "Authorization: Bearer $SALON_TOKEN" || true

# ─────────────────────────────────────────────────────────────────────────────
section "MEDIA"
# ─────────────────────────────────────────────────────────────────────────────

# Create a minimal 1x1 PNG (base64 encoded)
TMPIMG=$(mktemp /tmp/test-img-XXXX.png)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$TMPIMG"

tmpfile=$(mktemp)
start=$(now_ms)
STATUS=$(curl -s -o "$tmpfile" -w "%{http_code}" \
  -X POST "$BASE/media/upload" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -F "file=@$TMPIMG;type=image/png" \
  --max-time 15 2>/dev/null) || STATUS="000"
end=$(now_ms)
ms=$(( end - start ))
BODY=$(cat "$tmpfile")
rm -f "$tmpfile" "$TMPIMG"

COUNT=$(( COUNT + 1 ))
TOTAL_MS=$(( TOTAL_MS + ms ))

if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
  PASSED=$(( PASSED + 1 ))
  ok "POST /media/upload — ${ms}ms"
elif [[ "$STATUS" == "413" ]]; then
  fail "POST /media/upload — 413 Payload too large"
  FAILED=$(( FAILED + 1 ))
else
  fail "POST /media/upload — HTTP $STATUS — ${ms}ms"
  FAILED=$(( FAILED + 1 ))
fi

# ─────────────────────────────────────────────────────────────────────────────
section "VERIFY"
# ─────────────────────────────────────────────────────────────────────────────

call "POST /verify/identity" "200 201 402" \
  -X POST "$BASE/verify/identity" \
  -H "Authorization: Bearer $WORKER_TOKEN" || true

# ─────────────────────────────────────────────────────────────────────────────
section "REPORTS"
# ─────────────────────────────────────────────────────────────────────────────

call "POST /reports (worker reports salon)" "201" \
  -X POST "$BASE/reports" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d "{\"reportedUserId\":\"$SALON_USER_ID\",\"type\":\"FAKE_PROFILE\"}" || true

# Test idempotency — second identical report
call "POST /reports (duplicate — should 409 400 201)" "201 409 400" \
  -X POST "$BASE/reports" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d "{\"reportedUserId\":\"$SALON_USER_ID\",\"type\":\"FAKE_PROFILE\"}" || true

# ─────────────────────────────────────────────────────────────────────────────
section "DEVICES"
# ─────────────────────────────────────────────────────────────────────────────

call "POST /devices (register push token)" "204" \
  -X POST "$BASE/devices" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -d '{"expoPushToken":"ExponentPushToken[test_automated_suite]","platform":"IOS"}' || true

# ─────────────────────────────────────────────────────────────────────────────
section "HEALTH"
# ─────────────────────────────────────────────────────────────────────────────

call "GET /health" "200" "$BASE/health" || true
if echo "$BODY" | grep -q '"status":"ok"'; then
  ok "GET /health — db+cache verified"
else
  fail "GET /health — unexpected response: $(echo "$BODY" | head -c 100)"
  FAILED=$(( FAILED + 1 ))
fi

# ─────────────────────────────────────────────────────────────────────────────
section "RATE LIMITING"
# ─────────────────────────────────────────────────────────────────────────────

echo "  Sending 12 parallel POST /auth/login requests to trigger rate limit..."
RATETMP=$(mktemp -d)
for i in $(seq 1 12); do
  curl -s -o "$RATETMP/r$i" -w "%{http_code}" \
    -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit-test@salonin.test","password":"wrong"}' \
    --max-time 5 2>/dev/null > "$RATETMP/s$i" &
done
wait

HIT_429=false
for i in $(seq 1 12); do
  S=$(cat "$RATETMP/s$i" 2>/dev/null || echo "000")
  if [[ "$S" == "429" ]]; then
    HIT_429=true
    COUNT=$(( COUNT + 1 ))
    TOTAL_MS=$(( TOTAL_MS + 50 ))
    PASSED=$(( PASSED + 1 ))
    ok "POST /auth/login rate-limit — 429 triggered (request $i of 12 parallel)"
    break
  fi
done
rm -rf "$RATETMP"
if [[ "$HIT_429" == "false" ]]; then
  COUNT=$(( COUNT + 1 ))
  TOTAL_MS=$(( TOTAL_MS + 50 ))
  FAILED=$(( FAILED + 1 ))
  fail "POST /auth/login rate-limit — no 429 after 12 parallel attempts (throttler not active?)"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "SUMMARY"
# ─────────────────────────────────────────────────────────────────────────────

if (( COUNT > 0 )); then
  AVG=$(( TOTAL_MS / COUNT ))
else
  AVG=0
fi

echo
echo "════════════════════════════════════════════"
echo "  PASSED:       $PASSED"
echo "  FAILED:       $FAILED"
echo "  SLOW (>500ms): $SLOW"
echo "  AVG LATENCY:  ${AVG}ms"
echo "  TOTAL CALLS:  $COUNT"
echo "════════════════════════════════════════════"
