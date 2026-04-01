# Simple PowerShell commands to test admin health endpoint
# Copy-paste these commands one by one

$BASE_URL = "http://localhost:3001"

Write-Host "=== Test 1: Without ENABLE_ADMIN_HEALTH (should return 404) ===" -ForegroundColor Cyan
curl.exe -s -i "$BASE_URL/api/admin/gdpr/health"
Write-Host ""

Write-Host "=== Test 2-4: Setup (Get CSRF token) ===" -ForegroundColor Cyan
$null = curl.exe -s -c cookies.txt "$BASE_URL/health"
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]
Write-Host "CSRF Token: $csrf" -ForegroundColor Green
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
$loginJson = $loginResponse | ConvertFrom-Json
if ($loginJson.token) {
    $TOKEN = $loginJson.token
    Write-Host "Token obtained (first 20 chars): $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Testing admin endpoint (should return 403):" -ForegroundColor Yellow
    curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
} else {
    Write-Host "Login failed: $loginResponse" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 3: Login as admin ===" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@example.com"
    password = "adminpassword"
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline
$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"
Write-Host "Login Response: $loginResponse" -ForegroundColor Gray
$loginJson = $loginResponse | ConvertFrom-Json
if ($loginJson.token) {
    $TOKEN = $loginJson.token
    Write-Host "Token obtained (first 20 chars): $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Testing admin endpoint (should return 200):" -ForegroundColor Yellow
    curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health" | ConvertFrom-Json | ConvertTo-Json
} else {
    Write-Host "Login failed: $loginResponse" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 4: Rate limiting (10 rapid calls) ===" -ForegroundColor Cyan
if ($TOKEN) {
    Write-Host "Making 10 rapid requests..." -ForegroundColor Yellow
    1..10 | ForEach-Object {
        $num = $_
        Write-Host "Request $num :" -NoNewline
        $response = curl.exe -s -w " HTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
        $status = ($response | Select-String "HTTP_STATUS:(\d+)").Matches.Groups[1].Value
        if ($status -eq "429") {
            Write-Host " $status (RATE LIMITED)" -ForegroundColor Red
        } elseif ($status -eq "200") {
            Write-Host " $status (OK)" -ForegroundColor Green
        } else {
            Write-Host " $status" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No token available. Run Test 3 first." -ForegroundColor Red
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue




