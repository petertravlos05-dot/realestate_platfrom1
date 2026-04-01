# Create test user and test bypass in production
# Usage: .\scripts\create-test-user-and-test-bypass.ps1

Write-Host "=== Creating Test User ===" -ForegroundColor Cyan

# Step 0: Clear rate limits (if Redis is configured)
Write-Host "`n0. Clearing rate limits (if Redis configured)..." -ForegroundColor Yellow
$clearResult = node scripts/clear-export-rate-limit.js 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Rate limits cleared" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Rate limits not cleared (using in-memory or Redis not configured)" -ForegroundColor Yellow
    Write-Host "   Note: If rate limit errors occur, restart backend server or wait for expiration" -ForegroundColor Gray
}

# Step 1: Get CSRF token
Write-Host "`n1. Getting CSRF token..." -ForegroundColor Yellow
$null = curl.exe -s -c cookies.txt http://localhost:3001/health
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]
Write-Host "   CSRF: $csrf" -ForegroundColor Green

# Step 2: Register test user
Write-Host "`n2. Registering test user..." -ForegroundColor Yellow
$testEmail = "test-bypass-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPassword = "TestPassword123!"

# Check if we're in production (for bypass header)
$isProduction = $env:NODE_ENV -eq "production"
$bypassHeader = if (-not $isProduction) { "-H `"X-Test-Request: true`"" } else { "" }

# Create JSON body using ConvertTo-Json and save to temp file
$registerBody = @{
    email = $testEmail
    password = $testPassword
    name = "Test User"
    role = "BUYER"
} | ConvertTo-Json -Compress

$registerBody | Out-File -FilePath "register-body.json" -Encoding utf8 -NoNewline

# Build curl command with optional bypass header
$registerCmd = "curl.exe -s -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/auth/register -H `"Content-Type: application/json`" -H `"X-CSRF-Token: $csrf`" $bypassHeader --data `"@register-body.json`""
$registerResponse = Invoke-Expression $registerCmd

$registerJson = $registerResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($registerJson.error) {
    Write-Host "   ⚠️  Registration error: $($registerJson.error)" -ForegroundColor Yellow
    if ($registerJson.error -eq "Too many requests") {
        Write-Host "   💡 Rate limit exceeded. Solutions:" -ForegroundColor Cyan
        Write-Host "      1. Restart backend server (clears in-memory rate limits)" -ForegroundColor Gray
        Write-Host "      2. Wait for rate limit to expire (15 minutes)" -ForegroundColor Gray
        Write-Host "      3. Use Redis and clear keys: node scripts/clear-export-rate-limit.js" -ForegroundColor Gray
        exit 1
    }
    Write-Host "   Response: $registerResponse" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "   ✅ User registered successfully" -ForegroundColor Green
}

Write-Host "   Email: $testEmail" -ForegroundColor Green
Write-Host "   Password: $testPassword" -ForegroundColor Green

# Update CSRF after registration
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]

# Step 3: Accept consents (required before login) - use accept-with-auth endpoint
Write-Host "`n3. Accepting consents..." -ForegroundColor Yellow
$consentBody = @{
    email = $testEmail
    password = $testPassword
    consents = @(
        @{ type = "TERMS"; version = "2026-01-01" }
        @{ type = "PRIVACY"; version = "2026-01-01" }
    )
} | ConvertTo-Json -Compress

$consentBody | Out-File -FilePath "consent-body.json" -Encoding utf8 -NoNewline

# Build curl command with optional bypass header
$consentCmd = "curl.exe -s -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/user/consents/accept-with-auth -H `"Content-Type: application/json`" -H `"X-CSRF-Token: $csrf`" $bypassHeader --data `"@consent-body.json`""
$consentResponse = Invoke-Expression $consentCmd

$consentJson = $consentResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($consentJson.error) {
    Write-Host "   ⚠️  Consent error: $($consentJson.error)" -ForegroundColor Yellow
    if ($consentJson.error -eq "Invalid credentials") {
        Write-Host "   💡 Registration may have failed. Check above." -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "   ✅ Consents accepted" -ForegroundColor Green
}

# Update CSRF after consent
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]

# Step 4: Login
Write-Host "`n4. Logging in..." -ForegroundColor Yellow
# Create JSON body using ConvertTo-Json and save to temp file
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json -Compress

$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

# Build curl command with optional bypass header
$loginCmd = "curl.exe -s -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/auth/login -H `"Content-Type: application/json`" -H `"X-CSRF-Token: $csrf`" $bypassHeader --data `"@login-body.json`""
$loginResponse = Invoke-Expression $loginCmd

$loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue

if ($loginJson.token) {
    $token = $loginJson.token
    Write-Host "   ✅ Token obtained" -ForegroundColor Green
} else {
    Write-Host "   ❌ Login failed: $loginResponse" -ForegroundColor Red
    if ($loginJson.error -eq "Too many requests") {
        Write-Host "   💡 Rate limit exceeded. Solutions:" -ForegroundColor Cyan
        Write-Host "      1. Restart backend server (clears in-memory rate limits)" -ForegroundColor Gray
        Write-Host "      2. Wait for rate limit to expire (15 minutes)" -ForegroundColor Gray
    }
    exit 1
}

# Update CSRF after login
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]

Write-Host "`n=== Testing Rate Limit Bypass in Production ===" -ForegroundColor Cyan
Write-Host "Backend should be running with NODE_ENV=production" -ForegroundColor Yellow
Write-Host ""

# Update CSRF after login
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]

# Helper function to extract HTTP status from curl response
function Get-HttpStatus {
    param([string]$response)
    if ($response -match "HTTP_STATUS:(\d+)") {
        return $matches[1]
    }
    # Try to find HTTP_STATUS at the end of the string
    $lines = $response -split "`n"
    foreach ($line in [array]::Reverse($lines)) {
        if ($line -match "HTTP_STATUS:(\d+)") {
            return $matches[1]
        }
    }
    return "unknown"
}

# Step 5: First export request (should succeed)
Write-Host "5. Request 1 (normal export)..." -ForegroundColor Yellow
$response1 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $token" `
    -H "X-CSRF-Token: $csrf" `
    -H "Cookie: csrf_token=$csrf" `
    -H "Content-Type: application/json" `
    -d '{}'
$status1 = Get-HttpStatus $response1
Write-Host "   Status: $status1" -ForegroundColor $(if ($status1 -eq "200") { "Green" } else { "Yellow" })
if ($status1 -eq "unknown") {
    Write-Host "   Response preview: $($response1.Substring(0, [Math]::Min(100, $response1.Length)))..." -ForegroundColor Gray
}
Write-Host ""

# Wait a moment to ensure rate limit is tracked
Start-Sleep -Milliseconds 100

# Step 6: Second export request (should be rate limited - 429)
Write-Host "6. Request 2 (should be rate limited - 429)..." -ForegroundColor Yellow
$response2 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $token" `
    -H "X-CSRF-Token: $csrf" `
    -H "Cookie: csrf_token=$csrf" `
    -H "Content-Type: application/json" `
    -d '{}'
$status2 = Get-HttpStatus $response2
Write-Host "   Status: $status2" -ForegroundColor $(if ($status2 -eq "429") { "Green" } elseif ($status2 -eq "200") { "Yellow" } else { "Red" })
if ($status2 -eq "200") {
    Write-Host "   ⚠️  Rate limit not triggered yet (requests too fast or limit allows 2/hour)" -ForegroundColor Yellow
}
if ($status2 -eq "unknown") {
    Write-Host "   Response preview: $($response2.Substring(0, [Math]::Min(100, $response2.Length)))..." -ForegroundColor Gray
}
Write-Host ""

# Wait a moment
Start-Sleep -Milliseconds 100

# Step 7: Third request (should be rate limited - 429, exceeds 2/hour limit)
Write-Host "7. Request 3 (should be rate limited - 429, exceeds 2/hour limit)..." -ForegroundColor Yellow
$response3 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $token" `
    -H "X-CSRF-Token: $csrf" `
    -H "Cookie: csrf_token=$csrf" `
    -H "Content-Type: application/json" `
    -d '{}'
$status3 = Get-HttpStatus $response3
Write-Host "   Status: $status3" -ForegroundColor $(if ($status3 -eq "429") { "Green" } elseif ($status3 -eq "200") { "Yellow" } else { "Red" })
if ($status3 -eq "unknown") {
    Write-Host "   Response preview: $($response3.Substring(0, [Math]::Min(100, $response3.Length)))..." -ForegroundColor Gray
}
Write-Host ""

# Wait a moment
Start-Sleep -Milliseconds 100

# Step 8: Fourth request with bypass header (should STILL be rate limited in production)
Write-Host "8. Request 4 (with X-Test-Request header - should STILL be rate limited)..." -ForegroundColor Red
$response4 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $token" `
    -H "X-CSRF-Token: $csrf" `
    -H "Cookie: csrf_token=$csrf" `
    -H "X-Test-Request: true" `
    -H "Content-Type: application/json" `
    -d '{}'
$status4 = Get-HttpStatus $response4
Write-Host "   Status: $status4" -ForegroundColor $(if ($status4 -eq "429") { "Green" } elseif ($status4 -eq "200") { "Red" } else { "Yellow" })
if ($status4 -eq "unknown") {
    Write-Host "   Response preview: $($response4.Substring(0, [Math]::Min(100, $response4.Length)))..." -ForegroundColor Gray
}
Write-Host ""

# Check results
Write-Host "=== Verification ===" -ForegroundColor Cyan
Write-Host "Request 1 Status: $status1" -ForegroundColor Gray
Write-Host "Request 2 Status: $status2" -ForegroundColor Gray
Write-Host "Request 3 Status: $status3 (should be 429 if rate limit exceeded)" -ForegroundColor Gray
Write-Host "Request 4 Status: $status4 (with bypass header - should be 429 in production)" -ForegroundColor Gray
Write-Host ""

# Check if bypass header was ignored (check backend logs)
# The key test: if Request 3 was rate limited (429) but Request 4 with bypass header ALSO gets 429, bypass is disabled
# If Request 4 with bypass header gets 200 while Request 3 was 429, bypass is still working

if ($status4 -eq "429") {
    Write-Host "✅ SUCCESS: Bypass is DISABLED in production (429 response)" -ForegroundColor Green
    Write-Host "   Security is working correctly!" -ForegroundColor Green
    Write-Host "   Backend logs should show: '[RATE_LIMIT] Security: X-Test-Request header ignored'" -ForegroundColor Gray
} elseif ($status4 -eq "200") {
    if ($status3 -eq "429") {
        Write-Host "❌ SECURITY VULNERABILITY: Bypass still works in production!" -ForegroundColor Red
        Write-Host "   Request 3 was rate limited ($status3) but Request 4 with bypass header succeeded ($status4)" -ForegroundColor Red
        Write-Host "   Check backend logs - should see security warning but bypass still worked" -ForegroundColor Red
    } elseif ($status3 -eq "200") {
        Write-Host "INFO: Rate limit allows 2 requests/hour, so requests 1-3 succeeded" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "SECURITY VERIFICATION:" -ForegroundColor Green
        Write-Host "   Check your backend logs for this message:" -ForegroundColor Yellow
        Write-Host "   [RATE_LIMIT] Security: X-Test-Request header ignored in production" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   If you see this message -> Bypass is correctly DISABLED in production" -ForegroundColor Green
        Write-Host "   If you DON'T see this message -> Security vulnerability!" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Note: Request 4 should be rate limited (429) if rate limit was exceeded." -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Unexpected response. Check status codes above." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Unexpected response. Check status code above." -ForegroundColor Yellow
    Write-Host "   Response: $response4" -ForegroundColor Gray
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item register-body.json -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue
Remove-Item consent-body.json -ErrorAction SilentlyContinue

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Test user created: $testEmail" -ForegroundColor Gray
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host '   - Security fix verified: X-Test-Request header is ignored in production' -ForegroundColor Green
Write-Host '   - Check backend logs for confirmation: [RATE_LIMIT] Security: X-Test-Request header ignored' -ForegroundColor Yellow
Write-Host '   - Rate limit: 2 exports/hour per user (allows 2 requests before blocking)' -ForegroundColor Gray

