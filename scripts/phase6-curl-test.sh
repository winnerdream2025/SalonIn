#!/bin/bash
# Phase 6 — Admin Module curl tests
BASE="${BASE_URL:-http://localhost:4000}"
G='\033[0;32m'; R='\033[0;31m'; B='\033[0;34m'; Y='\033[0;33m'; NC='\033[0m'
pass=0; fail=0

chk() {
  local label="$1" method="$2" url="$3" exp="$4" data="$5" token="$6"
  local args=(-s -w "\n%{http_code}" -X "$method" "$BASE$url")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ]  && args+=(-H "Content-Type: application/json" -d "$data")
  local resp; resp=$(curl "${args[@]}")
  local code; code=$(echo "$resp" | tail -1)
  local body; body=$(echo "$resp" | sed '$d')
  if [ "$code" = "$exp" ]; then
    echo -e "${G}✓${NC} [$code] $label"
    ((pass++))
    echo "$body"
  else
    echo -e "${R}✗${NC} [$code vs $exp] $label"
    echo "     $(echo "$body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("message","") or d.get("error","?"))' 2>/dev/null || echo "${body:0:300}")"
    ((fail++))
    echo "$body"
  fi
}
ex() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin)$2)" 2>/dev/null; }

echo -e "${B}============================================${NC}"
echo -e "${B}   PHASE 6 — ADMIN MODULE TESTS            ${NC}"
echo -e "${B}============================================${NC}"

# ── [0] Setup — login as admin + worker ───────────────────────────────────
echo -e "\n${B}[0] Setup${NC}"
AT=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@mysalonin.com","password":"Test1234!"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)
echo -e "   ${Y}admin token: ${AT:0:20}...${NC}"

W_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(ex "$W_RESP" '.get("accessToken","")')
W_ID=$(ex "$W_RESP" '.get("user",{}).get("id","")')
echo -e "   ${Y}worker id=$W_ID${NC}"

# Create a throwaway user to suspend/delete
TS=$(python3 -c "import time; print(int(time.time()))")
DUMMY_RESP=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"dummy_${TS}@test.com\",\"password\":\"Test1234!\",\"name\":\"Dummy\",\"role\":\"WORKER\",\"accountType\":\"PROFESSIONAL\"}")
DUMMY_ID=$(ex "$DUMMY_RESP" '.get("user",{}).get("id","")')
echo -e "   ${Y}dummy user=$DUMMY_ID${NC}"

# ── [1] Role guard — non-admin blocked ────────────────────────────────────
echo -e "\n${B}[1] Role guard${NC}"
chk "GET /admin/users (no auth → 401)" GET /admin/users 401 "" ""
chk "GET /admin/users (worker → 403)" GET /admin/users 403 "" "$WT"
chk "GET /admin/analytics (no auth → 401)" GET /admin/analytics 401 "" ""

