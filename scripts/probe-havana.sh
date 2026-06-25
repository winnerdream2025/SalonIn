#!/bin/bash
BASE="https://backendllc-production.up.railway.app"
SLUG="test-salon"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5M2E0OGFkNy03YmFkLTRlNmUtODZmOS01ZTJlMThmMGJiOGEiLCJlbWFpbCI6InRlc3RAc2Fsb25pbi5jb20iLCJuYW1lIjoiVGVzdCBTYWxvbiIsInJvbGUiOiJhZG1pbiIsInRlbmFudElkIjoiOTVkMzJkNjAtZTYwZC00M2VkLWI2ZjAtNjRjMDEzMmI5ZmU2IiwidGVuYW50U2x1ZyI6InRlc3Qtc2Fsb24iLCJ0ZW5hbnROYW1lIjoiVGVzdCBTYWxvbiIsImlhdCI6MTc4MjM1ODQ4MywiZXhwIjoxNzg0OTUwNDgzfQ.zwbvxAbFOA0kFLoTI4EkSeGJBG0ejKGCYsiw63RREf0"

probe() {
  METHOD=$1; PATH=$2
  CODE=$(/usr/bin/curl -s --max-time 6 -o /dev/null -w "%{http_code}" \
    -X "$METHOD" "$BASE$PATH" \
    -H "x-tenant-slug: $SLUG" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-raw '{"name":"Test","duration":60,"price":50}')
  echo "$METHOD $PATH → $CODE"
}

probe GET  /api/mobile/services
probe POST /api/mobile/services
probe GET  /api/mobile/provider/services
probe POST /api/mobile/provider/services
probe GET  /api/mobile/provider/availability
probe POST /api/mobile/provider/availability
probe PATCH /api/mobile/provider/availability
probe GET  /api/mobile/provider/settings
probe PATCH /api/mobile/provider/settings
probe GET  /api/mobile/provider/stripe-connect
probe GET  /api/mobile/stripe/connect
probe GET  /api/mobile/provider/stripe/connect
probe POST /api/public/bookings/test-id/cancel
