# Production Bypass Verification Script
# Usage: .\scripts\verify-bypass-production.ps1 <TOKEN> <CSRF>

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$true)]
    [string]$Csrf
)

Write-Host "=== Testing Rate Limit Bypass in Production ===" -ForegroundColor Yellow
Write-Host "Backend must be running with NODE_ENV=production" -ForegroundColor Yellow
Write-Host ""

# Request 1 - Should succeed
Write-Host "Request 1 (normal)..." -ForegroundColor Cyan
$response1 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export -H "Authorization: Bearer $Token" -H "X-CSRF-Token: $Csrf" -H "Cookie: csrf_token=$Csrf" -H "Content-Type: application/json" -d '{}'
Write-Host $response1
Write-Host ""

# Request 2 - Should be rate limited (429)
Write-Host "Request 2 (should be rate limited)..." -ForegroundColor Cyan
$response2 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export -H "Authorization: Bearer $Token" -H "X-CSRF-Token: $Csrf" -H "Cookie: csrf_token=$Csrf" -H "Content-Type: application/json" -d '{}'
Write-Host $response2
Write-Host ""

# Request 3 - With bypass header (should STILL be rate limited in production)
Write-Host "Request 3 (with X-Test-Request header - should STILL be rate limited)..." -ForegroundColor Red
$response3 = curl.exe -s -w "`nHTTP_STATUS:%{http_code}`n" -X POST http://localhost:3001/api/user/export -H "Authorization: Bearer $Token" -H "X-CSRF-Token: $Csrf" -H "Cookie: csrf_token=$Csrf" -H "X-Test-Request: true" -H "Content-Type: application/json" -d '{}'
Write-Host $response3
Write-Host ""

# Check if bypass worked
if ($response3 -match "HTTP_STATUS:429") {
    Write-Host "✅ SUCCESS: Bypass is DISABLED in production (429 response)" -ForegroundColor Green
} elseif ($response3 -match "HTTP_STATUS:200") {
    Write-Host "❌ SECURITY VULNERABILITY: Bypass still works in production!" -ForegroundColor Red
    Write-Host "   Check backend logs for security warnings" -ForegroundColor Red
} else {
    Write-Host "⚠️  Unexpected response. Check status code above." -ForegroundColor Yellow
}




