#!/bin/bash
# Production Header Validation Script
# Tests security headers on staging/production (HTTPS only)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-}"
HEALTH_PATH="${HEALTH_PATH:-/health}"

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}❌ Error: DOMAIN environment variable is required${NC}"
  echo "Usage: DOMAIN=https://your-domain.com bash test-production-headers.sh"
  exit 1
fi

# Ensure HTTPS
if [[ ! "$DOMAIN" =~ ^https:// ]]; then
  echo -e "${YELLOW}⚠️  Warning: Domain should use HTTPS for production testing${NC}"
  echo "Proceeding anyway..."
fi

URL="${DOMAIN}${HEALTH_PATH}"

echo "🔒 Production Header Validation"
echo "================================"
echo "Testing: $URL"
echo ""

# Fetch headers
echo "Fetching headers..."
HEADERS=$(curl -s -I "$URL" 2>/dev/null || echo "")

if [ -z "$HEADERS" ]; then
  echo -e "${RED}❌ Failed to fetch headers from $URL${NC}"
  exit 1
fi

# Check each header
echo ""
echo "Header Analysis:"
echo "---------------"

# Content-Security-Policy
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | head -1)
  echo -e "${GREEN}✅ Content-Security-Policy: Present${NC}"
  echo "   $CSP"
  
  # Check if CSP is too permissive
  if echo "$CSP" | grep -qi "'unsafe-inline'.*'unsafe-eval'"; then
    echo -e "${YELLOW}⚠️  Warning: CSP allows 'unsafe-inline' and 'unsafe-eval' (may be needed for React/Next.js)${NC}"
  fi
  
  if echo "$CSP" | grep -qi "default-src.*\*"; then
    echo -e "${RED}❌ CRITICAL: CSP default-src is too permissive (*)${NC}"
  fi
else
  echo -e "${RED}❌ Content-Security-Policy: MISSING${NC}"
  echo -e "${YELLOW}   Recommendation: Add CSP-Report-Only first, then enforce${NC}"
fi

# Strict-Transport-Security
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  HSTS=$(echo "$HEADERS" | grep -i "strict-transport-security" | head -1)
  echo -e "${GREEN}✅ Strict-Transport-Security: Present${NC}"
  echo "   $HSTS"
  
  # Verify HTTPS
  if [[ "$DOMAIN" =~ ^https:// ]]; then
    echo -e "${GREEN}   ✓ Domain uses HTTPS (HSTS should be present)${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Domain does not use HTTPS (HSTS should not be present)${NC}"
  fi
else
  if [[ "$DOMAIN" =~ ^https:// ]]; then
    echo -e "${RED}❌ Strict-Transport-Security: MISSING (should be present for HTTPS)${NC}"
  else
    echo -e "${GREEN}✅ Strict-Transport-Security: Not present (correct for HTTP)${NC}"
  fi
fi

# X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  XFRAME=$(echo "$HEADERS" | grep -i "x-frame-options" | head -1)
  echo -e "${GREEN}✅ X-Frame-Options: Present${NC}"
  echo "   $XFRAME"
  
  if echo "$XFRAME" | grep -qi "DENY"; then
    echo -e "${GREEN}   ✓ Set to DENY (prevents clickjacking)${NC}"
  elif echo "$XFRAME" | grep -qi "SAMEORIGIN"; then
    echo -e "${YELLOW}   ⚠️  Set to SAMEORIGIN (less secure than DENY)${NC}"
  fi
else
  echo -e "${RED}❌ X-Frame-Options: MISSING${NC}"
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  XCTYPE=$(echo "$HEADERS" | grep -i "x-content-type-options" | head -1)
  echo -e "${GREEN}✅ X-Content-Type-Options: Present${NC}"
  echo "   $XCTYPE"
  
  if echo "$XCTYPE" | grep -qi "nosniff"; then
    echo -e "${GREEN}   ✓ Set to nosniff (prevents MIME sniffing)${NC}"
  fi
else
  echo -e "${RED}❌ X-Content-Type-Options: MISSING${NC}"
fi

# Referrer-Policy
if echo "$HEADERS" | grep -qi "referrer-policy"; then
  REFERRER=$(echo "$HEADERS" | grep -i "referrer-policy" | head -1)
  echo -e "${GREEN}✅ Referrer-Policy: Present${NC}"
  echo "   $REFERRER"
else
  echo -e "${RED}❌ Referrer-Policy: MISSING${NC}"
fi

# X-Powered-By (should be removed)
if echo "$HEADERS" | grep -qi "x-powered-by"; then
  XPOWERED=$(echo "$HEADERS" | grep -i "x-powered-by" | head -1)
  echo -e "${RED}❌ X-Powered-By: Present (should be removed)${NC}"
  echo "   $XPOWERED"
else
  echo -e "${GREEN}✅ X-Powered-By: Removed (good)${NC}"
fi

echo ""
echo "================================"
echo "Summary:"
echo ""

# Count issues
ISSUES=0

if ! echo "$HEADERS" | grep -qi "content-security-policy"; then
  ISSUES=$((ISSUES + 1))
fi

if [[ "$DOMAIN" =~ ^https:// ]] && ! echo "$HEADERS" | grep -qi "strict-transport-security"; then
  ISSUES=$((ISSUES + 1))
fi

if ! echo "$HEADERS" | grep -qi "x-frame-options"; then
  ISSUES=$((ISSUES + 1))
fi

if ! echo "$HEADERS" | grep -qi "x-content-type-options"; then
  ISSUES=$((ISSUES + 1))
fi

if ! echo "$HEADERS" | grep -qi "referrer-policy"; then
  ISSUES=$((ISSUES + 1))
fi

if echo "$HEADERS" | grep -qi "x-powered-by"; then
  ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ All security headers are properly configured!${NC}"
  exit 0
else
  echo -e "${RED}❌ Found $ISSUES issue(s) with security headers${NC}"
  echo ""
  echo "Recommendations:"
  echo "1. Review CSP policy - consider CSP-Report-Only first"
  echo "2. Ensure HSTS is only enabled for HTTPS"
  echo "3. Verify headers don't break assets/functionality"
  exit 1
fi





