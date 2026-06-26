#!/bin/bash
# Phase 5 — Booking Enhanced curl tests
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
echo -e "${B}   PHASE 5 — BOOKING ENHANCED TESTS        ${NC}"
echo -e "${B}============================================${NC}"

# ── [0] Setup ─────────────────────────────────────────────────────────────
echo -e "\n${B}[0] Setup${NC}"
W_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(ex "$W_RESP" '.get("accessToken","")')
W_PROF_ID=$(curl -s "$BASE/workers/me" -H "Authorization: Bearer $WT" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)

# Client account
TS=$(python3 -c "import time; print(int(time.time()))")

# Compute unique future weekday dates and a unique hour for this test run
DATES=$(python3 -c "
import datetime, time
t = int(time.time())
hour = (t % 6) + 9  # 09..14 to stay within working hours
# Start from 180 days out and find 5 consecutive weekdays
base = datetime.date.today() + datetime.timedelta(days=180+t%7)
dates = []
d = base
while len(dates) < 5:
    if d.weekday() < 5:  # Mon–Fri
        dates.append(str(d))
    d += datetime.timedelta(days=1)
print(','.join(dates) + ',' + str(hour).zfill(2) + ':00')
")
D1=$(echo "$DATES" | cut -d, -f1)
D2=$(echo "$DATES" | cut -d, -f2)
D3=$(echo "$DATES" | cut -d, -f3)
D4=$(echo "$DATES" | cut -d, -f4)
D5=$(echo "$DATES" | cut -d, -f5)
SLOT=$(echo "$DATES" | cut -d, -f6)
echo -e "   ${Y}test dates: $D1 $D2 $D3 slot=$SLOT${NC}"
CLIENT_EMAIL="p5client_${TS}@test.com"
CL_RESP=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$CLIENT_EMAIL\",\"password\":\"Test1234!\",\"name\":\"P5 Client\",\"role\":\"WORKER\",\"accountType\":\"CLIENT\"}")
CT=$(ex "$CL_RESP" '.get("accessToken","")')
CL_ID=$(ex "$CL_RESP" '.get("user",{}).get("id","")')

# Create a service to use
SVC_RESP=$(curl -s -X POST "$BASE/services" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"name":"P5 Service","duration":30,"price":50}')
SVC_ID=$(ex "$SVC_RESP" '.get("data",{}).get("id","")')
echo -e "   ${Y}worker=$W_PROF_ID svc=$SVC_ID client=$CL_ID${NC}"

# ── [1] IntakeForm CRUD ────────────────────────────────────────────────────
echo -e "\n${B}[1] IntakeForm CRUD${NC}"

FORM_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/intake-forms" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{
    "title":"New Client Intake",
    "description":"Help us serve you better",
    "questions":[
      {"id":"q1","question":"Any allergies?","type":"textarea","required":true},
      {"id":"q2","question":"Preferred style?","type":"radio","required":false,"options":["Classic","Modern","Bold"]}
    ],
    "serviceIds":[]
  }')
FORM_CODE=$(echo "$FORM_RESP" | tail -1)
FORM_BODY=$(echo "$FORM_RESP" | sed '$d')
if [ "$FORM_CODE" = "201" ]; then
  FORM_ID=$(ex "$FORM_BODY" '.get("data",{}).get("id","")')
  echo -e "${G}✓${NC} [201] POST /intake-forms → id=$FORM_ID"; ((pass++))
else
  echo -e "${R}✗${NC} [$FORM_CODE vs 201] POST /intake-forms"
  echo "   $FORM_BODY"; ((fail++))
fi

# List my forms
chk "GET /intake-forms/my" GET /intake-forms/my 200 "" "$WT"

# Get by id
[ -n "$FORM_ID" ] && chk "GET /intake-forms/$FORM_ID" GET "/intake-forms/$FORM_ID" 200 "" ""

# Get for provider (public)
chk "GET /intake-forms/for-provider?providerId=...&providerType=professional" \
  GET "/intake-forms/for-provider?providerId=$W_PROF_ID&providerType=professional" 200 "" ""

# Update form
if [ -n "$FORM_ID" ]; then
  chk "PATCH /intake-forms/$FORM_ID" PATCH "/intake-forms/$FORM_ID" 200 \
    '{"title":"Updated Intake Form","isActive":true}' "$WT"
fi

# No auth → 401 on create
chk "POST /intake-forms no auth → 401" POST /intake-forms 401 '{"title":"X","questions":[]}' ""

# ── [2] Booking with IntakeResponse ───────────────────────────────────────
echo -e "\n${B}[2] Booking with intake answers${NC}"

BOOK_DATA="{
  \"providerId\":\"$W_PROF_ID\",\"providerType\":\"professional\",
  \"serviceId\":\"$SVC_ID\",\"clientName\":\"P5 Client\",
  \"clientEmail\":\"$CLIENT_EMAIL\",\"date\":\"$D1\",\"startTime\":\"$SLOT\",
  \"intakeFormId\":\"$FORM_ID\",
  \"intakeAnswers\":[
    {\"questionId\":\"q1\",\"answer\":\"No allergies\"},
    {\"questionId\":\"q2\",\"answer\":\"Modern\"}
  ]
}"

BOOK_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "$BOOK_DATA")
BOOK_CODE=$(echo "$BOOK_RESP" | tail -1)
BOOK_BODY=$(echo "$BOOK_RESP" | sed '$d')
if [ "$BOOK_CODE" = "201" ]; then
  BOOK_ID=$(ex "$BOOK_BODY" '.get("data",{}).get("id","")')
  echo -e "${G}✓${NC} [201] POST /bookings with intake → id=$BOOK_ID"; ((pass++))
else
  echo -e "${R}✗${NC} [$BOOK_CODE vs 201] POST /bookings with intake"
  echo "   $BOOK_BODY"; ((fail++))
fi

# Get intake response for the booking (provider)
if [ -n "$BOOK_ID" ]; then
  sleep 1  # let async intake save complete
  chk "GET /bookings/$BOOK_ID/intake (provider)" GET "/bookings/$BOOK_ID/intake" 200 "" "$WT"
fi

# ── [3] Waitlist ──────────────────────────────────────────────────────────
echo -e "\n${B}[3] Waitlist${NC}"

WL_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings/waitlist" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{
    \"providerId\":\"$W_PROF_ID\",\"providerType\":\"professional\",
    \"serviceId\":\"$SVC_ID\",\"date\":\"$D1\",\"startTime\":\"$SLOT\",
    \"clientName\":\"P5 Client\",\"clientEmail\":\"$CLIENT_EMAIL\"
  }")
WL_CODE=$(echo "$WL_RESP" | tail -1)
WL_BODY=$(echo "$WL_RESP" | sed '$d')
if [ "$WL_CODE" = "201" ]; then
  WL_ID=$(ex "$WL_BODY" '.get("data",{}).get("id","")')
  echo -e "${G}✓${NC} [201] POST /bookings/waitlist → id=$WL_ID"; ((pass++))
else
  echo -e "${R}✗${NC} [$WL_CODE vs 201] POST /bookings/waitlist"
  echo "   $WL_BODY"; ((fail++))
fi

# Guest waitlist (no auth)
WL_GUEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/waitlist" \
  -H "Content-Type: application/json" \
  -d "{\"providerId\":\"$W_PROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"$SVC_ID\",\"date\":\"$D2\",\"startTime\":\"11:00\",\"clientName\":\"Guest\",\"clientEmail\":\"guest@test.com\"}")
[ "$WL_GUEST" = "201" ] \
  && { echo -e "${G}✓${NC} [201] Waitlist join as guest (no auth)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$WL_GUEST vs 201] Guest waitlist"; ((fail++)); }

# Provider lists waitlist
chk "GET /bookings/waitlist (provider)" GET /bookings/waitlist 200 "" "$WT"

# Remove from waitlist
if [ -n "$WL_ID" ]; then
  chk "DELETE /bookings/waitlist/$WL_ID (owner)" DELETE "/bookings/waitlist/$WL_ID" 204 "" "$CT"
  chk "DELETE /bookings/waitlist/$WL_ID (already deleted → 404)" DELETE "/bookings/waitlist/$WL_ID" 404 "" "$CT"
fi

# ── [4] Waitlist notified on cancellation ────────────────────────────────
echo -e "\n${B}[4] Cancel booking → waitlist notified${NC}"

# Add someone to waitlist for the booked slot
WL2_RESP=$(curl -s -X POST "$BASE/bookings/waitlist" \
  -H "Content-Type: application/json" \
  -d "{\"providerId\":\"$W_PROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"$SVC_ID\",\"date\":\"$D1\",\"startTime\":\"$SLOT\",\"clientName\":\"Waiter\",\"clientEmail\":\"waiter_${TS}@test.com\"}")
WL2_ID=$(ex "$WL2_RESP" '.get("data",{}).get("id","")')
echo -e "   ${Y}Waitlist entry $WL2_ID added for slot${NC}"

