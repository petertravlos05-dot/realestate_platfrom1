# Production Header Validation Script (PowerShell)
# Tests security headers on staging/production (HTTPS only)

$ErrorActionPreference = "Stop"

# Configuration
$Domain = if ($env:DOMAIN) { $env:DOMAIN } else { "" }
$HealthPath = if ($env:HEALTH_PATH) { $env:HEALTH_PATH } else { "/health" }

if ([string]::IsNullOrEmpty($Domain)) {
    Write-Host "❌ Error: DOMAIN environment variable is required" -ForegroundColor Red
    Write-Host "Usage: `$env:DOMAIN = 'https://your-domain.com'; .\test-production-headers.ps1"
    exit 1
}

# Ensure HTTPS
if (-not $Domain.StartsWith("https://")) {
    Write-Host "⚠️  Warning: Domain should use HTTPS for production testing" -ForegroundColor Yellow
    Write-Host "Proceeding anyway..."
}

$Url = "$Domain$HealthPath"

Write-Host "🔒 Production Header Validation" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing: $Url"
Write-Host ""

# Fetch headers
Write-Host "Fetching headers..."
try {
    $Response = Invoke-WebRequest -Uri $Url -Method HEAD -UseBasicParsing -ErrorAction Stop
    $Headers = $Response.Headers
} catch {
    Write-Host "❌ Failed to fetch headers from $Url" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Header Analysis:" -ForegroundColor Yellow
Write-Host "---------------"

$Issues = 0

# Content-Security-Policy
if ($Headers["Content-Security-Policy"]) {
    $CSP = $Headers["Content-Security-Policy"]
    Write-Host "✅ Content-Security-Policy: Present" -ForegroundColor Green
    Write-Host "   $CSP"
    
    if ($CSP -match "'unsafe-inline'.*'unsafe-eval'") {
        Write-Host "⚠️  Warning: CSP allows 'unsafe-inline' and 'unsafe-eval' (may be needed for React/Next.js)" -ForegroundColor Yellow
    }
    
    if ($CSP -match "default-src.*\*") {
        Write-Host "❌ CRITICAL: CSP default-src is too permissive (*)" -ForegroundColor Red
        $Issues++
    }
} else {
    Write-Host "❌ Content-Security-Policy: MISSING" -ForegroundColor Red
    Write-Host "   Recommendation: Add CSP-Report-Only first, then enforce" -ForegroundColor Yellow
    $Issues++
}

# Strict-Transport-Security
if ($Headers["Strict-Transport-Security"]) {
    $HSTS = $Headers["Strict-Transport-Security"]
    Write-Host "✅ Strict-Transport-Security: Present" -ForegroundColor Green
    Write-Host "   $HSTS"
    
    if ($Domain.StartsWith("https://")) {
        Write-Host "   ✓ Domain uses HTTPS (HSTS should be present)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Domain does not use HTTPS (HSTS should not be present)" -ForegroundColor Yellow
    }
} else {
    if ($Domain.StartsWith("https://")) {
        Write-Host "❌ Strict-Transport-Security: MISSING (should be present for HTTPS)" -ForegroundColor Red
        $Issues++
    } else {
        Write-Host "✅ Strict-Transport-Security: Not present (correct for HTTP)" -ForegroundColor Green
    }
}

# X-Frame-Options
if ($Headers["X-Frame-Options"]) {
    $XFrame = $Headers["X-Frame-Options"]
    Write-Host "✅ X-Frame-Options: Present" -ForegroundColor Green
    Write-Host "   $XFrame"
    
    if ($XFrame -eq "DENY") {
        Write-Host "   ✓ Set to DENY (prevents clickjacking)" -ForegroundColor Green
    } elseif ($XFrame -eq "SAMEORIGIN") {
        Write-Host "   ⚠️  Set to SAMEORIGIN (less secure than DENY)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ X-Frame-Options: MISSING" -ForegroundColor Red
    $Issues++
}

# X-Content-Type-Options
if ($Headers["X-Content-Type-Options"]) {
    $XContentType = $Headers["X-Content-Type-Options"]
    Write-Host "✅ X-Content-Type-Options: Present" -ForegroundColor Green
    Write-Host "   $XContentType"
    
    if ($XContentType -eq "nosniff") {
        Write-Host "   ✓ Set to nosniff (prevents MIME sniffing)" -ForegroundColor Green
    }
} else {
    Write-Host "❌ X-Content-Type-Options: MISSING" -ForegroundColor Red
    $Issues++
}

# Referrer-Policy
if ($Headers["Referrer-Policy"]) {
    $Referrer = $Headers["Referrer-Policy"]
    Write-Host "✅ Referrer-Policy: Present" -ForegroundColor Green
    Write-Host "   $Referrer"
} else {
    Write-Host "❌ Referrer-Policy: MISSING" -ForegroundColor Red
    $Issues++
}

# X-Powered-By (should be removed)
if ($Headers["X-Powered-By"]) {
    $XPowered = $Headers["X-Powered-By"]
    Write-Host "❌ X-Powered-By: Present (should be removed)" -ForegroundColor Red
    Write-Host "   $XPowered"
    $Issues++
} else {
    Write-Host "✅ X-Powered-By: Removed (good)" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host ""

if ($Issues -eq 0) {
    Write-Host "✅ All security headers are properly configured!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $Issues issue(s) with security headers" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Yellow
    Write-Host "1. Review CSP policy - consider CSP-Report-Only first"
    Write-Host "2. Ensure HSTS is only enabled for HTTPS"
    Write-Host "3. Verify headers don't break assets/functionality"
    exit 1
}





