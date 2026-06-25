#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5M2E0OGFkNy03YmFkLTRlNmUtODZmOS01ZTJlMThmMGJiOGEiLCJlbWFpbCI6InRlc3RAc2Fsb25pbi5jb20iLCJuYW1lIjoiVGVzdCBTYWxvbiIsInJvbGUiOiJhZG1pbiIsInRlbmFudElkIjoiOTVkMzJkNjAtZTYwZC00M2VkLWI2ZjAtNjRjMDEzMmI5ZmU2IiwidGVuYW50U2x1ZyI6InRlc3Qtc2Fsb24iLCJ0ZW5hbnROYW1lIjoiVGVzdCBTYWxvbiIsImlhdCI6MTc4MjM1ODQ4MywiZXhwIjoxNzg0OTUwNDgzfQ.zwbvxAbFOA0kFLoTI4EkSeGJBG0ejKGCYsiw63RREf0"
BASE="https://backendllc-production.up.railway.app"

echo "=== GET /api/mobile/services (after create) ==="
/usr/bin/curl -s --max-time 8 "$BASE/api/mobile/services" \
  -H "x-tenant-slug: test-salon" -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== GET /api/public/services (client view) ==="
/usr/bin/curl -s --max-time 8 "$BASE/api/public/services" -H "x-tenant-slug: test-salon"

echo ""
echo "=== PATCH /api/mobile/services/93 ==="
/usr/bin/curl -s --max-time 8 -X PATCH "$BASE/api/mobile/services/93" \
  -H "Content-Type: application/json" -H "x-tenant-slug: test-salon" -H "Authorization: Bearer $TOKEN" \
  -d '{"flatPrice":150,"description":"Updated description"}'

echo ""
echo "=== DELETE /api/mobile/services/93 status ==="
/usr/bin/curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE/api/mobile/services/93" \
  -H "x-tenant-slug: test-salon" -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== Client cancel: POST /api/public/bookings/cancel ==="
/usr/bin/curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/public/bookings/cancel" \
  -H "Content-Type: application/json" -H "x-tenant-slug: test-salon" \
  -d '{"cancelToken":"3134c219ec27061d64d7543cc5fe9723b6d7d28d1cf5e590"}'

echo ""
echo "=== Client reschedule: POST /api/public/bookings/reschedule ==="
/usr/bin/curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/public/bookings/reschedule" \
  -H "Content-Type: application/json" -H "x-tenant-slug: test-salon" \
  -d '{"cancelToken":"test","newDate":"2026-07-02","newStartTime":"11:00 AM"}'
