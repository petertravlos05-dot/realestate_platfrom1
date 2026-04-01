# Complete PowerShell script with consent handling
# This script handles the case where users need to accept consents before login

$BASE_URL = "http://localhost:3001"

Write-Host "=== Test 1: Without ENABLE_ADMIN_HEALTH (should return 404) ===" -ForegroundColor Cyan
curl.exe -s -i "$BASE_URL/api/admin/gdpr/health"
Write-Host ""

Write-Host "=== Setup: Get CSRF token ===" -ForegroundColor Cyan
$null = curl.exe -s -c cookies.txt "$BASE_URL/health"
$csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
if ($csrfLine) {
    $csrf = $csrfLine.Line.Split("`t")[6]
    Write-Host "CSRF Token: $csrf" -ForegroundColor Green
} else {
    Write-Host "ERROR: CSRF token not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== Test 3: Login as admin (with consent handling) ===" -ForegroundColor Cyan
$adminEmail = "admin@example.com"
$adminPassword = "adminpassword"

# Step 1: Try login first
Write-Host "Step 1: Attempting login..." -ForegroundColor Yellow
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"

Write-Host "Login Response: $loginResponse" -ForegroundColor Gray

try {
    $loginJson = $loginResponse | ConvertFrom-Json
    
    # Check if consent is required (428)
    if ($loginJson.error -eq "CONSENT_REQUIRED") {
        Write-Host "Consent required! Accepting consents..." -ForegroundColor Yellow
        
        # Get current versions from response
        $termsVersion = $loginJson.versions.terms
        $privacyVersion = $loginJson.versions.privacy
        
        Write-Host "Terms version: $termsVersion" -ForegroundColor Gray
        Write-Host "Privacy version: $privacyVersion" -ForegroundColor Gray
        
        # Accept consents using accept-with-auth endpoint
        $consentBody = @{
            email = $adminEmail
            password = $adminPassword
            consents = @(
                @{ type = "TERMS"; version = $termsVersion },
                @{ type = "PRIVACY"; version = $privacyVersion }
            )
        } | ConvertTo-Json -Compress -Depth 10
        
        $consentBody | Out-File -FilePath "consent-body.json" -Encoding utf8 -NoNewline
        
        # Refresh CSRF token
        $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
        $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
        if ($csrfLine) {
            $csrf = $csrfLine.Line.Split("`t")[6]
        }
        
        $consentResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/user/consents/accept-with-auth" `
            -H "Content-Type: application/json" `
            -H "X-CSRF-Token: $csrf" `
            --data "@consent-body.json"
        
        Write-Host "Consent Response: $consentResponse" -ForegroundColor Gray
        
        # Try login again after accepting consents
        Write-Host "Step 2: Logging in again after accepting consents..." -ForegroundColor Yellow
        
        # Refresh CSRF token again
        $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
        $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
        if ($csrfLine) {
            $csrf = $csrfLine.Line.Split("`t")[6]
        }
        
        $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline
        
        $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
            -H "Content-Type: application/json" `
            -H "X-CSRF-Token: $csrf" `
            --data "@login-body.json"
        
        Write-Host "Login Response (after consent): $loginResponse" -ForegroundColor Gray
        $loginJson = $loginResponse | ConvertFrom-Json
    }
    
    # Now check for token
    if ($loginJson.token) {
        $TOKEN = $loginJson.token
        Write-Host "Token obtained (first 30 chars): $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..." -ForegroundColor Green
        Write-Host ""
        
        # Test admin endpoint
        Write-Host "Testing admin endpoint (should return 200 if ENABLE_ADMIN_HEALTH=true):" -ForegroundColor Yellow
        $adminResponse = curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $adminResponse
        
        # Try to parse JSON response
        $adminJsonResponse = curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
        try {
            $adminJson = $adminJsonResponse | ConvertFrom-Json
            Write-Host ""
            Write-Host "JSON Response:" -ForegroundColor Green
            $adminJson | ConvertTo-Json -Depth 10
        } catch {
            Write-Host "Response is not JSON (might be 404 or error): $adminJsonResponse" -ForegroundColor Yellow
        }
        
    } elseif ($loginJson.error) {
        Write-Host "Login failed: $($loginJson.error) - $($loginJson.message)" -ForegroundColor Red
        Write-Host "Full response: $loginResponse" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. User doesn't exist - create admin user first" -ForegroundColor Gray
        Write-Host "  2. Wrong password" -ForegroundColor Gray
        Write-Host "  3. Account deleted (isDeleted=true)" -ForegroundColor Gray
    } else {
        Write-Host "Login response missing token. Full response: $loginResponse" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to parse login response as JSON: $loginResponse" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 4: Rate limiting (10 rapid calls) ===" -ForegroundColor Cyan
if ($TOKEN) {
    Write-Host "Making 10 rapid requests..." -ForegroundColor Yellow
    1..10 | ForEach-Object {
        $num = $_
        Write-Host "Request $num :" -NoNewline
        $response = curl.exe -s -w " HTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
        $statusMatch = $response | Select-String "HTTP_STATUS:(\d+)"
        if ($statusMatch) {
            $status = $statusMatch.Matches.Groups[1].Value
            if ($status -eq "429") {
                Write-Host " $status (RATE LIMITED)" -ForegroundColor Red
            } elseif ($status -eq "200") {
                Write-Host " $status (OK)" -ForegroundColor Green
            } elseif ($status -eq "401") {
                Write-Host " $status (UNAUTHORIZED)" -ForegroundColor Yellow
            } elseif ($status -eq "404") {
                Write-Host " $status (NOT FOUND - ENABLE_ADMIN_HEALTH not set?)" -ForegroundColor Yellow
            } else {
                Write-Host " $status" -ForegroundColor Yellow
            }
        } else {
            Write-Host " (no status found)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No token available. Ensure login succeeds first." -ForegroundColor Red
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue
Remove-Item consent-body.json -ErrorAction SilentlyContinue




