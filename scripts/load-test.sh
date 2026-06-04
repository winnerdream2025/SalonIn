#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  SalonIn — Load & Stress Test
#  Usage:  ./scripts/load-test.sh [base_url]
#  Deps:   curl, bash ≥4, awk
# ═══════════════════════════════════════════════════════════════════════════════

BASE="${1:-https://salonin-production.up.railway.app}"
EMAIL="worker-1@loadtest.com"
PASSWORD="LoadTest1234!"

PASS=0; FAIL=0; WARN=0
LATENCIES=""

TMPDIR_LT=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LT"' EXIT

# ─── helpers ──────────────────────────────────────────────────────────────────
pass() { echo "  ✅ PASS — $*"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL — $*"; FAIL=$((FAIL + 1)); }
warn() { echo "  ⚠️  WARN — $*"; WARN=$((WARN + 1)); }

section() {
  echo
  echo "══════════════════════════════════════════"
  echo "  $*"
  echo "══════════════════════════════════════════"
}

# Returns "status latency_seconds"
req() {
  curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 "${@}"
}

# Launch N background curl jobs; write results to TMPDIR_LT/result_N
# Usage: spawn_concurrent <label> <n> <curl_args...>
spawn_concurrent() {
  local label="$1" n="$2"; shift 2
  for i in $(seq 1 "$n"); do
    ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 "${@}" \
        > "$TMPDIR_LT/${label}_${i}.txt" 2>/dev/null ) &
  done
  wait
}

# Parse temp files from spawn_concurrent; sets globals: _2xx _429 _5xx _other _avg_ms
parse_results() {
  local label="$1"
  _2xx=0; _429=0; _5xx=0; _other=0
  local total_t=0 n=0
  for f in "$TMPDIR_LT/${label}"_*.txt; do
    [ -f "$f" ] || continue
    s=$(awk '{print $1}' "$f" 2>/dev/null || echo "000")
    t=$(awk '{print $2}' "$f" 2>/dev/null || echo "0")
    case "$s" in
      2[0-9][0-9]) _2xx=$((_2xx + 1)) ;;
      429) _429=$((_429 + 1)) ;;
      5[0-9][0-9]) _5xx=$((_5xx + 1)) ;;
      *) _other=$((_other + 1)) ;;
    esac
    total_t=$(awk "BEGIN{printf \"%.6f\", $total_t + $t}")
    n=$((n + 1))
  done
  _avg_ms=$(awk "BEGIN{if($n>0) printf \"%.0f\", ($total_t/$n)*1000; else print 0}")
}

# ─── 0. Health baseline ───────────────────────────────────────────────────────
section "PHASE 0 — Health baseline"
HEALTH=$(curl -s --max-time 10 "$BASE/health")
DB=$(echo "$HEALTH" | grep -o '"db":[a-z]*' | cut -d: -f2 || echo "?")
CACHE=$(echo "$HEALTH" | grep -o '"cache":[a-z]*' | cut -d: -f2 || echo "?")
echo "  Health: $HEALTH"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "API healthy — DB:$DB  Cache:$CACHE"
else
  fail "API not healthy — $HEALTH"
  echo "Aborting." && exit 1
fi

BASELINE_TIME=$(req "$BASE/health")
BASELINE_MS=$(echo "$BASELINE_TIME" | awk '{printf "%.0f", $2*1000}')
pass "Baseline latency: ${BASELINE_MS}ms"

# ─── Auth: get token ──────────────────────────────────────────────────────────
section "Auth — acquire token"
TOKEN_RESP=$(curl -s --max-time 10 -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$TOKEN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  warn "worker-1 token not available — auth tests limited"
  TOKEN="invalid"
else
  pass "Token acquired (${#TOKEN} chars)"
fi

# ─── PHASE 1: Test A — Auth flood (50 concurrent) ─────────────────────────────
section "PHASE 1 / Test A — Auth flood (50 concurrent)"
echo "  Sending 50 concurrent POST /auth/login …"

for i in $(seq 1 50); do
  ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 \
      -X POST "$BASE/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"worker-$((i % 10 + 1))@loadtest.com\",\"password\":\"$PASSWORD\"}" \
      > "$TMPDIR_LT/auth_${i}.txt" 2>/dev/null ) &
done
wait

parse_results "auth"
echo "  Results: 2xx=${_2xx}  429=${_429}  5xx=${_5xx}  other=${_other}"
echo "  Avg latency: ${_avg_ms}ms"

[ "$_5xx" -eq 0 ] && pass "No 5xx errors" || fail "${_5xx} server errors on auth flood"
[ "$_429" -gt 0 ] && pass "Rate limiter active (${_429} × 429 as expected)" || warn "Rate limiter returned no 429s — check throttler config"
[ "$_avg_ms" -lt 2000 ] && pass "Avg latency ${_avg_ms}ms < 2000ms" || warn "Avg latency ${_avg_ms}ms — high under throttle"

# ─── PHASE 2: Test B — Geo queries sequential perf ────────────────────────────
section "PHASE 2 / Test B — Geo queries (20 sequential, real perf)"
echo "  Sending 20 sequential GET /workers/nearby …"

LATS=("38.88" "38.90" "38.99" "38.98" "39.08" "38.80" "38.88" "38.97" "38.85" "38.93")
LNGS=("-77.09" "-77.03" "-77.02" "-77.10" "-77.15" "-77.04" "-77.17" "-77.07" "-77.05" "-77.06")

geo_sum=0; geo_max=0; geo_min=99999; geo_errors=0; geo_count=0
for i in $(seq 0 19); do
  lat="${LATS[$((i % 10))]}"
  lng="${LNGS[$((i % 10))]}"
  result=$(req -H "Authorization: Bearer $TOKEN" \
    "$BASE/workers/nearby?lat=${lat}&lng=${lng}&radiusMiles=15&cityId=dmv")
  s=$(echo "$result" | awk '{print $1}')
  t_ms=$(echo "$result" | awk '{printf "%.0f", $2*1000}')
  [ "$s" != "200" ] && geo_errors=$((geo_errors + 1)) || true
  geo_sum=$((geo_sum + t_ms))
  [ "$t_ms" -gt "$geo_max" ] && geo_max=$t_ms || true
  [ "$t_ms" -lt "$geo_min" ] && geo_min=$t_ms || true
  geo_count=$((geo_count + 1))
done

geo_avg=$((geo_count > 0 ? geo_sum / geo_count : 0))
echo "  Geo errors: $geo_errors / 20"
echo "  Avg: ${geo_avg}ms  Min: ${geo_min}ms  Max: ${geo_max}ms"
LATENCIES="${LATENCIES} geo_avg:${geo_avg}ms"

[ "$geo_errors" -eq 0 ] && pass "All geo queries 200" || fail "$geo_errors geo errors"
[ "$geo_avg" -lt 300 ] && pass "Avg ${geo_avg}ms < 300ms target" || warn "Avg ${geo_avg}ms — above 300ms target (check PostGIS + index)"
[ "$geo_max" -lt 1000 ] && pass "Max ${geo_max}ms < 1000ms" || warn "Max ${geo_max}ms — tail latency high"

# ─── PHASE 2: Test C — Job feed ───────────────────────────────────────────────
section "PHASE 2 / Test C — Job feed (20 sequential)"
echo "  Sending 20 sequential GET /jobs …"

job_sum=0; job_max=0; job_errors=0; job_count=0
for _ in $(seq 1 20); do
  result=$(req -H "Authorization: Bearer $TOKEN" "$BASE/jobs?cityId=dmv&page=1&limit=20")
  s=$(echo "$result" | awk '{print $1}')
  t_ms=$(echo "$result" | awk '{printf "%.0f", $2*1000}')
  [ "$s" != "200" ] && job_errors=$((job_errors + 1)) || true
  job_sum=$((job_sum + t_ms))
  [ "$t_ms" -gt "$job_max" ] && job_max=$t_ms || true
  job_count=$((job_count + 1))
done

job_avg=$((job_count > 0 ? job_sum / job_count : 0))
echo "  Job errors: $job_errors / 20  Avg: ${job_avg}ms  Max: ${job_max}ms"
LATENCIES="${LATENCIES} job_avg:${job_avg}ms"

[ "$job_errors" -eq 0 ] && pass "All job queries 200" || fail "$job_errors job errors"
[ "$job_avg" -lt 200 ] && pass "Avg ${job_avg}ms < 200ms target" || warn "Avg ${job_avg}ms — above 200ms target"

# ─── PHASE 2: Test D — Message sending (20 sequential) ───────────────────────
section "PHASE 2 / Test D — Messages (20 sequential)"
echo "  Getting first conversation …"

CONVS=$(curl -s --max-time 10 -H "Authorization: Bearer $TOKEN" "$BASE/conversations" 2>/dev/null || echo '[]')
CONV_ID=$(echo "$CONVS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$CONV_ID" ]; then
  warn "No conversations found for worker-1 — skipping message test"
else
  msg_sum=0; msg_max=0; msg_errors=0; msg_count=0
  for i in $(seq 1 20); do
    resp_file="$TMPDIR_LT/msg_${i}.json"
    result=$(curl -s -o "$resp_file" -w "%{http_code} %{time_total}" \
      --max-time 15 \
      -X POST "$BASE/conversations/$CONV_ID/messages" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"content\":\"Load test message $i ts=$(date +%s)\"}") 
    s=$(echo "$result" | awk '{print $1}')
    t_ms=$(echo "$result" | awk '{printf "%.0f", $2*1000}')
    [ "$s" != "201" ] && [ "$s" != "200" ] && msg_errors=$((msg_errors + 1)) || true
    msg_sum=$((msg_sum + t_ms))
    [ "$t_ms" -gt "$msg_max" ] && msg_max=$t_ms || true
    msg_count=$((msg_count + 1))
  done

  msg_avg=$((msg_count > 0 ? msg_sum / msg_count : 0))

  # Check duplicate IDs
  unique_ids=$(grep -h -o '"id":"[^"]*"' "$TMPDIR_LT"/msg_*.json 2>/dev/null | sort -u | wc -l | tr -d ' ')

  echo "  Msg errors: $msg_errors / 20  Avg: ${msg_avg}ms  Max: ${msg_max}ms"
  echo "  Unique msg IDs: $unique_ids / $msg_count"
  LATENCIES="${LATENCIES} msg_avg:${msg_avg}ms"

  [ "$msg_errors" -eq 0 ] && pass "All 20 messages sent" || fail "$msg_errors send errors"
  [ "$unique_ids" -ge "$msg_count" ] && pass "All message IDs unique (no duplicates)" || fail "Duplicate message IDs detected!"
fi

# ─── PHASE 3: Test E — Mixed concurrent (30 concurrent, realistic) ────────────
section "PHASE 3 / Test E — Mixed workload (30 concurrent)"
echo "  30 simultaneous requests: 40% geo / 30% jobs / 20% conv / 10% auth …"

for i in $(seq 1 30); do
  bucket=$((i % 10))
  lat="${LATS[$((i % 10))]}"
  lng="${LNGS[$((i % 10))]}"
  if [ "$bucket" -le 3 ]; then
    ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE/workers/nearby?lat=${lat}&lng=${lng}&radiusMiles=15&cityId=dmv" \
        > "$TMPDIR_LT/mixed_${i}.txt" 2>/dev/null ) &
  elif [ "$bucket" -le 6 ]; then
    ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE/jobs?cityId=dmv&page=1&limit=20" \
        > "$TMPDIR_LT/mixed_${i}.txt" 2>/dev/null ) &
  elif [ "$bucket" -le 8 ]; then
    ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE/conversations" \
        > "$TMPDIR_LT/mixed_${i}.txt" 2>/dev/null ) &
  else
    ( curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 \
        -X POST "$BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"worker-$((i % 10 + 1))@loadtest.com\",\"password\":\"$PASSWORD\"}" \
        > "$TMPDIR_LT/mixed_${i}.txt" 2>/dev/null ) &
  fi
done
wait

parse_results "mixed"
error_rate=$(awk "BEGIN{total=$_2xx+$_429+$_5xx+$_other; if(total>0) printf \"%.1f\", ($_5xx/total)*100; else print 0}")

echo "  Results: 2xx=${_2xx}  429=${_429}  5xx=${_5xx}  other=${_other}"
echo "  Avg latency: ${_avg_ms}ms  Error rate: ${error_rate}%"

[ "$_5xx" -eq 0 ] && pass "No 5xx under mixed load" || fail "${_5xx} server errors in mixed workload"
[ "$(awk "BEGIN{print ($error_rate < 1.0)}")" = "1" ] && pass "Error rate ${error_rate}% < 1% target" || fail "Error rate ${error_rate}% — above 1% target"
[ "$_avg_ms" -lt 500 ] && pass "Avg ${_avg_ms}ms < 500ms" || warn "Avg ${_avg_ms}ms — above 500ms mixed target"

# ─── PHASE 3: Metric 3 — Rate limiter correctness ────────────────────────────
section "PHASE 3 / Metric 3 — Rate limiter (15 login attempts)"
echo "  Sending 15 sequential POST /auth/login from same IP …"

rl_429=0; rl_5xx=0
for _ in $(seq 1 15); do
  s=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"worker-1@loadtest.com\",\"password\":\"$PASSWORD\"}")
  echo -n "  $s"
  [ "$s" = "429" ] && rl_429=$((rl_429 + 1)) || true
  echo "$s" | grep -q '^5' && rl_5xx=$((rl_5xx + 1)) || true
  sleep 0.3
done
echo ""

echo "  Throttled (429): $rl_429 / 15"
[ "$rl_429" -gt 0 ] && pass "Rate limiter triggered at or before request 15 (${rl_429} × 429)" || warn "Rate limiter did not trigger in 15 requests"
[ "$rl_5xx" -eq 0 ] && pass "No 5xx — throttle returns 429 not 500" || fail "${rl_5xx} server errors under rate limiting"

# ─── PHASE 4: Post-load health ────────────────────────────────────────────────
section "PHASE 4 — Post-load health check"
POST_HEALTH=$(curl -s --max-time 10 "$BASE/health")
POST_RESULT=$(req "$BASE/health")
POST_MS=$(echo "$POST_RESULT" | awk '{printf "%.0f", $2*1000}')

echo "  Post-load health: $POST_HEALTH"
echo "  Baseline: ${BASELINE_MS}ms  Post-load: ${POST_MS}ms"

ratio=$(awk "BEGIN{if($BASELINE_MS>0) printf \"%.1f\", $POST_MS/$BASELINE_MS; else print 0}")
if echo "$POST_HEALTH" | grep -q '"status":"ok"'; then
  pass "API still healthy after load"
else
  fail "API degraded after load — $POST_HEALTH"
fi
[ "$(awk "BEGIN{print ($ratio < 2.0)}")" = "1" ] && \
  pass "Post-load latency ${POST_MS}ms (${ratio}x baseline)" || \
  warn "Post-load latency ${POST_MS}ms = ${ratio}x baseline — possible resource exhaustion"

# ─── METRIC 1: Endpoint ranking ───────────────────────────────────────────────
section "METRIC 1 — Endpoint latency ranking"
echo "  (from sequential test results)"
echo "  $LATENCIES"

# ─── Final report ─────────────────────────────────────────────────────────────
section "FINAL REPORT"
TOTAL=$((PASS + FAIL + WARN))
echo "  Tests run:          $TOTAL"
echo "  ✅ PASS:            $PASS"
echo "  ❌ FAIL:            $FAIL"
echo "  ⚠️  WARN:            $WARN"
echo ""
echo "  Geo avg:            ${geo_avg:-?}ms  (target <300ms)"
echo "  Job avg:            ${job_avg:-?}ms  (target <200ms)"
echo "  Mixed error rate:   ${error_rate:-?}%  (target <1%)"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  🟢 OVERALL: PASS"
elif [ "$FAIL" -le 2 ]; then
  echo "  🟡 OVERALL: WARN — $FAIL failure(s)"
else
  echo "  🔴 OVERALL: FAIL — $FAIL failure(s)"
fi
echo ""