# ── [2] GET /admin/users ──────────────────────────────────────────────────
echo -e "\n${B}[2] GET /admin/users${NC}"
USERS=$(curl -s -w "\n%{http_code}" "$BASE/admin/users" -H "Authorization: Bearer $AT")
USERS_CODE=$(echo "$USERS" | tail -1)
USERS_BODY=$(echo "$USERS" | sed '$d')
if [ "$USERS_CODE" = "200" ]; then
  TOTAL=$(echo "$USERS_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("total",0))' 2>/dev/null)
  echo -e "${G}✓${NC} [200] GET /admin/users → total=$TOTAL"
  ((pass++))
else
  echo -e "${R}✗${NC} [$USERS_CODE vs 200] GET /admin/users"; ((fail++))
fi

# Search by email
chk "GET /admin/users?q=testworker" GET "/admin/users?q=testworker" 200 "" "$AT"

# Filter by role
chk "GET /admin/users?role=WORKER" GET "/admin/users?role=WORKER" 200 "" "$AT"
chk "GET /admin/users?role=SALON" GET "/admin/users?role=SALON" 200 "" "$AT"
chk "GET /admin/users?isActive=true&limit=5" GET "/admin/users?isActive=true&limit=5" 200 "" "$AT"

# ── [3] GET /admin/users/:id ──────────────────────────────────────────────
echo -e "\n${B}[3] GET /admin/users/:id${NC}"
if [ -n "$W_ID" ]; then
  chk "GET /admin/users/$W_ID" GET "/admin/users/$W_ID" 200 "" "$AT"
fi
chk "GET /admin/users/00000000-0000-0000-0000-000000000000 → 404" \
  GET "/admin/users/00000000-0000-0000-0000-000000000000" 404 "" "$AT"

# ── [4] Suspend & Activate ────────────────────────────────────────────────
echo -e "\n${B}[4] Suspend + Activate${NC}"
if [ -n "$DUMMY_ID" ]; then
  # Suspend
  SUSP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/admin/users/$DUMMY_ID/suspend" \
    -H "Authorization: Bearer $AT")
  SUSP_CODE=$(echo "$SUSP" | tail -1)
  SUSP_BODY=$(echo "$SUSP" | sed '$d')
  if [ "$SUSP_CODE" = "200" ]; then
    IS_ACTIVE=$(ex "$SUSP_BODY" '.get("data",{}).get("isActive",True)')
    echo -e "${G}✓${NC} [200] PATCH suspend → isActive=$IS_ACTIVE"; ((pass++))
  else
    echo -e "${R}✗${NC} [$SUSP_CODE vs 200] suspend user"; ((fail++))
  fi

  # Activate
  ACT=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/admin/users/$DUMMY_ID/activate" \
    -H "Authorization: Bearer $AT")
  ACT_CODE=$(echo "$ACT" | tail -1)
  ACT_BODY=$(echo "$ACT" | sed '$d')
  if [ "$ACT_CODE" = "200" ]; then
    IS_ACTIVE2=$(ex "$ACT_BODY" '.get("data",{}).get("isActive",False)')
    echo -e "${G}✓${NC} [200] PATCH activate → isActive=$IS_ACTIVE2"; ((pass++))
  else
    echo -e "${R}✗${NC} [$ACT_CODE vs 200] activate user"; ((fail++))
  fi
fi

# Admin cannot suspend self
SELF_SUSP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "$BASE/admin/users/$(curl -s "$BASE/admin/users?q=admin@mysalonin.com" \
    -H "Authorization: Bearer $AT" \
    | python3 -c 'import sys,json; users=json.load(sys.stdin).get("data",{}).get("data",[]); print(users[0]["id"] if users else "")' 2>/dev/null)/suspend" \
  -H "Authorization: Bearer $AT")
[ "$SELF_SUSP" = "403" ] \
  && { echo -e "${G}✓${NC} [403] Admin cannot suspend self"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$SELF_SUSP vs 403] Admin suspend self should 403"; ((fail++)); }

# ── [5] Verify user ───────────────────────────────────────────────────────
echo -e "\n${B}[5] Verify user (worker profile)${NC}"
if [ -n "$W_ID" ]; then
  VERIFY=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/admin/users/$W_ID/verify" \
    -H "Authorization: Bearer $AT")
  VERIFY_CODE=$(echo "$VERIFY" | tail -1)
  VERIFY_BODY=$(echo "$VERIFY" | sed '$d')
  if [ "$VERIFY_CODE" = "200" ]; then
    VERIFIED=$(ex "$VERIFY_BODY" '.get("data",{}).get("verified",False)')
    echo -e "${G}✓${NC} [200] PATCH verify → verified=$VERIFIED"; ((pass++))
  else
    echo -e "${R}✗${NC} [$VERIFY_CODE vs 200] Verify user"; ((fail++))
  fi
fi

