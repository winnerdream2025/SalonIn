#!/bin/bash
BASE="http://localhost:4000"
G='\033[0;32m'; R='\033[0;31m'; B='\033[0;34m'; NC='\033[0m'
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
  else
    echo -e "${R}✗${NC} [$code vs $exp] $label"
    local err; err=$(echo "$body" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("error","?"))' 2>/dev/null || echo "${body:0:200}")
    echo "     $err"
    ((fail++))
  fi
}

echo -e "${B}============================================${NC}"
echo -e "${B}      SALONIN API FULL TEST SUITE           ${NC}"
echo -e "${B}============================================${NC}"

# ── [1] HEALTH ────────────────────────────────────
echo -e "\n${B}[1] HEALTH${NC}"
chk "GET /health" GET /health 200

# ── [2] AUTH ──────────────────────────────────────
echo -e "\n${B}[2] AUTH${NC}"

W_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jasmine@salonin.test","password":"Password123!"}')
WT=$(echo "$W_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
WID=$(echo "$W_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("user",{}).get("id",""))' 2>/dev/null)
[ -n "$WT" ] \
  && { echo -e "${G}✓${NC} [200] Worker login → id=$WID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Worker login FAILED"; echo "$W_RESP"; ((fail++)); exit 1; }

sleep 0.5

S_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"glamstudio@salonin.test","password":"Password123!"}')
ST=$(echo "$S_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
SID=$(echo "$S_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("user",{}).get("id",""))' 2>/dev/null)
[ -n "$ST" ] \
  && { echo -e "${G}✓${NC} [200] Salon login → id=$SID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Salon login FAILED"; echo "$S_RESP"; ((fail++)); exit 1; }

sleep 0.3
FPV=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{"email":"jasmine@salonin.test"}')
[ "$FPV" = "200" ] || [ "$FPV" = "429" ] \
  && { echo -e "${G}✓${NC} [$FPV] POST /auth/forgot-password (200=sent, 429=throttled)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$FPV vs 200] POST /auth/forgot-password (valid)"; ((fail++)); }
FPB=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{"email":"doesnotexist@test.com"}')
[ "$FPB" = "200" ] || [ "$FPB" = "429" ] \
  && { echo -e "${G}✓${NC} [$FPB] POST /auth/forgot-password (bad email, 429=throttled)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$FPB vs 200/429] POST /auth/forgot-password (bad)"; ((fail++)); }

# ── [3] WORKERS ───────────────────────────────────
echo -e "\n${B}[3] WORKERS${NC}"
chk "GET /workers/me"                  GET /workers/me 200 "" "$WT"
chk "GET /workers/me (no auth → 401)"  GET /workers/me 401

WPROF_ID=$(curl -s "$BASE/workers/me" -H "Authorization: Bearer $WT" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
[ -n "$WPROF_ID" ] && chk "GET /workers/:id (public)"  GET /workers/$WPROF_ID 200

chk "GET /workers/me/applications"    GET /workers/me/applications 200 "" "$WT"
chk "PATCH /workers/me (bio)"         PATCH /workers/me 200 \
  '{"bio":"Updated by curl-test.sh"}' "$WT"
chk "POST /workers/location (→204)"   POST /workers/location 204 \
  '{"lat":38.9072,"lng":-77.0369}' "$WT"

# ── [4] SALONS ────────────────────────────────────
echo -e "\n${B}[4] SALONS${NC}"
chk "GET /salons/me"  GET /salons/me 200 "" "$ST"

SPID=$(curl -s "$BASE/salons/me" -H "Authorization: Bearer $ST" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
[ -n "$SPID" ] && chk "GET /salons/:id (public)"  GET /salons/$SPID 200

# ── [5] WORKERS/NEARBY (matching) ────────────────
echo -e "\n${B}[5] WORKERS/NEARBY${NC}"
chk "GET /workers/nearby (r=25mi)"         GET "/workers/nearby?cityId=dmv&lat=38.9072&lng=-77.0369&radiusMiles=25" 200 "" "$WT"
chk "GET /workers/nearby (r=15mi)"         GET "/workers/nearby?cityId=dmv&lat=38.9072&lng=-77.0369&radiusMiles=15" 200 "" "$WT"
chk "GET /workers/nearby (r=50mi)"         GET "/workers/nearby?cityId=dmv&lat=38.9072&lng=-77.0369&radiusMiles=50" 200 "" "$WT"
chk "GET /workers/nearby (public,no auth)" GET "/workers/nearby?cityId=dmv&lat=38.9072&lng=-77.0369&radiusMiles=25" 200

# ── [6] JOBS ──────────────────────────────────────
echo -e "\n${B}[6] JOBS${NC}"
chk "GET /jobs (all)"           GET "/jobs?cityId=dmv&page=1&limit=10" 200
chk "GET /jobs (JOB)"           GET "/jobs?cityId=dmv&listingType=JOB" 200
chk "GET /jobs (RENTAL)"        GET "/jobs?cityId=dmv&listingType=RENTAL" 200
chk "GET /jobs (SPACE)"         GET "/jobs?cityId=dmv&listingType=SPACE" 200

JOB_ID=$(curl -s "$BASE/jobs?cityId=dmv&limit=1" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or [{}])[0].get("id",""))' 2>/dev/null)
[ -n "$JOB_ID" ] && chk "GET /jobs/:id"  GET /jobs/$JOB_ID 200

APPLY_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/jobs/$JOB_ID/apply" \
  -H "Authorization: Bearer $WT")
APPLY_CODE=$(echo "$APPLY_RESP" | tail -1)
[ "$APPLY_CODE" = "201" ] || [ "$APPLY_CODE" = "409" ] \
  && { echo -e "${G}✓${NC} [$APPLY_CODE] POST /jobs/:id/apply"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$APPLY_CODE vs 201/409] POST /jobs/:id/apply"; ((fail++)); }

EXPIRES=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()+timedelta(days=14)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")
CJ_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/jobs" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ST" \
  -d "{\"title\":\"Curl Test Role\",\"description\":\"Created by curl-test.sh automation\",\"specialty\":\"Knotless braids\",\"payStructure\":\"60/40 Commission\",\"type\":\"FREELANCE\",\"listingType\":\"JOB\",\"cityId\":\"dmv\",\"expiresAt\":\"$EXPIRES\"}")
[ "$CJ_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /jobs (salon creates)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$CJ_CODE vs 201] POST /jobs (salon creates)"; ((fail++)); }

# ── [7] CONVERSATIONS ─────────────────────────────
echo -e "\n${B}[7] CONVERSATIONS${NC}"
chk "GET /conversations (worker)"   GET /conversations 200 "" "$WT"
chk "GET /conversations (salon)"    GET /conversations 200 "" "$ST"
chk "GET /conversations (no auth)"  GET /conversations 401

CONV_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/conversations" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d "{\"otherUserId\":\"$SID\"}")
CONV_CODE=$(echo "$CONV_RESP" | tail -1)
CONV_BODY=$(echo "$CONV_RESP" | sed '$d')
CONV_ID=$(echo "$CONV_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
[ "$CONV_CODE" = "201" ] || [ "$CONV_CODE" = "200" ] \
  && { echo -e "${G}✓${NC} [$CONV_CODE] POST /conversations → id=$CONV_ID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$CONV_CODE vs 201] POST /conversations"; echo "     ${CONV_BODY:0:200}"; ((fail++)); }

if [ -n "$CONV_ID" ]; then
  CR_RESP=$(curl -s "$BASE/chat-requests/conversation/$CONV_ID" -H "Authorization: Bearer $ST")
  CR_ID=$(echo "$CR_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id","") if isinstance(d,dict) else "")' 2>/dev/null)
  if [ -n "$CR_ID" ]; then
    ACCEPT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/chat-requests/$CR_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ST" \
      -d '{"action":"ACCEPT"}')
    [ "$ACCEPT_CODE" = "200" ] || [ "$ACCEPT_CODE" = "204" ] || [ "$ACCEPT_CODE" = "400" ] \
      && { echo -e "${G}✓${NC} [$ACCEPT_CODE] PATCH /chat-requests/:id (200=accepted,400=already-handled)"; ((pass++)); } \
      || { echo -e "${R}✗${NC} [$ACCEPT_CODE] PATCH /chat-requests/:id (accept)"; ((fail++)); }
  fi
  chk "POST /conversations/:id/messages"  POST /conversations/$CONV_ID/messages 201 \
    '{"content":"Hello from curl-test.sh!"}' "$WT"
  chk "GET /conversations/:id/messages"   GET /conversations/$CONV_ID/messages 200 "" "$WT"
  chk "PATCH /conversations/:id/read"     PATCH /conversations/$CONV_ID/read 200 "" "$WT"
fi

# ── [8] PUSH DEVICES ──────────────────────────────
echo -e "\n${B}[8] PUSH DEVICES${NC}"
chk "POST /devices (register token, →204)" POST /devices 204 \
  '{"expoPushToken":"ExponentPushToken[curl-test-fake]","platform":"IOS"}' "$WT"

# ── [9] REVIEWS ───────────────────────────────────
echo -e "\n${B}[9] REVIEWS${NC}"
[ -n "$WPROF_ID" ] && {
  chk "GET /reviews/user/:id (no auth)"        GET /reviews/user/$WPROF_ID 200
  chk "GET /reviews/user/:id (with auth)"       GET /reviews/user/$WPROF_ID 200 "" "$WT"
  chk "GET /reviews/can-review (salon→worker)"  GET /reviews/can-review/$WPROF_ID 200 "" "$ST"
}
[ -n "$SPID" ] && {
  chk "GET /reviews/user/:id (salon)"           GET /reviews/user/$SPID 200
  chk "GET /reviews/can-review (worker→salon)"  GET /reviews/can-review/$SPID 200 "" "$WT"
}

# ── [10] SPECIALTIES ──────────────────────────────
echo -e "\n${B}[10] SPECIALTIES${NC}"
chk "GET /specialties (public)" GET /specialties 200

# ── [11] REPORTS ──────────────────────────────────
echo -e "\n${B}[11] REPORTS${NC}"
RCODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/reports" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" -d '{}')
[ "$RCODE" = "400" ] || [ "$RCODE" = "201" ] \
  && { echo -e "${G}✓${NC} [$RCODE] POST /reports exists (400=validation)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$RCODE] POST /reports unexpected"; ((fail++)); }

[ -n "$SPID" ] && {
  FR=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/reports" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
    -d "{\"reportedUserId\":\"$SPID\",\"type\":\"FAKE_PROFILE\",\"reason\":\"Curl test\"}")
  [ "$FR" = "201" ] || [ "$FR" = "400" ] \
    && { echo -e "${G}✓${NC} [$FR] POST /reports (201=new, 400=duplicate)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$FR vs 201/400] POST /reports (valid body)"; ((fail++)); }
}

# ── [12] CHAT REQUESTS ────────────────────────────
echo -e "\n${B}[12] CHAT REQUESTS${NC}"
chk "GET /chat-requests/received"  GET /chat-requests/received 200 "" "$WT"
chk "GET /jobs?salonId filter"     GET "/jobs?cityId=dmv&salonId=$SPID" 200

# ── SUMMARY ───────────────────────────────────────
TOTAL=$((pass+fail))
echo ""
echo -e "${B}============================================${NC}"
echo -e "${B}                 SUMMARY                   ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}" || true
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
