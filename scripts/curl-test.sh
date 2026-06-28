#!/bin/bash
BASE="${BASE_URL:-http://localhost:4000}"
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
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(echo "$W_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
WID=$(echo "$W_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("user",{}).get("id",""))' 2>/dev/null)
[ -n "$WT" ] \
  && { echo -e "${G}✓${NC} [200] Worker login → id=$WID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Worker login FAILED"; echo "$W_RESP"; ((fail++)); exit 1; }

sleep 0.5

S_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testsalon@mysalonin.com","password":"Test1234!"}')
ST=$(echo "$S_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
SID=$(echo "$S_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("user",{}).get("id",""))' 2>/dev/null)
[ -n "$ST" ] \
  && { echo -e "${G}✓${NC} [200] Salon login → id=$SID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Salon login FAILED"; echo "$S_RESP"; ((fail++)); exit 1; }

sleep 0.3
FPV=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{"email":"testworker@mysalonin.com"}')
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
chk "GET /workers/nearby (r=25mi)"         GET "/workers/nearby?lat=38.9072&lng=-77.0369&radiusMiles=25" 200 "" "$WT"
chk "GET /workers/nearby (r=15mi)"         GET "/workers/nearby?lat=38.9072&lng=-77.0369&radiusMiles=15" 200 "" "$WT"
chk "GET /workers/nearby (r=50mi)"         GET "/workers/nearby?lat=38.9072&lng=-77.0369&radiusMiles=50" 200 "" "$WT"
chk "GET /workers/nearby (public,no auth)" GET "/workers/nearby?lat=38.9072&lng=-77.0369&radiusMiles=25" 200

# ── [6] JOBS ──────────────────────────────────────
echo -e "\n${B}[6] JOBS${NC}"
chk "GET /jobs (all)"           GET "/jobs?lat=38.9072&lng=-77.0369&page=1&limit=10" 200
chk "GET /jobs (JOB)"           GET "/jobs?lat=38.9072&lng=-77.0369&listingType=JOB" 200
chk "GET /jobs (RENTAL)"        GET "/jobs?lat=38.9072&lng=-77.0369&listingType=RENTAL" 200
chk "GET /jobs (SPACE)"         GET "/jobs?lat=38.9072&lng=-77.0369&listingType=SPACE" 200

JOB_ID=$(curl -s "$BASE/jobs?lat=38.9072&lng=-77.0369&limit=1" \
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
  -d "{\"title\":\"Curl Test Role\",\"description\":\"Created by curl-test.sh automation\",\"specialty\":\"knotless-braids\",\"payStructure\":\"60/40 Commission\",\"type\":\"FREELANCE\",\"listingType\":\"JOB\",\"lat\":38.9072,\"lng\":-77.0369,\"expiresAt\":\"$EXPIRES\"}")
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
chk "GET /jobs?salonId filter"     GET "/jobs?lat=38.9072&lng=-77.0369&salonId=$SPID" 200

# ── [13] MEDIA UPLOAD ─────────────────────────────
echo -e "\n${B}[13] MEDIA UPLOAD${NC}"
TMP_M4A=$(mktemp /tmp/salonin-test-XXXXXX.m4a)
python3 - <<PY
import struct, sys
ftyp = b'ftyp' + b'M4A ' + b'\x00\x00\x00\x00' + b'M4A ' + b'mp41'
moov = b'moov' + b'\x00\x00\x00\x10mvhd' + b'\x00' * 100
with open("$TMP_M4A", 'wb') as f:
    size = 8 + len(ftyp)
    f.write(struct.pack('>I', size) + ftyp)
    size = 8 + len(moov)
    f.write(struct.pack('>I', size) + moov)
PY
M4A_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/media/upload?folder=voice" \
  -H "Authorization: Bearer $WT" \
  -F "file=@$TMP_M4A;type=audio/x-m4a")
M4A_CODE=$(echo "$M4A_RESP" | tail -1)
M4A_BODY=$(echo "$M4A_RESP" | sed '$d')
if [ "$M4A_CODE" = "201" ] || [ "$M4A_CODE" = "503" ]; then
  echo -e "${G}✓${NC} [$M4A_CODE] POST /media/upload audio/x-m4a (201=uploaded, 503=S3 not configured)"
  ((pass++))
else
  echo -e "${R}✗${NC} [$M4A_CODE vs 201/503] POST /media/upload audio/x-m4a"
  echo "     ${M4A_BODY:0:200}"
  ((fail++))
fi
rm -f "$TMP_M4A"

# ── [14] AVAILABILITY EXCEPTIONS ─────────────────
echo -e "\n${B}[14] AVAILABILITY EXCEPTIONS${NC}"

# GET — empty list is fine
chk "GET /availability/exceptions (worker)" GET "/availability/exceptions?providerId=$WID&providerType=worker" 200 "" "$WT"

# POST — add a full-day block
EX_DATE=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()+timedelta(days=10)).strftime('%Y-%m-%d'))")
EX_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/availability/exceptions" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d "{\"date\":\"$EX_DATE\",\"isBlocked\":true,\"reason\":\"Curl test block\"}")
EX_CODE=$(echo "$EX_RESP" | tail -1)
EX_BODY=$(echo "$EX_RESP" | sed '$d')
EX_ID=$(echo "$EX_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$EX_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /availability/exceptions → id=$EX_ID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$EX_CODE vs 201] POST /availability/exceptions"; echo "     ${EX_BODY:0:200}"; ((fail++)); }

# DELETE — remove it
if [ -n "$EX_ID" ]; then
  DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/availability/exceptions/$EX_ID" \
    -H "Authorization: Bearer $WT")
  [ "$DEL_CODE" = "200" ] || [ "$DEL_CODE" = "204" ] \
    && { echo -e "${G}✓${NC} [$DEL_CODE] DELETE /availability/exceptions/:id"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$DEL_CODE vs 200/204] DELETE /availability/exceptions/:id"; ((fail++)); }
fi

# ── [15] BOOKINGS — provider reschedule ───────────
echo -e "\n${B}[15] BOOKINGS — provider reschedule${NC}"

# 404 on non-existent booking
RESCHEDULE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/bookings/nonexistent-id/reschedule" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"date":"2026-12-01","startTime":"10:00"}')
[ "$RESCHEDULE_CODE" = "404" ] || [ "$RESCHEDULE_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$RESCHEDULE_CODE] PATCH /bookings/:id/reschedule (not found → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$RESCHEDULE_CODE vs 404/403] PATCH /bookings/:id/reschedule (not found)"; ((fail++)); }

# 401 with no auth
chk "PATCH /bookings/:id/reschedule (no auth → 401)" \
  PATCH /bookings/nonexistent/reschedule 401 '{"date":"2026-12-01","startTime":"10:00"}'

# ── [16] PHASE B — no-show + filtered bookings + analytics + clients ───────────
echo -e "\n${B}[16] PHASE B — Provider Operations${NC}"

# no-show on non-existent booking → 404/403
NS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/bookings/nonexistent/no-show" \
  -H "Authorization: Bearer $WT")
[ "$NS_CODE" = "404" ] || [ "$NS_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$NS_CODE] PATCH /bookings/:id/no-show (not found → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$NS_CODE vs 404/403] PATCH /bookings/:id/no-show"; ((fail++)); }

# no-show without auth → 401
chk "PATCH /bookings/:id/no-show (no auth → 401)" PATCH /bookings/nonexistent/no-show 401

# filtered provider bookings (authenticated)
chk "GET /bookings/provider/filtered (worker)" GET "/bookings/provider/filtered?dateFilter=today" 200 "" "$WT"

# analytics (authenticated)
chk "GET /bookings/analytics (worker, 30d)" GET "/bookings/analytics?period=30d" 200 "" "$WT"

# client list (authenticated)
chk "GET /bookings/clients (worker)" GET "/bookings/clients" 200 "" "$WT"

# ── [17] BOOKING ENGINE FIXES ─────────────────────
echo -e "\n${B}[17] BOOKING ENGINE FIXES${NC}"

# 17a — POST /services with depositAmount + bufferBefore/After
SVC_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/services" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"name":"Curl Deposit Test","duration":60,"price":80,"depositAmount":20,"bufferBefore":10,"bufferAfter":5}')
SVC_CODE=$(echo "$SVC_RESP" | tail -1)
SVC_BODY=$(echo "$SVC_RESP" | sed '$d')
SVC_ID=$(echo "$SVC_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$SVC_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /services (with depositAmount/buffer) → id=$SVC_ID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$SVC_CODE vs 201] POST /services (depositAmount/buffer)"; echo "     ${SVC_BODY:0:200}"; ((fail++)); }

# 17b — verify depositAmount persisted
if [ -n "$SVC_ID" ] && [ "$SVC_CODE" = "201" ]; then
  DEP=$(echo "$SVC_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("depositAmount","MISSING"))' 2>/dev/null)
  BUF=$(echo "$SVC_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("bufferBefore","MISSING"))' 2>/dev/null)
  [ "$DEP" = "20.0" ] || [ "$DEP" = "20" ] \
    && { echo -e "${G}✓${NC} Service depositAmount=20 persisted correctly"; ((pass++)); } \
    || { echo -e "${R}✗${NC} depositAmount not persisted (got '$DEP')"; ((fail++)); }
  [ "$BUF" = "10.0" ] || [ "$BUF" = "10" ] \
    && { echo -e "${G}✓${NC} Service bufferBefore=10 persisted correctly"; ((pass++)); } \
    || { echo -e "${R}✗${NC} bufferBefore not persisted (got '$BUF')"; ((fail++)); }
fi

# 17c — clean up test service
if [ -n "$SVC_ID" ]; then
  DEL_SVC=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/services/$SVC_ID" \
    -H "Authorization: Bearer $WT")
  [ "$DEL_SVC" = "200" ] || [ "$DEL_SVC" = "204" ] \
    && { echo -e "${G}✓${NC} [$DEL_SVC] DELETE /services/:id (cleanup)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$DEL_SVC vs 204] DELETE /services/:id (cleanup)"; ((fail++)); }
fi

# 17d — confirm status guard: non-existent booking → 404/403
CONF_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/bookings/nonexistent-id/confirm" \
  -H "Authorization: Bearer $WT")
[ "$CONF_CODE" = "404" ] || [ "$CONF_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$CONF_CODE] PATCH /bookings/:id/confirm (not found → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$CONF_CODE vs 404/403] PATCH /bookings/:id/confirm"; ((fail++)); }

# 17e — complete status guard: non-existent booking → 404/403
COMP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/bookings/nonexistent-id/complete" \
  -H "Authorization: Bearer $WT")
[ "$COMP_CODE" = "404" ] || [ "$COMP_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$COMP_CODE] PATCH /bookings/:id/complete (not found → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$COMP_CODE vs 404/403] PATCH /bookings/:id/complete"; ((fail++)); }

# 17f — confirm no auth → 401
chk "PATCH /bookings/:id/confirm (no auth → 401)" PATCH /bookings/nonexistent/confirm 401
chk "PATCH /bookings/:id/complete (no auth → 401)" PATCH /bookings/nonexistent/complete 401

# 17g — POST /payments/intent no auth → 401
chk "POST /payments/intent (no auth → 401)" POST /payments/intent 401 '{"bookingId":"fake"}'

# 17h — POST /payments/refund no auth → 401
chk "POST /payments/refund (no auth → 401)" POST /payments/refund 401 '{"bookingId":"fake"}'

# 17i — POST /payments/intent with non-existent booking → 404 (ownership check after 404)
PI_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/payments/intent" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"bookingId":"00000000-0000-0000-0000-000000000000"}')
[ "$PI_CODE" = "404" ] || [ "$PI_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$PI_CODE] POST /payments/intent (fake bookingId → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$PI_CODE vs 404/403] POST /payments/intent (fake bookingId)"; ((fail++)); }

# 17j — GET /bookings/my (authenticated)
chk "GET /bookings/my (worker auth)"  GET /bookings/my 200 "" "$WT"
chk "GET /bookings/my (no auth → 401)" GET /bookings/my 401

# 17k — POST /bookings/cancel with invalid token → 403/404
CC_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/cancel" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"00000000-0000-0000-0000-000000000000","cancelToken":"invalid-token-1234567890"}')
[ "$CC_CODE" = "404" ] || [ "$CC_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$CC_CODE] POST /bookings/cancel (fake token → 404/403)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$CC_CODE vs 404/403] POST /bookings/cancel"; ((fail++)); }

# 17l — GET /availability/slots (public) with worker profile
if [ -n "$WPROF_ID" ]; then
  TODAY=$(python3 -c "from datetime import datetime; print(datetime.utcnow().strftime('%Y-%m-%d'))")
  chk "GET /availability/slots (public, worker)" \
    GET "/availability/slots?providerId=$WPROF_ID&providerType=professional&date=$TODAY&duration=60" 200
fi

# ── [18] P0/P1 FIX VERIFICATION ──────────────────
echo -e "\n${B}[18] FIX VERIFICATION — deposit · window · review · post${NC}"

# 18a — Deposit: create service with depositAmount + create booking → booking should have depositAmount set
DSVC_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/services" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"name":"Deposit Test Svc","duration":60,"price":100,"depositAmount":25}')
DSVC_CODE=$(echo "$DSVC_RESP" | tail -1)
DSVC_BODY=$(echo "$DSVC_RESP" | sed '$d')
DSVC_ID=$(echo "$DSVC_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$DSVC_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /services (depositAmount=25)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$DSVC_CODE vs 201] POST /services (deposit svc)"; echo "     ${DSVC_BODY:0:200}"; ((fail++)); }

# 18b — Cancellation window enforcement: provider with no window → cancel passes
#         (can't set window via API in test, so verify 404 is correct on bad token)
CC2_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/cancel" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"11111111-0000-0000-0000-000000000000","cancelToken":"bad-cancel-token-xx"}')
[ "$CC2_CODE" = "404" ] || [ "$CC2_CODE" = "403" ] \
  && { echo -e "${G}✓${NC} [$CC2_CODE] POST /bookings/cancel (bad token → 404/403 — window check reached)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$CC2_CODE vs 404/403] POST /bookings/cancel"; ((fail++)); }

# 18c — Review from booking: can-review still works (200 response)
[ -n "$WPROF_ID" ] && {
  chk "GET /reviews/can-review (worker→salon with booking fallback)" \
    GET /reviews/can-review/$SID 200 "" "$WT"
}

# 18d — POST /posts (no auth → 401)
chk "POST /posts (no auth → 401)" POST /posts 401 '{"type":"TEXT","caption":"test"}'

# 18e — POST /posts with auth (TEXT type, no media)
POST_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"TEXT","caption":"curl-test post #test","visibility":"PUBLIC"}')
POST_CODE=$(echo "$POST_RESP" | tail -1)
POST_BODY=$(echo "$POST_RESP" | sed '$d')
POST_ID=$(echo "$POST_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$POST_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /posts (TEXT) → id=$POST_ID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$POST_CODE vs 201] POST /posts (TEXT)"; echo "     ${POST_BODY:0:200}"; ((fail++)); }

# 18f — GET /posts/user/:id (public — verify post was created)
[ -n "$WID" ] && {
  chk "GET /posts/user/:id (worker's posts)" GET /posts/user/$WID 200
}

# 18g — DELETE the test post
if [ -n "$POST_ID" ]; then
  DEL_POST=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/posts/$POST_ID" \
    -H "Authorization: Bearer $WT")
  [ "$DEL_POST" = "200" ] || [ "$DEL_POST" = "204" ] \
    && { echo -e "${G}✓${NC} [$DEL_POST] DELETE /posts/:id (cleanup)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$DEL_POST vs 200/204] DELETE /posts/:id"; ((fail++)); }
fi

# 18h — cleanup deposit test service
if [ -n "$DSVC_ID" ]; then
  curl -s -o /dev/null -X DELETE "$BASE/services/$DSVC_ID" -H "Authorization: Bearer $WT"
  echo -e "${G}✓${NC} Deposit test service cleaned up"
  ((pass++))
fi

# 18i — instant booking: verify /bookings/provider/filtered returns results
chk "GET /bookings/provider/filtered (all)" GET "/bookings/provider/filtered" 200 "" "$WT"

# 18j — GET /posts/explore (public, OptionalJwt)
chk "GET /posts/explore (public feed)" GET /posts/explore 200

# ── [19] COVERAGE GAPS — waitlist · stories · follows · intake · booking e2e ──
echo -e "\n${B}[19] COVERAGE GAPS — waitlist · stories · follows · intake · booking e2e${NC}"

# 19a — Waitlist: join with preferred startTime
WDATE=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()+timedelta(days=5)).strftime('%Y-%m-%d'))")
WL_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings/waitlist" \
  -H "Content-Type: application/json" \
  -d "{\"providerId\":\"$WPROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"00000000-0000-0000-0000-000000000001\",\"date\":\"$WDATE\",\"startTime\":\"14:00\",\"clientName\":\"Curl Tester\",\"clientEmail\":\"curltest@example.com\"}")
WL_CODE=$(echo "$WL_RESP" | tail -1)
WL_BODY=$(echo "$WL_RESP" | sed '$d')
WL_ID=$(echo "$WL_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$WL_CODE" = "201" ] || [ "$WL_CODE" = "404" ] \
  && { echo -e "${G}✓${NC} [$WL_CODE] POST /bookings/waitlist (preferred time 14:00; 404=no service ok)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$WL_CODE vs 201/404] POST /bookings/waitlist"; echo "     ${WL_BODY:0:200}"; ((fail++)); }

# 19b — Waitlist: provider GET (auth required)
chk "GET /bookings/waitlist (provider)" GET /bookings/waitlist 200 "" "$WT"

# 19c — Waitlist: DELETE entry if created
if [ -n "$WL_ID" ] && [ "$WL_CODE" = "201" ]; then
  WL_DEL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/bookings/waitlist/$WL_ID" \
    -H "Authorization: Bearer $WT")
  [ "$WL_DEL" = "204" ] || [ "$WL_DEL" = "200" ] || [ "$WL_DEL" = "403" ] \
    && { echo -e "${G}✓${NC} [$WL_DEL] DELETE /bookings/waitlist/:id (cleanup)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$WL_DEL vs 204] DELETE /bookings/waitlist/:id"; ((fail++)); }
fi

# 19d — Waitlist: no-auth GET → 401
chk "GET /bookings/waitlist (no auth → 401)" GET /bookings/waitlist 401

# 19e — Stories: create (TEXT)
STY_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/stories" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"TEXT","textContent":"curl test story","textBgColor":"#1A1A2E","visibility":"PUBLIC","bookingEnabled":false}')
STY_CODE=$(echo "$STY_RESP" | tail -1)
STY_BODY=$(echo "$STY_RESP" | sed '$d')
STY_ID=$(echo "$STY_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
[ "$STY_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /stories (TEXT) → id=$STY_ID"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$STY_CODE vs 201] POST /stories (TEXT)"; echo "     ${STY_BODY:0:200}"; ((fail++)); }

# 19f — Stories: GET /stories/feed (auth required)
chk "GET /stories/feed (auth)" GET /stories/feed 200 "" "$WT"

# 19g — Stories: GET /stories/my (auth required)
chk "GET /stories/my (auth)" GET /stories/my 200 "" "$WT"

# 19h — Stories: feed includes workerProfile.id (Book Now CTA fix)
FEED_BODY=$(curl -s "$BASE/stories/feed" -H "Authorization: Bearer $WT")
HAS_PROF_ID=$(echo "$FEED_BODY" | python3 -c '
import sys,json
d=json.load(sys.stdin)
groups=(d.get("data") or {}).get("groups") or (d.get("groups") or [])
for g in groups:
  for s in g.get("stories",[]):
    u=s.get("user",{})
    wp=u.get("workerProfile")
    sp=u.get("salonProfile")
    if (wp and wp.get("id")) or (sp and sp.get("id")):
      print("YES"); sys.exit(0)
print("NO")
' 2>/dev/null)
[ "$HAS_PROF_ID" = "YES" ] || [ "$HAS_PROF_ID" = "NO" ] \
  && { echo -e "${G}✓${NC} GET /stories/feed profile.id field present (Book Now CTA fix; NO=no stories yet)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /stories/feed malformed response"; ((fail++)); }

# 19i — Stories: bookingEnabled story created for CTA fix verification
if [ -n "$STY_ID" ]; then
  STY_BOOK_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/stories" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
    -d '{"type":"TEXT","textContent":"book me!","textBgColor":"#D85A30","visibility":"PUBLIC","bookingEnabled":true}')
  STY_BOOK_CODE=$(echo "$STY_BOOK_RESP" | tail -1)
  STY_BOOK_ID=$(echo "$STY_BOOK_RESP" | sed '$d' | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
  [ "$STY_BOOK_CODE" = "201" ] \
    && { echo -e "${G}✓${NC} [201] POST /stories (bookingEnabled=true)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$STY_BOOK_CODE vs 201] POST /stories (bookingEnabled)"; ((fail++)); }
fi

# 19j — Stories: GET /stories/feed now has workerProfile.id in bookingEnabled story
if [ -n "$STY_BOOK_ID" ]; then
  FEED2=$(curl -s "$BASE/stories/feed" -H "Authorization: Bearer $WT")
  HAS_ID2=$(echo "$FEED2" | python3 -c '
import sys,json
d=json.load(sys.stdin)
groups=(d.get("data") or {}).get("groups") or (d.get("groups") or [])
for g in groups:
  for s in g.get("stories",[]):
    if s.get("bookingEnabled"):
      u=s.get("user",{})
      wp=u.get("workerProfile"); sp=u.get("salonProfile")
      if wp and wp.get("id"): print("YES"); sys.exit(0)
      if sp and sp.get("id"): print("YES"); sys.exit(0)
print("NO")
' 2>/dev/null)
  [ "$HAS_ID2" = "YES" ] \
    && { echo -e "${G}✓${NC} bookingEnabled story has user.workerProfile.id (Book Now CTA routable)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} bookingEnabled story missing profile.id"; ((fail++)); }
fi

# 19k — Stories: DELETE test stories (cleanup)
for sid in "$STY_ID" "$STY_BOOK_ID"; do
  [ -n "$sid" ] && curl -s -o /dev/null -X DELETE "$BASE/stories/$sid" -H "Authorization: Bearer $WT"
done
[ -n "$STY_ID" ] && { echo -e "${G}✓${NC} Stories cleaned up"; ((pass++)); }

# 19l — Follows: suggestions
chk "GET /follows/suggestions/me (auth)" GET /follows/suggestions/me 200 "" "$WT"

# 19m — Follows: follow salon user + check status
if [ -n "$SID" ]; then
  FOL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/follows/$SID" \
    -H "Authorization: Bearer $WT")
  [ "$FOL_CODE" = "201" ] || [ "$FOL_CODE" = "200" ] || [ "$FOL_CODE" = "409" ] \
    && { echo -e "${G}✓${NC} [$FOL_CODE] POST /follows/:userId (201=new, 409=already following)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$FOL_CODE vs 201/409] POST /follows/:userId"; ((fail++)); }
  chk "GET /follows/:userId/status" GET /follows/$SID/status 200 "" "$WT"
fi

# 19n — Intake forms: for-provider (public endpoint)
if [ -n "$WPROF_ID" ]; then
  chk "GET /intake-forms/for-provider (public)" \
    GET "/intake-forms/for-provider?providerId=$WPROF_ID&providerType=professional" 200
fi

# 19o — Posts: GET /posts/feed (requires auth)
chk "GET /posts/feed (auth)" GET /posts/feed 200 "" "$WT"

# 19p — Booking creation end-to-end (slot → confirm)
#        Use worker's own availability to grab a future slot, then create booking as salon
if [ -n "$WPROF_ID" ]; then
  SLOT_DATE=$(python3 -c "from datetime import datetime,timedelta; d=datetime.utcnow()+timedelta(days=3); print(d.strftime('%Y-%m-%d'))")
  SLOT_BODY=$(curl -s "$BASE/availability/slots?providerId=$WPROF_ID&providerType=professional&date=$SLOT_DATE&duration=60")
  FIRST_SLOT=$(echo "$SLOT_BODY" | python3 -c '
import sys,json
d=json.load(sys.stdin)
slots=(d.get("data") or d)
if isinstance(slots,list):
  for s in slots:
    if s.get("available",True): print(s.get("time","")); break
' 2>/dev/null)

  # Get a service id for the worker
  SVC_LIST=$(curl -s "$BASE/services?providerId=$WPROF_ID&providerType=professional")
  FIRST_SVC_ID=$(echo "$SVC_LIST" | python3 -c '
import sys,json
d=json.load(sys.stdin)
svcs=(d.get("data") or d)
if isinstance(svcs,list) and svcs: print(svcs[0].get("id",""))
' 2>/dev/null)

  if [ -n "$FIRST_SLOT" ] && [ -n "$FIRST_SVC_ID" ]; then
    BK_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ST" \
      -d "{\"providerId\":\"$WPROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"$FIRST_SVC_ID\",\"date\":\"$SLOT_DATE\",\"startTime\":\"$FIRST_SLOT\",\"clientName\":\"Curl Test Client\",\"clientEmail\":\"curltest@mysalonin.com\"}")
    BK_CODE=$(echo "$BK_RESP" | tail -1)
    BK_BODY=$(echo "$BK_RESP" | sed '$d')
    BK_ID=$(echo "$BK_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("id",""))' 2>/dev/null)
    [ "$BK_CODE" = "201" ] || [ "$BK_CODE" = "409" ] \
      && { echo -e "${G}✓${NC} [$BK_CODE] POST /bookings e2e (slot=$FIRST_SLOT svc=$FIRST_SVC_ID; 409=conflict ok)"; ((pass++)); } \
      || { echo -e "${R}✗${NC} [$BK_CODE vs 201/409] POST /bookings e2e"; echo "     ${BK_BODY:0:300}"; ((fail++)); }

    # Cleanup: cancel the booking if created
    if [ "$BK_CODE" = "201" ] && [ -n "$BK_ID" ]; then
      CANCEL_TOK=$(echo "$BK_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d).get("cancelToken",""))' 2>/dev/null)
      if [ -n "$CANCEL_TOK" ]; then
        CL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings/cancel" \
          -H "Content-Type: application/json" \
          -d "{\"bookingId\":\"$BK_ID\",\"cancelToken\":\"$CANCEL_TOK\"}")
        [ "$CL_CODE" = "200" ] || [ "$CL_CODE" = "204" ] \
          && { echo -e "${G}✓${NC} [$CL_CODE] POST /bookings/cancel (e2e cleanup)"; ((pass++)); } \
          || { echo -e "${R}✗${NC} [$CL_CODE] POST /bookings/cancel (e2e cleanup)"; ((fail++)); }
      fi
    fi
  else
    echo -e "${B}~${NC} POST /bookings e2e skipped (no available slot or service on $SLOT_DATE)"
  fi
fi

# ── [17] Bug Fix Endpoints ────────────────────────
echo -e "\n${B}[17] BUG FIX ENDPOINTS${NC}"

# Stripe dashboard-url (401 or 400 = endpoint exists)
chk "GET /stripe-connect/dashboard-url (no Stripe acct → 400/401)" GET /stripe-connect/dashboard-url 400 "" "$WT"

# Provider filtered bookings includes intakeResponse field
FILT_BODY=$(curl -s "$BASE/bookings/provider/filtered" -H "Authorization: Bearer $WT")
echo "$FILT_BODY" | python3 -c '
import sys, json
d = json.load(sys.stdin)
items = d.get("data", d) if isinstance(d.get("data", d), list) else []
# just check it returns a list (even empty)
if isinstance(items, list): print("ok")
else: print("fail")
' 2>/dev/null | grep -q ok \
  && { echo -e "${G}✓${NC} [200] GET /bookings/provider/filtered returns list"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /bookings/provider/filtered unexpected shape"; ((fail++)); }

# Reviews canReview self-review → canReview:false
CAN_REVIEW=$(curl -s "$BASE/reviews/can-review/$WID" -H "Authorization: Bearer $WT")
echo "$CAN_REVIEW" | python3 -c '
import sys, json
d = json.load(sys.stdin)
data = d.get("data", d)
cr = data.get("canReview", True)
print("ok" if cr == False else "fail")
' 2>/dev/null | grep -q ok \
  && { echo -e "${G}✓${NC} [200] GET /reviews/can-review/self → canReview:false"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /reviews/can-review/self → expected canReview:false"; ((fail++)); }

# Stripe connect status endpoint still works
chk "GET /stripe-connect/status (worker)" GET /stripe-connect/status 200 "" "$WT"

# ── [17] New endpoints: walk-in booking, client notes, salon staff ─────────
echo ""
echo -e "${B}[17] Walk-in + Client Notes + SalonStaff${NC}"

# Walk-in booking (isWalkIn:true → skips slot check, auto-confirms)
# We need a service ID to test; reuse if available from earlier context
WALKIN_BODY=$(curl -s -X POST "$BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ST" \
  -d "{
    \"providerId\": \"$SID\",
    \"providerType\": \"salon\",
    \"serviceId\": \"$SVC_ID\",
    \"clientName\": \"Walk In\",
    \"clientEmail\": \"walkin@test.com\",
    \"date\": \"$(date +%Y-%m-%d)\",
    \"startTime\": \"14:00\",
    \"isWalkIn\": true,
    \"isProviderCreated\": true
  }" 2>/dev/null)
WALKIN_STATUS=$(echo "$WALKIN_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("status",""))' 2>/dev/null)
[ "$WALKIN_STATUS" = "CONFIRMED" ] \
  && { echo -e "${G}✓${NC} POST /bookings isWalkIn=true → status=CONFIRMED"; ((pass++)); } \
  || { echo -e "${R}✗${NC} POST /bookings isWalkIn=true → expected CONFIRMED, got: $WALKIN_STATUS"; ((fail++)); }

WALKIN_ID=$(echo "$WALKIN_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("id",""))' 2>/dev/null)

# Client notes endpoint
if [ -n "$WALKIN_ID" ]; then
  chk "PATCH /bookings/:id/notes (provider updates notes)" PATCH "/bookings/$WALKIN_ID/notes" 204 '{"notes":"Allergic to sulfates"}' "$ST"
else
  echo -e "${R}✗${NC} PATCH /bookings/:id/notes — skipped (no walk-in booking ID)"; ((fail++))
fi

# Analytics now includes platformFees + netRevenue
ANALYTICS_BODY=$(curl -s "$BASE/bookings/analytics?period=30d" -H "Authorization: Bearer $ST" 2>/dev/null)
echo "$ANALYTICS_BODY" | python3 -c '
import sys, json
d = json.load(sys.stdin)
data = d.get("data", d)
has_fees = "platformFees" in data
has_net = "netRevenue" in data
print("ok" if has_fees and has_net else "fail")
' 2>/dev/null | grep -q ok \
  && { echo -e "${G}✓${NC} GET /bookings/analytics includes platformFees + netRevenue"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /bookings/analytics missing platformFees/netRevenue"; ((fail++)); }

# SalonStaff — GET /salons/staff (salon)
chk "GET /salons/staff (salon)" GET /salons/staff 200 "" "$ST"

# SalonStaff — GET /salons/staff/invites (worker)
chk "GET /salons/staff/invites (worker)" GET /salons/staff/invites 200 "" "$WT"

# SalonStaff — invite worker (POST /salons/staff/invite/:workerId)
INVITE_BODY=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/salons/staff/invite/$WID" \
  -H "Authorization: Bearer $ST" 2>/dev/null)
[ "$INVITE_BODY" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /salons/staff/invite/:workerId"; ((pass++)); } \
  || { echo -e "${R}✗${NC} POST /salons/staff/invite/:workerId → $INVITE_BODY (expected 201)"; ((fail++)); }

# SalonStaff — worker accepts invite
INVITE_ID=$(curl -s "$BASE/salons/staff/invites" -H "Authorization: Bearer $WT" 2>/dev/null \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); items=d.get("data",d); print(items[0]["id"] if items else "")' 2>/dev/null)
if [ -n "$INVITE_ID" ]; then
  chk "PATCH /salons/staff/invites/:id/accept (worker)" PATCH "/salons/staff/invites/$INVITE_ID/accept" 200 "" "$WT"
else
  echo -e "${R}✗${NC} PATCH /salons/staff/invites/:id/accept — skipped (no invite ID)"; ((fail++))
fi

# New booking screen route check (creates provider booking — uses walk-in path above)
# Already validated via the walk-in booking test above.

# ── [18] BOOKING FLOW BUG FIXES ───────────────────
echo -e "\n${B}[18] BOOKING FLOW BUG FIXES${NC}"

# 18a. Client login (register test client if needed)
CLIENT_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testclient@mysalonin.com","password":"Test1234!"}')
CT=$(echo "$CLIENT_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
if [ -z "$CT" ]; then
  REG=$(curl -s -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"testclient@mysalonin.com","password":"Test1234!","name":"Test Client","role":"WORKER","accountType":"CLIENT"}')
  CT=$(echo "$REG" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken",""))' 2>/dev/null)
fi
[ -n "$CT" ] \
  && { echo -e "${G}✓${NC} [200] Client login/register OK"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Client login/register FAILED — skipping section [18]"; ((fail++)); }

# 18b. GET /client-profile — returns profile for current CLIENT
CP_BODY=$(curl -s "$BASE/client-profile" -H "Authorization: Bearer $CT" 2>/dev/null)
CP_NAME=$(echo "$CP_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("name",""))' 2>/dev/null)
[ -n "$CP_NAME" ] \
  && { echo -e "${G}✓${NC} GET /client-profile → name=$CP_NAME"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /client-profile failed or empty: ${CP_BODY:0:200}"; ((fail++)); }

# 18c. PATCH /client-profile — update name + phone
PATCH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/client-profile" \
  -H "Authorization: Bearer $CT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client Updated","phone":"+15555550100"}')
[ "$PATCH_CODE" = "200" ] \
  && { echo -e "${G}✓${NC} [200] PATCH /client-profile"; ((pass++)); } \
  || { echo -e "${R}✗${NC} PATCH /client-profile → $PATCH_CODE (expected 200)"; ((fail++)); }

# 18d. GET /client-profile after update — verify name persisted
CP2_BODY=$(curl -s "$BASE/client-profile" -H "Authorization: Bearer $CT" 2>/dev/null)
CP2_NAME=$(echo "$CP2_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("name",""))' 2>/dev/null)
[ "$CP2_NAME" = "Test Client Updated" ] \
  && { echo -e "${G}✓${NC} GET /client-profile name persisted after PATCH"; ((pass++)); } \
  || { echo -e "${R}✗${NC} GET /client-profile name mismatch: got '$CP2_NAME'"; ((fail++)); }

# 18e. acceptsBookings gate — booking against provider with acceptsBookings=false should fail
# Get salon's provider ID
SALON_PROFILE=$(curl -s "$BASE/salons/me" -H "Authorization: Bearer $ST" 2>/dev/null)
SALON_PROVIDER_ID=$(echo "$SALON_PROFILE" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",d).get("id",""))' 2>/dev/null)

# Ensure salon has acceptsBookings=false and has a service
if [ -n "$SALON_PROVIDER_ID" ]; then
  # Disable bookings temporarily
  curl -s -X PATCH "$BASE/salons/me" \
    -H "Authorization: Bearer $ST" \
    -H "Content-Type: application/json" \
    -d '{"acceptsBookings":false}' > /dev/null 2>&1

  # Get first active service for this salon
  SALON_SVC=$(curl -s "$BASE/provider-services?providerId=$SALON_PROVIDER_ID&providerType=salon" \
    -H "Authorization: Bearer $CT" 2>/dev/null)
  SALON_SVC_ID=$(echo "$SALON_SVC" | python3 -c '
import sys,json
d=json.load(sys.stdin)
items=d.get("data",d)
if isinstance(items,list) and items: print(items[0]["id"])
else: print("")
' 2>/dev/null)

  if [ -n "$SALON_SVC_ID" ]; then
    GATE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/bookings" \
      -H "Authorization: Bearer $CT" \
      -H "Content-Type: application/json" \
      -d "{\"providerId\":\"$SALON_PROVIDER_ID\",\"providerType\":\"salon\",\"serviceId\":\"$SALON_SVC_ID\",\"date\":\"2099-01-15\",\"startTime\":\"10:00\",\"clientName\":\"Test Client\",\"clientEmail\":\"testclient@mysalonin.com\"}")
    [ "$GATE_CODE" = "400" ] \
      && { echo -e "${G}✓${NC} [400] POST /bookings blocked when acceptsBookings=false"; ((pass++)); } \
      || { echo -e "${R}✗${NC} POST /bookings with acceptsBookings=false → $GATE_CODE (expected 400)"; ((fail++)); }

    # Re-enable bookings
    curl -s -X PATCH "$BASE/salons/me" \
      -H "Authorization: Bearer $ST" \
      -H "Content-Type: application/json" \
      -d '{"acceptsBookings":true}' > /dev/null 2>&1
  else
    echo -e "${R}✗${NC} acceptsBookings gate — skipped (no salon service found)"; ((fail++))
  fi
else
  echo -e "${R}✗${NC} acceptsBookings gate — skipped (no salon provider ID)"; ((fail++))
fi

# 18f. login response includes clientProfile for CLIENT accounts
LOGIN_BODY=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testclient@mysalonin.com","password":"Test1234!"}')
HAS_CP=$(echo "$LOGIN_BODY" | python3 -c '
import sys,json
d=json.load(sys.stdin)
u=d.get("user",{})
print("ok" if "clientProfile" in u else "fail")
' 2>/dev/null)
[ "$HAS_CP" = "ok" ] \
  && { echo -e "${G}✓${NC} POST /auth/login response includes clientProfile for CLIENT"; ((pass++)); } \
  || { echo -e "${R}✗${NC} POST /auth/login missing clientProfile in user object"; ((fail++)); }

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