# ── [6] GET /admin/reports ────────────────────────────────────────────────
echo -e "\n${B}[6] GET /admin/reports${NC}"
REPORTS=$(curl -s -w "\n%{http_code}" "$BASE/admin/reports" -H "Authorization: Bearer $AT")
REPORTS_CODE=$(echo "$REPORTS" | tail -1)
REPORTS_BODY=$(echo "$REPORTS" | sed '$d')
if [ "$REPORTS_CODE" = "200" ]; then
  R_TOTAL=$(echo "$REPORTS_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("total",0))' 2>/dev/null)
  echo -e "${G}✓${NC} [200] GET /admin/reports → total=$R_TOTAL"; ((pass++))
else
  echo -e "${R}✗${NC} [$REPORTS_CODE vs 200] GET /admin/reports"; ((fail++))
fi

chk "GET /admin/reports?status=PENDING" GET "/admin/reports?status=PENDING" 200 "" "$AT"
chk "GET /admin/reports?type=FAKE_PROFILE" GET "/admin/reports?type=FAKE_PROFILE" 200 "" "$AT"

# ── [7] Resolve report ────────────────────────────────────────────────────
echo -e "\n${B}[7] Resolve report (create one first)${NC}"

# Create a report using the reports API (if exists) or skip
REPORT_RESP=$(curl -s -X POST "$BASE/reports" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d "{\"reportedId\":\"$DUMMY_ID\",\"type\":\"FAKE_PROFILE\",\"reason\":\"Test report for admin phase\"}" 2>/dev/null)
REPORT_ID=$(ex "$REPORT_RESP" '.get("data",{}).get("id","") or json.load(open("/dev/stdin")) if False else ""' 2>/dev/null)
# Try direct id extraction
REPORT_ID=$(echo "$REPORT_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("id","") or d.get("id",""))' 2>/dev/null)

if [ -n "$REPORT_ID" ]; then
  chk "PATCH /admin/reports/$REPORT_ID (resolve REVIEWED)" \
    PATCH "/admin/reports/$REPORT_ID" 200 \
    '{"status":"REVIEWED","adminNote":"Investigated and resolved. Not a fake profile."}' "$AT"
  chk "PATCH /admin/reports/$REPORT_ID (dismiss)" \
    PATCH "/admin/reports/$REPORT_ID" 200 \
    '{"status":"DISMISSED"}' "$AT"
else
  # No reports API or no reports exist — just test with a fake ID
  chk "PATCH /admin/reports/00000000-0000-0000-0000-000000000000 → 404" \
    PATCH "/admin/reports/00000000-0000-0000-0000-000000000000" 404 \
    '{"status":"REVIEWED"}' "$AT"
fi

# ── [8] GET /admin/analytics ──────────────────────────────────────────────
echo -e "\n${B}[8] GET /admin/analytics${NC}"
ANALYTICS=$(curl -s -w "\n%{http_code}" "$BASE/admin/analytics" -H "Authorization: Bearer $AT")
AN_CODE=$(echo "$ANALYTICS" | tail -1)
AN_BODY=$(echo "$ANALYTICS" | sed '$d')
if [ "$AN_CODE" = "200" ]; then
  echo -e "${G}✓${NC} [200] GET /admin/analytics (default 30d)"
  ((pass++))
  echo "$AN_BODY" | python3 -c '
import sys,json
d=json.load(sys.stdin).get("data",{})
u=d.get("users",{}); b=d.get("bookings",{}); c=d.get("content",{}); m=d.get("moderation",{})
print(f"  users.total={u.get(\"total\")} new={u.get(\"newThisPeriod\")} workers={u.get(\"activeWorkers\")} salons={u.get(\"activeSalons\")}")
print(f"  bookings.total={b.get(\"total\")} revenueAllTime={b.get(\"revenueAllTime\")}")
print(f"  posts={c.get(\"totalPosts\")} jobs={c.get(\"activeJobs\")} pendingReports={m.get(\"pendingReports\")}")
' 2>/dev/null
else
  echo -e "${R}✗${NC} [$AN_CODE vs 200] GET /admin/analytics"; ((fail++))
fi

chk "GET /admin/analytics?period=7d" GET "/admin/analytics?period=7d" 200 "" "$AT"
chk "GET /admin/analytics?period=1y" GET "/admin/analytics?period=1y" 200 "" "$AT"
chk "GET /admin/analytics?period=invalid → 400" GET "/admin/analytics?period=invalid" 400 "" "$AT"

# ── [9] Delete user ───────────────────────────────────────────────────────
echo -e "\n${B}[9] DELETE /admin/users/:id${NC}"
if [ -n "$DUMMY_ID" ]; then
  chk "DELETE /admin/users/$DUMMY_ID → 204" DELETE "/admin/users/$DUMMY_ID" 204 "" "$AT"
  chk "DELETE same user → 404" DELETE "/admin/users/$DUMMY_ID" 404 "" "$AT"
fi

# ── [10] Regression ───────────────────────────────────────────────────────
echo -e "\n${B}[10] Regression — original suite${NC}"
REGRESSION=$(BASE_URL="$BASE" bash "$(dirname "$0")/curl-test.sh" 2>&1 | tail -4)
echo "$REGRESSION"
if echo "$REGRESSION" | grep -q "ALL TESTS PASSED"; then
  echo -e "${G}✓${NC} Full regression suite passed"
  ((pass++))
else
  echo -e "${R}✗${NC} Regression failures"
  ((fail++))
fi

# ── SUMMARY ───────────────────────────────────────────────────────────────
TOTAL=$((pass+fail))
echo ""
echo -e "${B}============================================${NC}"
echo -e "${B}            PHASE 6 SUMMARY                ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}"
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL PHASE 6 TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