if [ -n "$BOOK_ID" ]; then
  CANCEL_TOKEN=$(ex "$BOOK_BODY" '.get("data",{}).get("cancelToken","")')
  CANCEL_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/cancel" \
    -H "Content-Type: application/json" \
    -d "{\"bookingId\":\"$BOOK_ID\",\"cancelToken\":\"$CANCEL_TOKEN\"}")
  [ "$CANCEL_RESP" = "200" ] \
    && { echo -e "${G}✓${NC} [200] Booking cancelled → waitlist notification triggered"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$CANCEL_RESP vs 200] Cancel booking for waitlist test"; ((fail++)); }
fi

# ── [5] Rebook ────────────────────────────────────────────────────────────
echo -e "\n${B}[5] Rebook${NC}"

# Create a fresh booking to rebook from
BOOK2=$(curl -s -X POST "$BASE/bookings" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"providerId\":\"$W_PROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"$SVC_ID\",\"clientName\":\"P5 Client\",\"clientEmail\":\"$CLIENT_EMAIL\",\"date\":\"$D3\",\"startTime\":\"$SLOT\"}")
BOOK2_ID=$(ex "$BOOK2" '.get("data",{}).get("id","")')
echo -e "   ${Y}source booking=$BOOK2_ID on $D3 $SLOT${NC}"

if [ -n "$BOOK2_ID" ]; then
  REBOOK_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings/rebook" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
    -d "{\"bookingId\":\"$BOOK2_ID\",\"date\":\"$D4\",\"startTime\":\"$SLOT\",\"notes\":\"Looking forward to it!\"}")
  REBOOK_CODE=$(echo "$REBOOK_RESP" | tail -1)
  REBOOK_BODY=$(echo "$REBOOK_RESP" | sed '$d')
  if [ "$REBOOK_CODE" = "201" ]; then
    REBOOK_ID=$(ex "$REBOOK_BODY" '.get("data",{}).get("id","")')
    echo -e "${G}✓${NC} [201] POST /bookings/rebook → new id=$REBOOK_ID"; ((pass++))
  else
    echo -e "${R}✗${NC} [$REBOOK_CODE vs 201] POST /bookings/rebook"
    echo "   $REBOOK_BODY"; ((fail++))
  fi

  # Rebook with non-owner → 403
  WT_REBOOK=$(ex "$W_RESP" '.get("accessToken","")')
  REBOOK403=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/rebook" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $WT_REBOOK" \
    -d "{\"bookingId\":\"$BOOK2_ID\",\"date\":\"$D5\",\"startTime\":\"$SLOT\"}")
  [ "$REBOOK403" = "403" ] \
    && { echo -e "${G}✓${NC} [403] Rebook as non-owner → forbidden"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$REBOOK403 vs 403] Rebook non-owner should be 403"; ((fail++)); }

  # Rebook no auth → 401
  chk "POST /bookings/rebook no auth → 401" POST /bookings/rebook 401 \
    "{\"bookingId\":\"$BOOK2_ID\",\"date\":\"2026-12-21\",\"startTime\":\"09:00\"}" ""
fi

# ── [6] IntakeForm delete ─────────────────────────────────────────────────
echo -e "\n${B}[6] Delete IntakeForm${NC}"
if [ -n "$FORM_ID" ]; then
  # Non-owner can't delete (register a second user)
  TS2=$(python3 -c "import time; print(int(time.time())+1)")
  OT=$(curl -s -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"other_${TS2}@test.com\",\"password\":\"Test1234!\",\"name\":\"Other\",\"role\":\"WORKER\",\"accountType\":\"PROFESSIONAL\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)
  chk "DELETE /intake-forms/$FORM_ID (non-owner → 403)" DELETE "/intake-forms/$FORM_ID" 403 "" "$OT"
  chk "DELETE /intake-forms/$FORM_ID (owner → 204)" DELETE "/intake-forms/$FORM_ID" 204 "" "$WT"
  chk "GET /intake-forms/$FORM_ID (deleted → 404)" GET "/intake-forms/$FORM_ID" 404 "" ""
fi

# Cleanup
[ -n "$SVC_ID" ] && curl -s -o /dev/null -X DELETE "$BASE/services/$SVC_ID" -H "Authorization: Bearer $WT"

# ── [7] Regression ────────────────────────────────────────────────────────
echo -e "\n${B}[7] Regression — original suite${NC}"
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
echo -e "${B}            PHASE 5 SUMMARY                ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}"
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL PHASE 5 TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
