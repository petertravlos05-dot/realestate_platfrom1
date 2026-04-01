# Script to get tokens and test bypass in production
# Usage: .\scripts\get-tokens-and-test-bypass.ps1 <email> <password>

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$Password
)

Write-Host "=== Getting Authentication Tokens ===" -ForegroundColor Cyan

# Step 1: Get CSRF token from health endpoint
Write-Host "`n1. Getting CSRF token..." -ForegroundColor Yellow
$null = curl.exe -s -c cookies.txt -X GET http://localhost:3001/health

# Read cookies file and extract CSRF token
$cookieContent = Get-Content cookies.txt -ErrorAction SilentlyContinue
$csrfLine = $cookieContent | Where-Object { $_ -match "csrf_token" }

if ($csrfLine) {
    # Netscape cookie format: domain, flag, path, secure, expiration, name, value
    $parts = $csrfLine -split "`t"
    if ($parts.Length -ge 7) {
        $csrfToken = $parts[6]  # Value is at index 6
        Write-Host "   ✅ CSRF Token: $csrfToken" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Could not parse CSRF token from cookie file" -ForegroundColor Yellow
        $csrfToken = ""
    }
} else {
    Write-Host "   ⚠️  CSRF token not found in cookies" -ForegroundColor Yellow
    $csrfToken = ""
}

# Step 2: Login to get JWT token
Write-Host "`n2. Logging in..." -ForegroundColor Yellow
# Create JSON body using ConvertTo-Json with -Compress
$loginBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json -Compress

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/auth/login `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrfToken" `
    --data-raw $loginBody

$loginData = $loginResponse | ConvertFrom-Json

if ($loginData.token) {
    $jwtToken = $loginData.token
    Write-Host "   ✅ JWT Token obtained" -ForegroundColor Green
    Write-Host "   Token (first 20 chars): $($jwtToken.Substring(0, [Math]::Min(20, $jwtToken.Length)))..." -ForegroundColor Gray
} else {
    Write-Host "   ❌ Login failed: $loginResponse" -ForegroundColor Red
    exit 1
}

# Update CSRF token from new cookies
$csrfCookie = Select-String -Path cookies.txt -Pattern "csrf_token" | ForEach-Object { ($_.Line -split "`t")[6] }
if ($csrfCookie) {
    $csrfToken = $csrfCookie -split "=" | Select-Object -Last 1
}

Write-Host "`n=== Testing Rate Limit Bypass in Production ===" -ForegroundColor Cyan
Write-Host "Backend should be running with NODE_ENV=production" -ForegroundColor Yellow
Write-Host ""

# Step 3: Make first export request (should succeed)
Write-Host "3. Request 1 (normal export)..." -ForegroundColor Yellow
$response1 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $jwtToken" `
    -H "X-CSRF-Token: $csrfToken" `
    -H "Cookie: csrf_token=$csrfToken" `
    -H "Content-Type: application/json" `
    -d '{}'
Write-Host $response1
Write-Host ""

# Step 4: Make second export request (should be rate limited - 429)
Write-Host "4. Request 2 (should be rate limited - 429)..." -ForegroundColor Yellow
$response2 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $jwtToken" `
    -H "X-CSRF-Token: $csrfToken" `
    -H "Cookie: csrf_token=$csrfToken" `
    -H "Content-Type: application/json" `
    -d '{}'
Write-Host $response2
Write-Host ""

# Step 5: Make third request with bypass header (should STILL be rate limited in production)
Write-Host "5. Request 3 (with X-Test-Request header - should STILL be rate limited)..." -ForegroundColor Red
$response3 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export `
    -H "Authorization: Bearer $jwtToken" `
    -H "X-CSRF-Token: $csrfToken" `
    -H "Cookie: csrf_token=$csrfToken" `
    -H "X-Test-Request: true" `
    -H "Content-Type: application/json" `
    -d '{}'
Write-Host $response3
Write-Host ""

# Check results
if ($response3 -match "HTTP_STATUS:429") {
    Write-Host "✅ SUCCESS: Bypass is DISABLED in production (429 response)" -ForegroundColor Green
    Write-Host "   Security is working correctly!" -ForegroundColor Green
} elseif ($response3 -match "HTTP_STATUS:200") {
    Write-Host "❌ SECURITY VULNERABILITY: Bypass still works in production!" -ForegroundColor Red
    Write-Host "   Check backend logs for security warnings" -ForegroundColor Red
    Write-Host "   Backend may not be running with NODE_ENV=production" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Unexpected response. Check status code above." -ForegroundColor Yellow
    Write-Host "   Response: $response3" -ForegroundColor Gray
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan

