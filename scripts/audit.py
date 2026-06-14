#!/usr/bin/env python3
"""SalonIn API Audit Script"""
import json, requests, sys
from datetime import datetime, timedelta

BASE = "http://localhost:4000"
issues = []
ok = []

def check(label, resp, expect_status=200, no_fields=None, require_fields=None):
    status = resp.status_code
    try:
        data = resp.json()
    except:
        data = {}
    passed = status == expect_status
    if no_fields:
        for f in no_fields:
            if f in str(data):
                issues.append(f"[SECURITY] {label}: '{f}' exposed in response")
    if require_fields:
        for f in require_fields:
            if f not in data and f not in str(data):
                issues.append(f"[MISSING] {label}: '{f}' not in response")
    if passed:
        ok.append(f"✅ {label} → {status}")
    else:
        issues.append(f"❌ {label} → {status} | {str(data)[:120]}")
    return data

print("=" * 60)
print("SALONIN API AUDIT")
print("=" * 60)

# 1. Health
r = requests.get(f"{BASE}/health")
check("GET /health", r, 200, require_fields=["status"])

# 2. Specialties
r = requests.get(f"{BASE}/specialties")
data = check("GET /specialties", r, 200)
ok.append(f"   Categories: {list(data.keys())}")

# 3. Auth - login worker
r = requests.post(f"{BASE}/auth/login", json={"email":"auditworker@salonin.test","password":"Test1234!"})
data = check("POST /auth/login (WORKER)", r, 200, no_fields=["passwordHash"], require_fields=["accessToken","refreshToken"])
WT = data.get("accessToken","")
WID = data.get("user",{}).get("id","")
W_HEADERS = {"Authorization": f"Bearer {WT}"}

# 4. Auth - login salon
r = requests.post(f"{BASE}/auth/login", json={"email":"auditsalon@salonin.test","password":"Test1234!"})
data = check("POST /auth/login (SALON)", r, 200, no_fields=["passwordHash"], require_fields=["accessToken","refreshToken"])
ST = data.get("accessToken","")
SID = data.get("user",{}).get("id","")
S_HEADERS = {"Authorization": f"Bearer {ST}"}

# 5. Wrong password
r = requests.post(f"{BASE}/auth/login", json={"email":"auditworker@salonin.test","password":"WrongPass!"})
check("POST /auth/login (wrong password → 401)", r, 401)

# 6. Forgot password — returns 200 OK (void body)
r = requests.post(f"{BASE}/auth/forgot-password", json={"email":"auditworker@salonin.test"})
check("POST /auth/forgot-password", r, 200)

# 7. Worker profile GET
r = requests.get(f"{BASE}/workers/me", headers=W_HEADERS)
data = check("GET /workers/me", r, 200, require_fields=["id","specialties","availability","rateRange"])
ok.append(f"   availability={data.get('availability')} | rateRange={data.get('rateRange')}")

# 8. Worker profile without auth
r = requests.get(f"{BASE}/workers/me")
check("GET /workers/me (no auth → 401)", r, 401)

# 9. Update worker profile
r = requests.patch(f"{BASE}/workers/me", headers=W_HEADERS, json={
    "bio": "Specialized in natural hair care",
    "specialties": ["Knotless braids","Locs","Natural hair"],
    "availability": "NOW",
    "rateRange": "$80-$150",
    "rateNote": "Prices vary by length"
})
data = check("PATCH /workers/me", r, 200)
ok.append(f"   updated bio: {data.get('bio','?')[:30]}")

# 10. Salon profile GET
r = requests.get(f"{BASE}/salons/me", headers=S_HEADERS)
data = check("GET /salons/me", r, 200, require_fields=["id","specialties","isHiring"])
ok.append(f"   isHiring={data.get('isHiring')} | description={str(data.get('description',''))[:30]}")

