#!/bin/bash
# Phase 2 — Client Identity curl tests
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

echo -e "${B}============================================${NC}"
echo -e "${B}   PHASE 2 — CLIENT IDENTITY TESTS         ${NC}"
echo -e "${B}============================================${NC}"

# ── [1] Register as CLIENT ─────────────────────────────────────────────────
echo -e "\n${B}[1] Register CLIENT account${NC}"

TS=$(python3 -c "import time; print(int(time.time()))")
CLIENT_EMAIL="phase2client_${TS}@test.com"

REG_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$CLIENT_EMAIL\",\"password\":\"Test1234!\",\"name\":\"Phase2 Client\",\"role\":\"WORKER\",\"accountType\":\"CLIENT\",\"phone\":\"+1555000${TS: -4}\"}")
REG_CODE=$(echo "$REG_RESP" | tail -1)
REG_BODY=$(echo "$REG_RESP" | sed '$d')

if [ "$REG_CODE" = "201" ]; then
  echo -e "${G}✓${NC} [201] POST /auth/register (CLIENT account)"
  ((pass++))
else
  echo -e "${R}✗${NC} [$REG_CODE vs 201] POST /auth/register (CLIENT)"
  echo "     $REG_BODY"
  ((fail++))
fi

CT=$(echo "$REG_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)
CLIENT_USER_ID=$(echo "$REG_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("user",{}).get("id",""))' 2>/dev/null)
ACCOUNT_TYPE=$(echo "$REG_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("user",{}).get("accountType",""))' 2>/dev/null)
echo -e "   ${Y}accountType=${ACCOUNT_TYPE} userId=${CLIENT_USER_ID}${NC}"

# ── [2] GET /clients/me ────────────────────────────────────────────────────
echo -e "\n${B}[2] GET /clients/me${NC}"

ME_RESP=$(curl -s -w "\n%{http_code}" "$BASE/clients/me" \
  -H "Authorization: Bearer $CT")
ME_CODE=$(echo "$ME_RESP" | tail -1)
ME_BODY=$(echo "$ME_RESP" | sed '$d')

if [ "$ME_CODE" = "200" ]; then
  echo -e "${G}✓${NC} [200] GET /clients/me"
  ((pass++))
  CLIENT_PROFILE_NAME=$(echo "$ME_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("name",""))' 2>/dev/null)
  echo -e "   ${Y}name=$CLIENT_PROFILE_NAME${NC}"
else
  echo -e "${R}✗${NC} [$ME_CODE vs 200] GET /clients/me"
  echo "     $ME_BODY"
  ((fail++))
fi

# no auth → 401
ME_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/clients/me")
[ "$ME_NOAUTH" = "401" ] \
  && { echo -e "${G}✓${NC} [401] GET /clients/me (no auth)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$ME_NOAUTH vs 401] GET /clients/me (no auth)"; ((fail++)); }

# ── [3] PATCH /clients/me ──────────────────────────────────────────────────
echo -e "\n${B}[3] PATCH /clients/me${NC}"

PATCH_RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/clients/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CT" \
  -d '{"bio":"Beauty lover — always looking for the best stylist","city":"Atlanta","state":"GA","country":"US"}')
PATCH_CODE=$(echo "$PATCH_RESP" | tail -1)
PATCH_BODY=$(echo "$PATCH_RESP" | sed '$d')

if [ "$PATCH_CODE" = "200" ]; then
  echo -e "${G}✓${NC} [200] PATCH /clients/me (bio + location)"
  ((pass++))
  UPDATED_BIO=$(echo "$PATCH_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("bio",""))' 2>/dev/null)
  echo -e "   ${Y}bio=$UPDATED_BIO${NC}"
else
  echo -e "${R}✗${NC} [$PATCH_CODE vs 200] PATCH /clients/me"
  echo "     $PATCH_BODY"
  ((fail++))
fi

# Invalid field (name too long) → 400
PATCH_BAD=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/clients/me" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"name\":\"$(python3 -c 'print("A"*200)')\"}")
[ "$PATCH_BAD" = "400" ] \
  && { echo -e "${G}✓${NC} [400] PATCH /clients/me name too long → validation"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$PATCH_BAD vs 400] PATCH /clients/me validation"; ((fail++)); }

# ── [4] Worker account cannot access /clients/me ───────────────────────────
echo -e "\n${B}[4] Worker account blocked from /clients/me${NC}"

W_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(echo "$W_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)

WORKER_ME=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/clients/me" \
  -H "Authorization: Bearer $WT")
[ "$WORKER_ME" = "403" ] \
  && { echo -e "${G}✓${NC} [403] Worker → GET /clients/me blocked"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$WORKER_ME vs 403] Worker should be blocked from /clients/me"; ((fail++)); }

# ── [5] GET /clients/me/bookings ──────────────────────────────────────────
echo -e "\n${B}[5] GET /clients/me/bookings${NC}"

BOOKINGS_RESP=$(curl -s -w "\n%{http_code}" "$BASE/clients/me/bookings" \
  -H "Authorization: Bearer $CT")
BOOKINGS_CODE=$(echo "$BOOKINGS_RESP" | tail -1)
BOOKINGS_BODY=$(echo "$BOOKINGS_RESP" | sed '$d')

if [ "$BOOKINGS_CODE" = "200" ]; then
  echo -e "${G}✓${NC} [200] GET /clients/me/bookings"
  ((pass++))
  COUNT=$(echo "$BOOKINGS_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("data",[])))' 2>/dev/null)
  echo -e "   ${Y}bookings count=$COUNT${NC}"
else
  echo -e "${R}✗${NC} [$BOOKINGS_CODE vs 200] GET /clients/me/bookings"
  echo "     $BOOKINGS_BODY"
  ((fail++))
fi

# ── [6] GET /clients/me/saved-providers ───────────────────────────────────
echo -e "\n${B}[6] Saved providers flow${NC}"

WPROF_ID=$(curl -s "$BASE/workers/me" -H "Authorization: Bearer $WT" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)

# Save a provider
SAVE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$BASE/clients/me/saved-providers/$WPROF_ID" \
  -H "Authorization: Bearer $CT")
[ "$SAVE_CODE" = "201" ] \
  && { echo -e "${G}✓${NC} [201] POST /clients/me/saved-providers/:workerId"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$SAVE_CODE vs 201] Save provider"; ((fail++)); }

# List saved providers
LIST_RESP=$(curl -s -w "\n%{http_code}" "$BASE/clients/me/saved-providers" \
  -H "Authorization: Bearer $CT")
LIST_CODE=$(echo "$LIST_RESP" | tail -1)
LIST_BODY=$(echo "$LIST_RESP" | sed '$d')

if [ "$LIST_CODE" = "200" ]; then
  COUNT=$(echo "$LIST_BODY" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("data",[])))' 2>/dev/null)
  echo -e "${G}✓${NC} [200] GET /clients/me/saved-providers → $COUNT saved"
  ((pass++))
else
  echo -e "${R}✗${NC} [$LIST_CODE vs 200] GET /clients/me/saved-providers"
  echo "     $LIST_BODY"
  ((fail++))
fi

# Save again (idempotent — upsert)
SAVE_AGAIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$BASE/clients/me/saved-providers/$WPROF_ID" \
  -H "Authorization: Bearer $CT")
[ "$SAVE_AGAIN" = "201" ] \
  && { echo -e "${G}✓${NC} [201] Save same provider again (idempotent)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$SAVE_AGAIN vs 201] Idempotent save"; ((fail++)); }

# Unsave
DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE/clients/me/saved-providers/$WPROF_ID" \
  -H "Authorization: Bearer $CT")
[ "$DEL_CODE" = "204" ] \
  && { echo -e "${G}✓${NC} [204] DELETE /clients/me/saved-providers/:workerId"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$DEL_CODE vs 204] Unsave provider"; ((fail++)); }

# Unsave again → 404
DEL_AGAIN=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE/clients/me/saved-providers/$WPROF_ID" \
  -H "Authorization: Bearer $CT")
[ "$DEL_AGAIN" = "404" ] \
  && { echo -e "${G}✓${NC} [404] DELETE unsaved provider → not found"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$DEL_AGAIN vs 404] Double-unsave should 404"; ((fail++)); }

# ── [7] CLIENT account on booking create ──────────────────────────────────
echo -e "\n${B}[7] CLIENT can create a booking (guest-style with userId wired)${NC}"

WPROF_ID=$(curl -s "$BASE/workers/me" -H "Authorization: Bearer $WT" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)

SVC_ID=$(curl -s -X POST "$BASE/services" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"name":"Phase2 Client Test","duration":30,"price":40}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("id",""))' 2>/dev/null)

# Book as logged-in client (OptionalJwtAuth → sets clientUserId)
BOOK_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CT" \
  -d "{\"providerId\":\"$WPROF_ID\",\"providerType\":\"professional\",\"serviceId\":\"$SVC_ID\",\"clientName\":\"Phase2 Client\",\"clientEmail\":\"$CLIENT_EMAIL\",\"date\":\"2026-12-16\",\"startTime\":\"11:00\"}")
BOOK_CODE=$(echo "$BOOK_RESP" | tail -1)
BOOK_BODY=$(echo "$BOOK_RESP" | sed '$d')

if [ "$BOOK_CODE" = "201" ]; then
  BOOKED_ID=$(echo "$BOOK_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("id",""))' 2>/dev/null)
  BOOKED_CLIENT_USER=$(echo "$BOOK_BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("clientUserId",""))' 2>/dev/null)
  echo -e "${G}✓${NC} [201] Client booking created"
  ((pass++))
  echo -e "   ${Y}bookingId=$BOOKED_ID clientUserId=$BOOKED_CLIENT_USER${NC}"

  # Verify clientUserId is set (not null)
  if [ -n "$BOOKED_CLIENT_USER" ] && [ "$BOOKED_CLIENT_USER" != "None" ]; then
    echo -e "${G}✓${NC} clientUserId correctly wired to logged-in client"
    ((pass++))
  else
    echo -e "${R}✗${NC} clientUserId is null — not wired to logged-in client"
    ((fail++))
  fi

  # Booking appears in /clients/me/bookings
  MY_BOOKINGS=$(curl -s "$BASE/clients/me/bookings" -H "Authorization: Bearer $CT" \
    | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("data",[])))' 2>/dev/null)
  [ "$MY_BOOKINGS" -ge "1" ] \
    && { echo -e "${G}✓${NC} Booking appears in GET /clients/me/bookings ($MY_BOOKINGS total)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} Booking not in /clients/me/bookings"; ((fail++)); }
else
  echo -e "${R}✗${NC} [$BOOK_CODE vs 201] Client booking create"
  echo "     $BOOK_BODY"
  ((fail++))
fi

# Cleanup
[ -n "$SVC_ID" ] && curl -s -o /dev/null -X DELETE "$BASE/services/$SVC_ID" -H "Authorization: Bearer $WT"

# ── [8] Full suite regression ──────────────────────────────────────────────
echo -e "\n${B}[8] Regression — original suite must still pass${NC}"
REGRESSION=$(BASE_URL="$BASE" bash "$(dirname "$0")/curl-test.sh" 2>&1 | tail -4)
echo "$REGRESSION"
if echo "$REGRESSION" | grep -q "ALL TESTS PASSED"; then
  echo -e "${G}✓${NC} Full regression suite passed"
  ((pass++))
else
  echo -e "${R}✗${NC} Regression failures detected"
  ((fail++))
fi

# ── SUMMARY ───────────────────────────────────────────────────────────────
TOTAL=$((pass+fail))
echo ""
echo -e "${B}============================================${NC}"
echo -e "${B}            PHASE 2 SUMMARY                ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}"
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL PHASE 2 TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
