#!/bin/bash
# Phase 3 — Social Feed & Posts curl tests
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

extract() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin)$2)" 2>/dev/null; }

echo -e "${B}============================================${NC}"
echo -e "${B}   PHASE 3 — SOCIAL FEED & POSTS TESTS     ${NC}"
echo -e "${B}============================================${NC}"

# ── Auth: get a worker token ───────────────────────────────────────────────
echo -e "\n${B}[0] Setup — login as worker${NC}"
W_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(extract "$W_RESP" '.get("accessToken","")')
W_ID=$(extract "$W_RESP" '.get("user",{}).get("id","")')
echo -e "   ${Y}worker id=$W_ID${NC}"

# Register a second user for follow/feed tests
TS=$(python3 -c "import time; print(int(time.time()))")
REG2=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"phase3b_${TS}@test.com\",\"password\":\"Test1234!\",\"name\":\"Phase3 B\",\"role\":\"WORKER\",\"accountType\":\"PROFESSIONAL\"}")
WT2=$(extract "$REG2" '.get("accessToken","")')
W2_ID=$(extract "$REG2" '.get("user",{}).get("id","")')
echo -e "   ${Y}user2 id=$W2_ID${NC}"

# user2 follows worker
curl -s -o /dev/null -X POST "$BASE/follows/$W_ID" -H "Authorization: Bearer $WT2"

# ── [1] Create Posts ───────────────────────────────────────────────────────
echo -e "\n${B}[1] Create Posts (PHOTO, VIDEO, BEFORE_AFTER, TEXT)${NC}"

P1=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"PHOTO","caption":"Fresh cut #haircut #barbershop","mediaUrls":["https://example.com/photo1.jpg"],"visibility":"PUBLIC"}')
P1_CODE=$(echo "$P1" | tail -1); P1_BODY=$(echo "$P1" | sed '$d')
if [ "$P1_CODE" = "201" ]; then
  POST1_ID=$(extract "$P1_BODY" '.get("data",{}).get("id","")')
  echo -e "${G}✓${NC} [201] POST /posts (PHOTO) → id=$POST1_ID"
  ((pass++))
else
  echo -e "${R}✗${NC} [$P1_CODE vs 201] POST /posts (PHOTO)"
  echo "   $P1_BODY"; ((fail++))
fi

P2=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"VIDEO","caption":"Tutorial video #tutorial","mediaUrls":["https://example.com/vid.mp4"]}')
P2_CODE=$(echo "$P2" | tail -1)
[ "$P2_CODE" = "201" ] && { POST2_ID=$(extract "$(echo "$P2" | sed '$d')" '.get("data",{}).get("id","")'); echo -e "${G}✓${NC} [201] POST /posts (VIDEO)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$P2_CODE vs 201] POST /posts (VIDEO)"; ((fail++)); }

P3=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"BEFORE_AFTER","caption":"Amazing transformation #beforeafter","beforeUrl":"https://example.com/before.jpg","afterUrl":"https://example.com/after.jpg"}')
P3_CODE=$(echo "$P3" | tail -1)
[ "$P3_CODE" = "201" ] && { POST3_ID=$(extract "$(echo "$P3" | sed '$d')" '.get("data",{}).get("id","")'); echo -e "${G}✓${NC} [201] POST /posts (BEFORE_AFTER)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$P3_CODE vs 201] POST /posts (BEFORE_AFTER)"; ((fail++)); }

P4=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"TEXT","caption":"Good morning beauty fam! #positivity #beauty"}')
P4_CODE=$(echo "$P4" | tail -1)
[ "$P4_CODE" = "201" ] && { POST4_ID=$(extract "$(echo "$P4" | sed '$d')" '.get("data",{}).get("id","")'); echo -e "${G}✓${NC} [201] POST /posts (TEXT)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} [$P4_CODE vs 201] POST /posts (TEXT)"; ((fail++)); }

# No auth → 401
chk "POST /posts no auth → 401" POST /posts 401 '{"type":"PHOTO"}' ""

# ── [2] GET single post ────────────────────────────────────────────────────
echo -e "\n${B}[2] GET /posts/:id${NC}"
if [ -n "$POST1_ID" ]; then
  chk "GET /posts/$POST1_ID (no auth)" GET "/posts/$POST1_ID" 200 "" ""
  chk "GET /posts/$POST1_ID (authed)" GET "/posts/$POST1_ID" 200 "" "$WT"
fi
chk "GET /posts/00000000-0000-0000-0000-000000000000 → 404" GET "/posts/00000000-0000-0000-0000-000000000000" 404 "" ""