# 11. Update salon profile
r = requests.patch(f"{BASE}/salons/me", headers=S_HEADERS, json={
    "description": "Premium natural hair salon in DMV",
    "specialties": ["Knotless braids","Locs","Natural hair"],
    "isHiring": True
})
check("PATCH /salons/me", r, 200)

# 12. Get salon by ID
SALON_PROFILE_ID = requests.get(f"{BASE}/salons/me", headers=S_HEADERS).json().get("id","")
r = requests.get(f"{BASE}/salons/{SALON_PROFILE_ID}")
check(f"GET /salons/:id (public)", r, 200)

# 13. Create job post
EXPIRES = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
r = requests.post(f"{BASE}/jobs", headers=S_HEADERS, json={
    "title": "Hair Braider Needed",
    "description": "Looking for an experienced hair braider for our growing salon. Minimum 2 years.",
    "specialty": "Knotless braids",
    "payStructure": "60/40 commission split",
    "type": "FREELANCE",
    "cityId": "dmv",
    "expiresAt": EXPIRES
})
job = check("POST /jobs (create)", r, 201, require_fields=["id","title"])
JOB_ID = job.get("id","")
ok.append(f"   Job ID: {JOB_ID[:8]}...")

# 14. List jobs public
r = requests.get(f"{BASE}/jobs", params={"cityId":"dmv","limit":10})
data = check("GET /jobs?cityId=dmv (public list)", r, 200)
ok.append(f"   total={data.get('total','?')} | items={len(data.get('data',[]))}")

# 15. Get job by ID
r = requests.get(f"{BASE}/jobs/{JOB_ID}")
check("GET /jobs/:id", r, 200, require_fields=["id","title","specialty"])

# 16. Worker applies to job
r = requests.post(f"{BASE}/jobs/{JOB_ID}/apply", headers=W_HEADERS)
check("POST /jobs/:id/apply (worker)", r, 201)

# 17. Worker applies again (duplicate)
r = requests.post(f"{BASE}/jobs/{JOB_ID}/apply", headers=W_HEADERS)
check("POST /jobs/:id/apply (duplicate → 409/400)", r, 409)

# 18. Salon sees applicants
r = requests.get(f"{BASE}/jobs/{JOB_ID}/applicants", headers=S_HEADERS)
data = check("GET /jobs/:id/applicants (salon)", r, 200)
ok.append(f"   applicants={len(data) if isinstance(data,list) else '?'}")
APP_ID = data[0].get("id","") if isinstance(data,list) and data else ""

# 19. Accept application
if APP_ID:
    r = requests.patch(f"{BASE}/jobs/{JOB_ID}/applicants/{APP_ID}", headers=S_HEADERS, json={"status":"ACCEPTED"})
    check("PATCH /jobs/:id/applicants/:appId (ACCEPTED)", r, 200)

# 20. Nearby workers — actual route is /workers/nearby with lat/lng/radiusMiles (DMV coords)
r = requests.get(f"{BASE}/workers/nearby", params={"lat":38.9072,"lng":-77.0369,"radiusMiles":50,"cityId":"dmv"})
data = check("GET /workers/nearby?lat&lng&radiusMiles&cityId (public)", r, 200)
ok.append(f"   nearby workers={len(data.get('data',[]))} | hasMore={data.get('hasMore')}")

# 21. Job feed for worker — public /jobs endpoint with cityId filter
r = requests.get(f"{BASE}/jobs", params={"cityId":"dmv","limit":5})
data = check("GET /jobs?cityId=dmv (worker job feed)", r, 200)
ok.append(f"   jobs in feed={len(data.get('data',[]))}")

# 22. Reviews - can-review
r = requests.get(f"{BASE}/reviews/can-review/{SALON_PROFILE_ID}", headers=W_HEADERS)
data = check("GET /reviews/can-review/:id", r, 200)
can_review = data.get("canReview", False)
ok.append(f"   canReview={can_review}")

# 23. Post review (if eligible)
REV_ID = ""
if can_review:
    r = requests.post(f"{BASE}/reviews", headers=W_HEADERS, json={
        "subjectId": SALON_PROFILE_ID,
        "rating": 5,
        "text": "Excellent salon, very professional environment!"
    })
    data = check("POST /reviews", r, 201)
    REV_ID = data.get("id","")

# 24. Get reviews for user
r = requests.get(f"{BASE}/reviews/user/{SALON_PROFILE_ID}", headers=W_HEADERS)
data = check("GET /reviews/user/:id", r, 200)
ok.append(f"   reviews count={len(data) if isinstance(data,list) else '?'}")

# 25. Media upload — expects multipart; test that endpoint exists and rejects non-multipart with 400
r = requests.post(f"{BASE}/media/upload", headers=W_HEADERS)
if r.status_code in (400, 422):
    ok.append(f"✅ POST /media/upload exists (rejects empty request → {r.status_code})")
else:
    issues.append(f"❌ POST /media/upload unexpected status → {r.status_code}")

# 26. Chat request — field is receiverId (user ID); 409 = already exists, both are valid
r = requests.post(f"{BASE}/chat-requests", headers=W_HEADERS, json={"receiverId": SID})
if r.status_code in (201, 409):
    ok.append(f"✅ POST /chat-requests → {r.status_code} ({'created' if r.status_code==201 else 'already exists — correct'})")
    cr = r.json() if r.status_code == 201 else {}
else:
    cr = check("POST /chat-requests", r, 201)
CR_ID = cr.get("id","")

# 27. Get received chat requests (salon)
r = requests.get(f"{BASE}/chat-requests/received", headers=S_HEADERS)
data = check("GET /chat-requests/received", r, 200)
ok.append(f"   received requests={len(data) if isinstance(data,list) else '?'}")

# 28. Accept chat request
if CR_ID:
    r = requests.patch(f"{BASE}/chat-requests/{CR_ID}", headers=S_HEADERS, json={"action":"ACCEPT"})
    cr_data = check("PATCH /chat-requests/:id (ACCEPT)", r, 200)
    CONV_ID = cr_data.get("conversationId","")

# 29. Token refresh — returns 200
r = requests.post(f"{BASE}/auth/refresh", json={"refreshToken": requests.post(f"{BASE}/auth/login", json={"email":"auditworker@salonin.test","password":"Test1234!"}).json().get("refreshToken","")})
check("POST /auth/refresh", r, 200)

# 30. Logout — requires auth (JwtAuthGuard)
logout_login = requests.post(f"{BASE}/auth/login", json={"email":"auditworker@salonin.test","password":"Test1234!"})
logout_rt = logout_login.json().get("refreshToken","")
logout_at = logout_login.json().get("accessToken","")
r = requests.post(f"{BASE}/auth/logout", headers={"Authorization": f"Bearer {logout_at}"}, json={"refreshToken": logout_rt})
if r.status_code == 204:
    ok.append(f"✅ POST /auth/logout (authenticated) → 204")
else:
    issues.append(f"❌ POST /auth/logout → {r.status_code} | {r.text[:80]}")

# 31. Verify login response has NO passwordHash
r2 = requests.post(f"{BASE}/auth/login", json={"email":"auditsalon@salonin.test","password":"Test1234!"})
if 'passwordHash' not in r2.text:
    ok.append("✅ passwordHash NOT in login response (SECURITY OK)")
else:
    issues.append("❌ [SECURITY] passwordHash still exposed in login response")

# Summary
print("\n" + "=" * 60)
print(f"RESULTS: {len(ok)} OK | {len(issues)} ISSUES")
print("=" * 60)
print("\n✅ PASSING:")
for o in ok:
    print(f"  {o}")
if issues:
    print("\n⚠️  ISSUES FOUND:")
    for i in issues:
        print(f"  {i}")
else:
    print("\n🎉 No issues found!")
