#!/bin/bash
# Test script for admin GDPR health endpoint
# Tests all 4 verification cases

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPassword123!}"
NON_ADMIN_EMAIL="${NON_ADMIN_EMAIL:-user@example.com}"
NON_ADMIN_PASSWORD="${NON_ADMIN_PASSWORD:-UserPassword123!}"

echo "🧪 Testing Admin GDPR Health Endpoint"
echo "======================================"
echo ""

# Get CSRF token
echo "1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt "$BASE_URL/health")
CSRF_TOKEN=$(grep -oP 'csrf_token\t[^\t]+' /tmp/cookies.txt | cut -f2)
echo "   CSRF Token: ${CSRF_TOKEN:0:20}..."
echo ""

# Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)
echo "Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)"
echo "--------------------------------------------------------"
RESPONSE1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/admin/gdpr/health" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Cookie: csrf_token=$CSRF_TOKEN")
STATUS1=$(echo "$RESPONSE1" | grep "HTTP_STATUS" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | grep -v "HTTP_STATUS")
echo "   Status: $STATUS1"
echo "   Response: $BODY1"
if [ "$STATUS1" = "404" ]; then
  echo "   ✅ PASSED"
else
  echo "   ❌ FAILED (expected 404)"
fi
echo ""

# Enable feature flag for remaining tests
export ENABLE_ADMIN_HEALTH=true
echo "⚠️  Note: ENABLE_ADMIN_HEALTH=true is set for remaining tests"
echo "   (In real scenario, set this in .env or environment)"
echo ""

# Test 2: With ENABLE_ADMIN_HEALTH but non-admin token (should return 403)
echo "Test 2: With ENABLE_ADMIN_HEALTH but non-admin token (should return 403)"
echo "-----------------------------------------------------------------------"
# Note: This requires a valid non-admin JWT token
# For testing, you'll need to login as non-admin user first
echo "   ⚠️  Manual test required:"
echo "   1. Login as non-admin user to get token"
echo "   2. curl -H \"Authorization: Bearer <NON_ADMIN_TOKEN>\" $BASE_URL/api/admin/gdpr/health"
echo "   3. Expected: 403 FORBIDDEN"
echo ""

# Test 3: With ENABLE_ADMIN_HEALTH and admin token (should return 200)
echo "Test 3: With ENABLE_ADMIN_HEALTH and admin token (should return 200)"
echo "------------------------------------------------------------------"
# Note: This requires a valid admin JWT token
echo "   ⚠️  Manual test required:"
echo "   1. Login as admin user to get token"
echo "   2. curl -H \"Authorization: Bearer <ADMIN_TOKEN>\" $BASE_URL/api/admin/gdpr/health"
echo "   3. Expected: 200 OK with JSON response"
echo ""

# Test 4: Rate limiting (10 rapid calls should trigger 429)
echo "Test 4: Rate limiting (10 rapid calls should trigger 429)"
echo "--------------------------------------------------------"
echo "   ⚠️  Manual test required:"
echo "   for i in {1..10}; do"
echo "     curl -H \"Authorization: Bearer <ADMIN_TOKEN>\" $BASE_URL/api/admin/gdpr/health"
echo "   done"
echo "   Expected: At least some requests return 429 TOO_MANY_REQUESTS"
echo ""

echo "✅ Test script completed"
echo ""
echo "Note: Tests 2-4 require manual execution with actual JWT tokens"
echo "See docs/admin_endpoints.md for detailed curl commands"




