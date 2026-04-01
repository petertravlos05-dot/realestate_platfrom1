# PowerShell script to verify admin health endpoint security
# Run with: .\verify-admin-health.ps1

$BASE_URL = "http://localhost:3001"

Write-Host "🧪 Testing Admin GDPR Health Endpoint Security" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)
Write-Host "Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)" -ForegroundColor Yellow
$response1 = curl.exe -s -i "$BASE_URL/api/admin/gdpr/health"
$status1 = ($response1 | Select-String "HTTP/\d\.\d\s+(\d+)").Matches.Groups[1].Value
Write-Host "Status: $status1"
if ($status1 -eq "404") {
    Write-Host "✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED (expected 404)" -ForegroundColor Red
}
Write-Host ""

# Get CSRF token for remaining tests
Write-Host "Getting CSRF token..." -ForegroundColor Yellow
$null = curl.exe -s -c cookies.txt "$BASE_URL/health"
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]
Write-Host "CSRF Token obtained" -ForegroundColor Green
Write-Host ""

# Test 2: With ENABLE_ADMIN_HEALTH but non-admin token (should return 403)
Write-Host "Test 2: With ENABLE_ADMIN_HEALTH but non-admin token (should return 403)" -ForegroundColor Yellow
Write-Host "⚠️  Note: Requires ENABLE_ADMIN_HEALTH=true and a non-admin user" -ForegroundColor Yellow
Write-Host ""
Write-Host "Command:" -ForegroundColor Gray
Write-Host '$loginBody = @{email="user@example.com";password="password"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"' -ForegroundColor DarkGray
Write-Host ""

# Test 3: With ENABLE_ADMIN_HEALTH and admin token (should return 200)
Write-Host "Test 3: With ENABLE_ADMIN_HEALTH and admin token (should return 200)" -ForegroundColor Yellow
Write-Host "⚠️  Note: Requires ENABLE_ADMIN_HEALTH=true and an admin user" -ForegroundColor Yellow
Write-Host ""
Write-Host "Command:" -ForegroundColor Gray
Write-Host '$loginBody = @{email="admin@example.com";password="adminpassword"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"' -ForegroundColor DarkGray
Write-Host ""

# Test 4: Rate limiting (10 rapid calls should trigger 429)
Write-Host "Test 4: Rate limiting (10 rapid calls should trigger 429)" -ForegroundColor Yellow
Write-Host "⚠️  Note: Requires ENABLE_ADMIN_HEALTH=true and an admin token" -ForegroundColor Yellow
Write-Host ""
Write-Host "Command:" -ForegroundColor Gray
Write-Host '$loginBody = @{email="admin@example.com";password="adminpassword"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; 1..10 | ForEach-Object { Write-Host "Request $_:"; curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health" }' -ForegroundColor DarkGray
Write-Host ""

Write-Host "✅ Verification script completed" -ForegroundColor Green
Write-Host ""
Write-Host "For full automated tests, ensure:" -ForegroundColor Cyan
Write-Host "  1. Backend server is running" -ForegroundColor White
Write-Host "  2. ENABLE_ADMIN_HEALTH=true is set (for tests 2-4)" -ForegroundColor White
Write-Host "  3. You have admin and non-admin test users" -ForegroundColor White

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue

