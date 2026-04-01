#!/bin/bash
# Security Smoke Tests
# Run these tests against your backend to verify security controls

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
API_URL="${BACKEND_URL}/api"

echo "🔒 Security Smoke Tests"
echo "======================"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Rate Limiting (429)
echo "Test 1: Rate Limiting (Login endpoint)"
echo "--------------------------------------"
echo "Sending 20 login requests (should get 429 after ~5 requests)..."
echo ""

success_count=0
rate_limited=0

for i in {1..20}; do
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null || echo "000")
  
  if [ "$status_code" = "429" ]; then
    rate_limited=$((rate_limited + 1))
    echo -e "${YELLOW}Request $i: $status_code (Rate Limited)${NC}"
  elif [ "$status_code" = "401" ] || [ "$status_code" = "400" ]; then
    success_count=$((success_count + 1))
    echo "Request $i: $status_code"
  else
    echo -e "${RED}Request $i: $status_code (Unexpected)${NC}"
  fi
  
  # Small delay to avoid overwhelming
  sleep 0.1
done

echo ""
if [ $rate_limited -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting working: Got $rate_limited rate limit responses${NC}"
else
  echo -e "${RED}❌ Rate limiting NOT working: No 429 responses${NC}"
fi
echo ""

# Test 2: Security Headers
echo "Test 2: Security Headers"
echo "-----------------------"
headers=$(curl -s -I "${BACKEND_URL}/health" 2>/dev/null || echo "")

if echo "$headers" | grep -qi "content-security-policy"; then
  echo -e "${GREEN}✅ Content-Security-Policy header present${NC}"
else
  echo -e "${RED}❌ Content-Security-Policy header missing${NC}"
fi

if echo "$headers" | grep -qi "strict-transport-security"; then
  echo -e "${GREEN}✅ Strict-Transport-Security header present${NC}"
else
  echo -e "${YELLOW}⚠️  Strict-Transport-Security header missing (may be dev environment)${NC}"
fi

if echo "$headers" | grep -qi "x-frame-options"; then
  echo -e "${GREEN}✅ X-Frame-Options header present${NC}"
else
  echo -e "${RED}❌ X-Frame-Options header missing${NC}"
fi

if echo "$headers" | grep -qi "x-content-type-options"; then
  echo -e "${GREEN}✅ X-Content-Type-Options header present${NC}"
else
  echo -e "${RED}❌ X-Content-Type-Options header missing${NC}"
fi

if echo "$headers" | grep -qi "referrer-policy"; then
  echo -e "${GREEN}✅ Referrer-Policy header present${NC}"
else
  echo -e "${RED}❌ Referrer-Policy header missing${NC}"
fi

echo ""

# Test 3: Webhook Signature Verification
echo "Test 3: Webhook Signature Verification"
echo "---------------------------------------"
webhook_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: fake_signature" \
  -d '{"id":"evt_fake","type":"payment_intent.succeeded"}' 2>/dev/null || echo "000")

if [ "$webhook_status" = "400" ] || [ "$webhook_status" = "401" ] || [ "$webhook_status" = "403" ]; then
  echo -e "${GREEN}✅ Webhook signature verification working: Got $webhook_status (rejected fake signature)${NC}"
else
  echo -e "${RED}❌ Webhook signature verification NOT working: Got $webhook_status (should be 400/401/403)${NC}"
fi
echo ""

# Test 4: File Upload Security (forbidden extension)
echo "Test 4: File Upload Security"
echo "----------------------------"
echo "Note: This test requires authentication token. Skipping for now."
echo "Manual test: Try uploading .html, .php, .exe files - should get 400"
echo ""

# Test 5: CORS Configuration
echo "Test 5: CORS Configuration"
echo "-------------------------"
cors_headers=$(curl -s -I -X OPTIONS "${API_URL}/health" \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")

if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
  allowed_origin=$(echo "$cors_headers" | grep -i "access-control-allow-origin" | head -1)
  if echo "$allowed_origin" | grep -qi "evil.com"; then
    echo -e "${RED}❌ CORS misconfigured: Allows evil.com${NC}"
  else
    echo -e "${GREEN}✅ CORS configured: $allowed_origin${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  CORS headers not visible in OPTIONS response${NC}"
fi
echo ""

echo "======================"
echo "Smoke tests completed!"
echo ""
echo "Note: For BOLA/IDOR tests, you need:"
echo "  1. Two user tokens (User A and User B)"
echo "  2. A resource owned by User A"
echo "  3. Try accessing it with User B token - should get 403/404"
echo ""
echo "For file upload tests, try uploading forbidden files (.html, .php, .exe)"
echo "and verify you get 400 responses."





