# One-liner commands for testing admin health endpoint
# Each command is independent - copy-paste individually

$BASE_URL = "http://localhost:3001"

# Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)
Write-Host "Test 1: curl.exe -s -i $BASE_URL/api/admin/gdpr/health" -ForegroundColor Cyan
Write-Host "Expected: 404 NOT_FOUND" -ForegroundColor Yellow
Write-Host ""

# Test 2: Setup + Login as non-admin + Test endpoint (should return 403)
Write-Host "Test 2 (non-admin):" -ForegroundColor Cyan
Write-Host '$null = curl.exe -s -c cookies.txt "$BASE_URL/health"; $csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]; $loginBody = @{email="user@example.com";password="password"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"' -ForegroundColor Gray
Write-Host "Expected: 403 FORBIDDEN" -ForegroundColor Yellow
Write-Host ""

# Test 3: Setup + Login as admin + Test endpoint (should return 200)
Write-Host "Test 3 (admin):" -ForegroundColor Cyan
Write-Host '$null = curl.exe -s -c cookies.txt "$BASE_URL/health"; $csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]; $loginBody = @{email="admin@example.com";password="adminpassword"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"' -ForegroundColor Gray
Write-Host "Expected: 200 OK with JSON response" -ForegroundColor Yellow
Write-Host ""

# Test 4: Rate limiting (10 rapid calls)
Write-Host "Test 4 (rate limiting):" -ForegroundColor Cyan
Write-Host '$null = curl.exe -s -c cookies.txt "$BASE_URL/health"; $csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]; $loginBody = @{email="admin@example.com";password="adminpassword"} | ConvertTo-Json -Compress; $loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline; $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" --data "@login-body.json"; $TOKEN = ($loginResponse | ConvertFrom-Json).token; 1..10 | ForEach-Object { $num = $_; Write-Host "Request $num :" -NoNewline; $response = curl.exe -s -w " HTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"; $status = ($response | Select-String "HTTP_STATUS:(\d+)").Matches.Groups[1].Value; if ($status -eq "429") { Write-Host " $status (RATE LIMITED)" -ForegroundColor Red } elseif ($status -eq "200") { Write-Host " $status (OK)" -ForegroundColor Green } else { Write-Host " $status" -ForegroundColor Yellow } }' -ForegroundColor Gray
Write-Host "Expected: Some requests return 429 TOO_MANY_REQUESTS" -ForegroundColor Yellow
Write-Host ""

Write-Host "Note: For Tests 2-4, ensure ENABLE_ADMIN_HEALTH=true is set" -ForegroundColor Cyan




