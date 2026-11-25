#!/bin/bash
# Gate test scenario for RED Trip Splitter API

set -e

BASE="http://localhost:3001"

echo "=== 1. Demo login → get token + cookie ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE/api/auth/demo-login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"name": "Test User"}')
echo "$LOGIN_RESPONSE"
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Access token: $ACCESS_TOKEN"
echo "User ID: $USER_ID"
echo ""

echo "=== 2. Create trip ==="
TRIP_RESPONSE=$(curl -s -X POST "$BASE/api/trips" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Gate Test Trip"}')
echo "$TRIP_RESPONSE"
TRIP_ID=$(echo "$TRIP_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Trip ID: $TRIP_ID"
echo ""

echo "=== 3. Add 4 members ==="
AMAN_RESPONSE=$(curl -s -X POST "$BASE/api/trips/$TRIP_ID/members" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Aman"}')
echo "Aman: $AMAN_RESPONSE"
AMAN_ID=$(echo "$AMAN_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

BHAVNA_RESPONSE=$(curl -s -X POST "$BASE/api/trips/$TRIP_ID/members" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Bhavna"}')
echo "Bhavna: $BHAVNA_RESPONSE"
BHAVNA_ID=$(echo "$BHAVNA_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

CHIRAG_RESPONSE=$(curl -s -X POST "$BASE/api/trips/$TRIP_ID/members" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Chirag"}')
echo "Chirag: $CHIRAG_RESPONSE"
CHIRAG_ID=$(echo "$CHIRAG_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

DIVYA_RESPONSE=$(curl -s -X POST "$BASE/api/trips/$TRIP_ID/members" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Divya"}')
echo "Divya: $DIVYA_RESPONSE"
DIVYA_ID=$(echo "$DIVYA_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo ""

echo "=== 4. Add 3 expenses ==="
echo "Hotel 600000 paid by Aman, split among all 4"
curl -s -X POST "$BASE/api/trips/$TRIP_ID/expenses" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d "{\"paidBy\":\"$AMAN_ID\",\"amountPaise\":600000,\"category\":\"stay\",\"splitType\":\"equal\",\"splitAmong\":[\"$AMAN_ID\",\"$BHAVNA_ID\",\"$CHIRAG_ID\",\"$DIVYA_ID\"]}"
echo ""

echo "Fuel 180000 paid by Bhavna, split among Aman, Bhavna, Chirag"
curl -s -X POST "$BASE/api/trips/$TRIP_ID/expenses" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d "{\"paidBy\":\"$BHAVNA_ID\",\"amountPaise\":180000,\"category\":\"fuel\",\"splitType\":\"equal\",\"splitAmong\":[\"$AMAN_ID\",\"$BHAVNA_ID\",\"$CHIRAG_ID\"]}"
echo ""

echo "Dinner 120000 paid by Chirag, split among all 4"
curl -s -X POST "$BASE/api/trips/$TRIP_ID/expenses" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d "{\"paidBy\":\"$CHIRAG_ID\",\"amountPaise\":120000,\"category\":\"food\",\"splitType\":\"equal\",\"splitAmong\":[\"$AMAN_ID\",\"$BHAVNA_ID\",\"$CHIRAG_ID\",\"$DIVYA_ID\"]}"
echo ""

echo "=== 5. Check balances ==="
curl -s -b cookies.txt "$BASE/api/trips/$TRIP_ID/balances"
echo ""
echo ""

echo "=== 6. Get optimal settlements ==="
curl -s -b cookies.txt "$BASE/api/trips/$TRIP_ID/settlements?mode=optimal"
echo ""
echo ""

echo "=== 7. Get nudges with UPI links ==="
curl -s -b cookies.txt "$BASE/api/trips/$TRIP_ID/nudges"
echo ""
echo ""

echo "=== 8. Test 401 without token ==="
curl -s "$BASE/api/trips/$TRIP_ID/balances"
echo ""
echo ""

echo "=== 9. Test 403 for non-member ==="
curl -s -X POST "$BASE/api/auth/demo-login" \
  -H "Content-Type: application/json" -c cookies2.txt \
  -d '{"name": "Outsider"}'
echo ""
curl -s -b cookies2.txt "$BASE/api/trips/$TRIP_ID/balances"
echo ""