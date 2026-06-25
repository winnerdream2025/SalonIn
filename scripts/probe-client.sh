#!/bin/bash
BASE="https://backendllc-production.up.railway.app"

/usr/bin/curl -s --max-time 8 -o /dev/null -w "GET /api/public/bookings/client: %{http_code}\n" \
  "$BASE/api/public/bookings/client?clientEmail=testclient@salonin.com" -H "x-tenant-slug: test-salon"

/usr/bin/curl -s --max-time 8 -o /dev/null -w "GET /api/public/bookings?email: %{http_code}\n" \
  "$BASE/api/public/bookings?clientEmail=testclient@salonin.com" -H "x-tenant-slug: test-salon"

/usr/bin/curl -s --max-time 8 -o /dev/null -w "GET /api/public/client-bookings: %{http_code}\n" \
  "$BASE/api/public/client-bookings?email=testclient@salonin.com" -H "x-tenant-slug: test-salon"

/usr/bin/curl -s --max-time 8 -o /dev/null -w "GET /api/mobile/bookings?email: %{http_code}\n" \
  "$BASE/api/mobile/bookings?clientEmail=testclient@salonin.com" -H "x-tenant-slug: test-salon"

/usr/bin/curl -s --max-time 8 \
  "$BASE/api/public/bookings/3c099704-d8dd-466c-9111-dca8b5c5774f" \
  -H "x-tenant-slug: test-salon" | /usr/bin/python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null || \
  /usr/bin/curl -s --max-time 8 -o /dev/null -w "GET /api/public/bookings/:id: %{http_code}\n" \
  "$BASE/api/public/bookings/3c099704-d8dd-466c-9111-dca8b5c5774f" -H "x-tenant-slug: test-salon"