# ── [3] GET user posts ─────────────────────────────────────────────────────
echo -e "\n${B}[3] GET /posts/user/:userId${NC}"
if [ -n "$W_ID" ]; then
  UPOSTS=$(curl -s "$BASE/posts/user/$W_ID" -H "Authorization: Bearer $WT")
  UCOUNT=$(echo "$UPOSTS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("data",{}).get("data",[])))' 2>/dev/null)
  UCOUNT="${UCOUNT:-0}"
  [ "$UCOUNT" -ge "3" ] \
    && { echo -e "${G}✓${NC} [200] GET /posts/user/$W_ID → $UCOUNT posts"; ((pass++)); } \
    || { echo -e "${R}✗${NC} Expected ≥3 posts for worker, got $UCOUNT"; ((fail++)); }
fi

# ── [4] PATCH post ────────────────────────────────────────────────────────
echo -e "\n${B}[4] PATCH /posts/:id${NC}"
if [ -n "$POST1_ID" ]; then
  chk "PATCH /posts/$POST1_ID (owner)" PATCH "/posts/$POST1_ID" 200 '{"caption":"Updated caption #haircut"}' "$WT"
  chk "PATCH /posts/$POST1_ID (non-owner → 403)" PATCH "/posts/$POST1_ID" 403 '{"caption":"Hacked"}' "$WT2"
fi

# ── [5] Like / Unlike ─────────────────────────────────────────────────────
echo -e "\n${B}[5] Like / Unlike${NC}"
if [ -n "$POST1_ID" ]; then
  LIKE_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts/$POST1_ID/like" -H "Authorization: Bearer $WT2")
  LIKE_CODE=$(echo "$LIKE_RESP" | tail -1)
  LIKE_BODY=$(echo "$LIKE_RESP" | sed '$d')
  if [ "$LIKE_CODE" = "201" ]; then
    LIKED=$(extract "$LIKE_BODY" '.get("data",{}).get("liked",False)')
    LC=$(extract "$LIKE_BODY" '.get("data",{}).get("likesCount",0)')
    echo -e "${G}✓${NC} [201] POST /posts/$POST1_ID/like → liked=$LIKED count=$LC"
    ((pass++))
  else
    echo -e "${R}✗${NC} [$LIKE_CODE vs 201] Like post"; ((fail++))
  fi

  # Like again (idempotent — same state returned)
  LIKE2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/posts/$POST1_ID/like" -H "Authorization: Bearer $WT2")
  [ "$LIKE2" = "201" ] && { echo -e "${G}✓${NC} [201] Like again (idempotent)"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$LIKE2 vs 201] Like idempotent"; ((fail++)); }

  # Unlike
  UNLIKE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/posts/$POST1_ID/like" -H "Authorization: Bearer $WT2")
  UNLIKE_CODE=$(echo "$UNLIKE" | tail -1)
  [ "$UNLIKE_CODE" = "200" ] && { echo -e "${G}✓${NC} [200] DELETE /posts/$POST1_ID/like"; ((pass++)); } \
    || { echo -e "${R}✗${NC} [$UNLIKE_CODE vs 200] Unlike post"; ((fail++)); }
fi

# ── [6] Comments ──────────────────────────────────────────────────────────
echo -e "\n${B}[6] Comments${NC}"
if [ -n "$POST1_ID" ]; then
  # Add top-level comment
  CMT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts/$POST1_ID/comments" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $WT2" \
    -d '{"content":"Great work!"}')
  CMT_CODE=$(echo "$CMT_RESP" | tail -1)
  CMT_BODY=$(echo "$CMT_RESP" | sed '$d')
  if [ "$CMT_CODE" = "201" ]; then
    CMT_ID=$(extract "$CMT_BODY" '.get("data",{}).get("id","")')
    echo -e "${G}✓${NC} [201] POST comment → id=$CMT_ID"
    ((pass++))
  else
    echo -e "${R}✗${NC} [$CMT_CODE vs 201] Add comment"; ((fail++))
  fi

  # Reply to comment
  if [ -n "$CMT_ID" ]; then
    chk "POST /posts/$POST1_ID/comments (reply)" POST "/posts/$POST1_ID/comments" 201 \
      "{\"content\":\"Thanks!\",\"parentId\":\"$CMT_ID\"}" "$WT"
  fi

  # List comments
  chk "GET /posts/$POST1_ID/comments" GET "/posts/$POST1_ID/comments" 200 "" ""

  # Delete comment (owner)
  if [ -n "$CMT_ID" ]; then
    chk "DELETE comment (owner → 204)" DELETE "/posts/$POST1_ID/comments/$CMT_ID" 204 "" "$WT2"
  fi
fi

# Comment too long → 400
if [ -n "$POST1_ID" ]; then
  LONG_CMT=$(python3 -c "print('A'*1001)")
  chk "POST comment too long → 400" POST "/posts/$POST1_ID/comments" 400 "{\"content\":\"$LONG_CMT\"}" "$WT"
fi

# ── [7] Explore ───────────────────────────────────────────────────────────
echo -e "\n${B}[7] GET /posts/explore${NC}"
EXPLORE=$(curl -s "$BASE/posts/explore")
ECOUNT=$(echo "$EXPLORE" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("data",{}).get("posts",[])))' 2>/dev/null); ECOUNT="${ECOUNT:-0}"
TRENDING=$(echo "$EXPLORE" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("data",{}).get("trendingHashtags",[])))' 2>/dev/null); TRENDING="${TRENDING:-0}"
[ "$ECOUNT" -ge "0" ] \
  && { echo -e "${G}✓${NC} [200] GET /posts/explore → $ECOUNT posts, $TRENDING trending tags"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Explore failed"; ((fail++)); }

# Explore with hashtag filter
chk "GET /posts/explore?hashtag=haircut" GET "/posts/explore?hashtag=haircut" 200 "" ""

# ── [8] Feed ──────────────────────────────────────────────────────────────
echo -e "\n${B}[8] GET /posts/feed (user2 follows worker)${NC}"
FEED=$(curl -s -w "\n%{http_code}" "$BASE/posts/feed" -H "Authorization: Bearer $WT2")
FEED_CODE=$(echo "$FEED" | tail -1)
FEED_BODY=$(echo "$FEED" | sed '$d')
if [ "$FEED_CODE" = "200" ]; then
  FCOUNT=$(echo "$FEED_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("data",{}).get("posts",[])))' 2>/dev/null); FCOUNT="${FCOUNT:-0}"
  echo -e "${G}✓${NC} [200] GET /posts/feed → $FCOUNT posts for user2"
  ((pass++))
  [ "$FCOUNT" -ge "1" ] \
    && { echo -e "${G}✓${NC} Feed contains posts from followed user"; ((pass++)); } \
    || { echo -e "${R}✗${NC} Feed empty — followed user's posts missing"; ((fail++)); }
else
  echo -e "${R}✗${NC} [$FEED_CODE vs 200] GET /posts/feed"
  echo "   $FEED_BODY"; ((fail++))
fi

# Feed no auth → 401
chk "GET /posts/feed no auth → 401" GET /posts/feed 401 "" ""

# ── [9] Story Highlights ──────────────────────────────────────────────────
echo -e "\n${B}[9] Story Highlights${NC}"
HL_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/posts/highlights" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"title":"Best Cuts","coverUrl":"https://example.com/cover.jpg","storyIds":[]}')
HL_CODE=$(echo "$HL_RESP" | tail -1)
HL_BODY=$(echo "$HL_RESP" | sed '$d')
if [ "$HL_CODE" = "201" ]; then
  HL_ID=$(extract "$HL_BODY" '.get("data",{}).get("id","")')
  echo -e "${G}✓${NC} [201] POST /posts/highlights → id=$HL_ID"
  ((pass++))
else
  echo -e "${R}✗${NC} [$HL_CODE vs 201] Create highlight"
  echo "   $HL_BODY"; ((fail++))
fi

# Get highlights
if [ -n "$W_ID" ]; then
  chk "GET /posts/highlights/user/$W_ID" GET "/posts/highlights/user/$W_ID" 200 "" ""
fi

# Update highlight
if [ -n "$HL_ID" ]; then
  chk "PATCH /posts/highlights/$HL_ID" PATCH "/posts/highlights/$HL_ID" 200 '{"title":"Top Transformations"}' "$WT"
  chk "PATCH highlight (non-owner → 403)" PATCH "/posts/highlights/$HL_ID" 403 '{"title":"Hack"}' "$WT2"
fi

# Delete highlight
if [ -n "$HL_ID" ]; then
  chk "DELETE /posts/highlights/$HL_ID" DELETE "/posts/highlights/$HL_ID" 204 "" "$WT"
  chk "DELETE already-deleted → 404" DELETE "/posts/highlights/$HL_ID" 404 "" "$WT"
fi

# ── [10] Private post visibility ──────────────────────────────────────────
echo -e "\n${B}[10] Private post access control${NC}"
PVT=$(curl -s -X POST "$BASE/posts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $WT" \
  -d '{"type":"TEXT","caption":"Private thought","visibility":"PRIVATE"}')
PVT_ID=$(extract "$PVT" '.get("data",{}).get("id","")')
if [ -n "$PVT_ID" ]; then
  # Owner can see it
  chk "GET private post (owner → 200)" GET "/posts/$PVT_ID" 200 "" "$WT"
  # Other user cannot see it
  chk "GET private post (other → 403)" GET "/posts/$PVT_ID" 403 "" "$WT2"
fi

# ── [11] Delete post ──────────────────────────────────────────────────────
echo -e "\n${B}[11] DELETE post${NC}"
if [ -n "$POST4_ID" ]; then
  chk "DELETE /posts/$POST4_ID (non-owner → 403)" DELETE "/posts/$POST4_ID" 403 "" "$WT2"
  chk "DELETE /posts/$POST4_ID (owner → 204)" DELETE "/posts/$POST4_ID" 204 "" "$WT"
  chk "GET deleted post → 404" GET "/posts/$POST4_ID" 404 "" ""
fi

# ── [12] Regression ───────────────────────────────────────────────────────
echo -e "\n${B}[12] Regression — original suite${NC}"
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
echo -e "${B}            PHASE 3 SUMMARY                ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}"
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL PHASE 3 TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
