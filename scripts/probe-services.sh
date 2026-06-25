#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5M2E0OGFkNy03YmFkLTRlNmUtODZmOS01ZTJlMThmMGJiOGEiLCJlbWFpbCI6InRlc3RAc2Fsb25pbi5jb20iLCJuYW1lIjoiVGVzdCBTYWxvbiIsInJvbGUiOiJhZG1pbiIsInRlbmFudElkIjoiOTVkMzJkNjAtZTYwZC00M2VkLWI2ZjAtNjRjMDEzMmI5ZmU2IiwidGVuYW50U2x1ZyI6InRlc3Qtc2Fsb24iLCJ0ZW5hbnROYW1lIjoiVGVzdCBTYWxvbiIsImlhdCI6MTc4MjM1ODQ4MywiZXhwIjoxNzg0OTUwNDgzfQ.zwbvxAbFOA0kFLoTI4EkSeGJBG0ejKGCYsiw63RREf0"
BASE="https://backendllc-production.up.railway.app"

echo "=== GET services ==="
/usr/bin/curl -s --max-time 8 "$BASE/api/mobile/services" \
  -H "x-tenant-slug: test-salon" -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== POST create service ==="
/usr/bin/curl -s --max-time 8 -X POST "$BASE/api/mobile/services" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: test-salon" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Box Braids","description":"Full box braids","duration":180,"price":150,"currency":"USD","category":"Braids"}'
