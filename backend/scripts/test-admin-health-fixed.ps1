# Fixed PowerShell commands with error handling and debugging
# Copy-paste these commands one by one

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

Write-Host "=== Test 2: Login as non-admin ===" -ForegroundColor Cyan
$loginBody = @{
    email = "user@example.com"
    password = "password"
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"

Write-Host "Login Response: $loginResponse" -ForegroundColor Gray

try {
    $loginJson = $loginResponse | ConvertFrom-Json
    if ($loginJson.token) {
        $TOKEN = $loginJson.token
        Write-Host "Token obtained (first 30 chars): $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..." -ForegroundColor Green
        Write-Host ""
        Write-Host "Testing admin endpoint (should return 403):" -ForegroundColor Yellow
        curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
    } elseif ($loginJson.error) {
        Write-Host "Login failed: $($loginJson.error) - $($loginJson.message)" -ForegroundColor Red
        Write-Host "Full response: $loginResponse" -ForegroundColor Gray
    } else {
        Write-Host "Login response missing token. Full response: $loginResponse" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to parse login response as JSON: $loginResponse" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 3: Login as admin ===" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@example.com"
    password = "adminpassword"
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

# Refresh CSRF token
$null = curl.exe -s -c cookies.txt "$BASE_URL/health"
$csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
if ($csrfLine) {
    $csrf = $csrfLine.Line.Split("`t")[6]
}

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"

Write-Host "Login Response: $loginResponse" -ForegroundColor Gray

try {
    $loginJson = $loginResponse | ConvertFrom-Json
    if ($loginJson.token) {
        $TOKEN = $loginJson.token
        Write-Host "Token obtained (first 30 chars): $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..." -ForegroundColor Green
        Write-Host ""
        Write-Host "Testing admin endpoint (should return 200):" -ForegroundColor Yellow
        $adminResponse = curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
        Write-Host "Response:" -ForegroundColor Gray
        $adminResponse | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } elseif ($loginJson.error) {
        Write-Host "Login failed: $($loginJson.error) - $($loginJson.message)" -ForegroundColor Red
        Write-Host "Full response: $loginResponse" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. User doesn't exist - create admin user first" -ForegroundColor Gray
        Write-Host "  2. Wrong password" -ForegroundColor Gray
        Write-Host "  3. User missing required consents (TERMS, PRIVACY)" -ForegroundColor Gray
        Write-Host "  4. ENABLE_ADMIN_HEALTH not set (but this would cause 404, not login failure)" -ForegroundColor Gray
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
                Write-Host " $status (UNAUTHORIZED - token may be invalid)" -ForegroundColor Yellow
            } else {
                Write-Host " $status" -ForegroundColor Yellow
            }
        } else {
            Write-Host " (no status found)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No token available. Run Test 3 first and ensure login succeeds." -ForegroundColor Red
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue




