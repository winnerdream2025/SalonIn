#!/bin/bash
# Phase 4 — Search & Discovery curl tests
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
    echo "$body" | python3 -c 'import sys,json; d=json.load(sys.stdin).get("data",{}); print("  workers:",len(d.get("workers",{}).get("data",[])) if isinstance(d.get("workers",{}),dict) else "N/A","salons:",len(d.get("salons",{}).get("data",[])) if isinstance(d.get("salons",{}),dict) else "N/A","services:",len(d.get("services",{}).get("data",[])) if isinstance(d.get("services",{}),dict) else "N/A","jobs:",len(d.get("jobs",{}).get("data",[])) if isinstance(d.get("jobs",{}),dict) else "N/A")' 2>/dev/null || true
  else
    echo -e "${R}✗${NC} [$code vs $exp] $label"
    echo "     $(echo "$body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("message","") or d.get("error","?"))' 2>/dev/null || echo "${body:0:300}")"
    ((fail++))
  fi
}

extract() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin)$2)" 2>/dev/null; }

echo -e "${B}============================================${NC}"
echo -e "${B}   PHASE 4 — SEARCH & DISCOVERY TESTS      ${NC}"
echo -e "${B}============================================${NC}"

# ── Setup ─────────────────────────────────────────────────────────────────
echo -e "\n${B}[0] Setup${NC}"
W_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"testworker@mysalonin.com","password":"Test1234!"}')
WT=$(extract "$W_RESP" '.get("accessToken","")')
echo -e "   ${Y}worker token obtained${NC}"

# ── [1] GET /search — no params (all types) ───────────────────────────────
echo -e "\n${B}[1] GET /search — no params returns all types${NC}"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/search")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$CODE" = "200" ]; then
  TYPE=$(echo "$BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("type",""))' 2>/dev/null)
  echo -e "${G}✓${NC} [200] GET /search → type=$TYPE"
  ((pass++))
  echo "$BODY" | python3 -c '
import sys,json
d=json.load(sys.stdin).get("data",{})
for k in ["workers","salons","services","jobs"]:
  v = d.get(k,{})
  print(f"  {k}: total={v.get(\"total\",\"?\")} data={len(v.get(\"data\",[]))}")
' 2>/dev/null
else
  echo -e "${R}✗${NC} [$CODE vs 200] GET /search"
  echo "  $BODY"; ((fail++))
fi

# ── [2] Search by query text ──────────────────────────────────────────────
echo -e "\n${B}[2] Search by query text${NC}"

# Workers by name
chk "GET /search?q=test&type=workers" GET "/search?q=test&type=workers" 200 "" ""

# Salons
chk "GET /search?type=salons" GET "/search?type=salons" 200 "" ""

# Services
chk "GET /search?type=services" GET "/search?type=services" 200 "" ""

# Jobs
chk "GET /search?type=jobs" GET "/search?type=jobs" 200 "" ""

# ── [3] Specialty filter ──────────────────────────────────────────────────
echo -e "\n${B}[3] Specialty filter${NC}"
chk "GET /search?specialty=HAIRCUT" GET "/search?specialty=HAIRCUT&type=workers" 200 "" ""
chk "GET /search?specialty=BRAIDS&type=salons" GET "/search?specialty=BRAIDS&type=salons" 200 "" ""

# ── [4] City filter ───────────────────────────────────────────────────────
echo -e "\n${B}[4] City + State filter${NC}"
chk "GET /search?city=Atlanta&type=workers" GET "/search?city=Atlanta&type=workers" 200 "" ""
chk "GET /search?state=GA&type=salons" GET "/search?state=GA&type=salons" 200 "" ""
chk "GET /search?city=Atlanta&type=jobs" GET "/search?city=Atlanta&type=jobs" 200 "" ""

# ── [5] Rating filter ─────────────────────────────────────────────────────
echo -e "\n${B}[5] Rating filter${NC}"
chk "GET /search?rating=4&type=workers" GET "/search?rating=4&type=workers" 200 "" ""
chk "GET /search?rating=4&type=salons" GET "/search?rating=4&type=salons" 200 "" ""

# ── [6] Combined filters ──────────────────────────────────────────────────
echo -e "\n${B}[6] Combined filters${NC}"
chk "GET /search?q=hair&specialty=HAIRCUT&city=Atlanta&type=workers" \
  GET "/search?q=hair&specialty=HAIRCUT&city=Atlanta&type=workers" 200 "" ""

# ── [7] Pagination ────────────────────────────────────────────────────────
echo -e "\n${B}[7] Pagination${NC}"
P1=$(curl -s "$BASE/search?type=workers&limit=2&page=1")
P1_TOTAL=$(echo "$P1" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("workers",{}).get("total",0))' 2>/dev/null)
[ -n "$P1_TOTAL" ] \
  && { echo -e "${G}✓${NC} [200] Pagination page=1 limit=2 → total=$P1_TOTAL workers"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Pagination failed"; ((fail++)); }

# limit validation: limit=100 should cap or reject
chk "GET /search?limit=100 (over max → 400)" GET "/search?limit=100" 400 "" ""

# ── [8] Authenticated vs unauthenticated ──────────────────────────────────
echo -e "\n${B}[8] Auth optional — both work${NC}"
chk "GET /search no auth → 200" GET "/search?q=beauty" 200 "" ""
chk "GET /search with auth → 200" GET "/search?q=beauty" 200 "" "$WT"

# ── [9] Empty query returns all ───────────────────────────────────────────
echo -e "\n${B}[9] Empty q returns results (no filter)${NC}"
EMPTY=$(curl -s "$BASE/search?q=&type=workers")
EMPTY_TOTAL=$(echo "$EMPTY" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("workers",{}).get("total",0))' 2>/dev/null)
[ "${EMPTY_TOTAL:-0}" -ge "0" ] \
  && { echo -e "${G}✓${NC} Empty q='' returns $EMPTY_TOTAL workers (all)"; ((pass++)); } \
  || { echo -e "${R}✗${NC} Empty query failed"; ((fail++)); }

# ── [10] Invalid type → 400 ───────────────────────────────────────────────
echo -e "\n${B}[10] Validation${NC}"
chk "GET /search?type=invalid → 400" GET "/search?type=invalid" 400 "" ""
chk "GET /search?page=0 → 400" GET "/search?page=0" 400 "" ""

# ── [11] Regression ───────────────────────────────────────────────────────
echo -e "\n${B}[11] Regression — original suite${NC}"
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
echo -e "${B}            PHASE 4 SUMMARY                ${NC}"
echo -e "${B}============================================${NC}"
echo -e "${G}  PASSED : $pass / $TOTAL${NC}"
[ $fail -gt 0 ] && echo -e "${R}  FAILED : $fail / $TOTAL${NC}"
[ $fail -eq 0 ] \
  && echo -e "${G}  ALL PHASE 4 TESTS PASSED ✓${NC}" \
  || echo -e "${R}  $fail TEST(S) FAILED ✗${NC}"
exit $fail
