# Security Smoke Tests (PowerShell)
# Run these tests against your backend to verify security controls

$ErrorActionPreference = "Stop"

# Configuration
$BackendUrl = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:3001" }
$ApiUrl = "$BackendUrl/api"

Write-Host "🔒 Security Smoke Tests" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl"
Write-Host ""

# Test 1: Rate Limiting (429)
Write-Host "Test 1: Rate Limiting (Login endpoint)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
Write-Host "Sending 20 login requests (should get 429 after ~5 requests)..."
Write-Host ""

$successCount = 0
$rateLimited = 0

for ($i = 1; $i -le 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$ApiUrl/auth/login" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -Body '{"email":"test@test.com","password":"wrong"}' `
            -UseBasicParsing `
            -ErrorAction SilentlyContinue
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 429) {
            $rateLimited++
            Write-Host "Request $i`: $statusCode (Rate Limited)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 401 -or $statusCode -eq 400) {
            $successCount++
            Write-Host "Request $i`: $statusCode"
        } else {
            Write-Host "Request $i`: $statusCode (Unexpected)" -ForegroundColor Red
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429) {
            $rateLimited++
            Write-Host "Request $i`: $statusCode (Rate Limited)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 401 -or $statusCode -eq 400) {
            $successCount++
            Write-Host "Request $i`: $statusCode"
        } else {
            Write-Host "Request $i`: Error - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""
if ($rateLimited -gt 0) {
    Write-Host "✅ Rate limiting working: Got $rateLimited rate limit responses" -ForegroundColor Green
} else {
    Write-Host "❌ Rate limiting NOT working: No 429 responses" -ForegroundColor Red
}
Write-Host ""

# Test 2: Security Headers
Write-Host "Test 2: Security Headers" -ForegroundColor Yellow
Write-Host "-----------------------" -ForegroundColor Yellow

try {
    $headers = Invoke-WebRequest -Uri "$BackendUrl/health" -Method HEAD -UseBasicParsing
    
    $csp = $headers.Headers["Content-Security-Policy"]
    $hsts = $headers.Headers["Strict-Transport-Security"]
    $xFrame = $headers.Headers["X-Frame-Options"]
    $xContentType = $headers.Headers["X-Content-Type-Options"]
    $referrer = $headers.Headers["Referrer-Policy"]
    
    if ($csp) {
        Write-Host "✅ Content-Security-Policy header present" -ForegroundColor Green
    } else {
        Write-Host "❌ Content-Security-Policy header missing" -ForegroundColor Red
    }
    
    if ($hsts) {
        Write-Host "✅ Strict-Transport-Security header present" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Strict-Transport-Security header missing (may be dev environment)" -ForegroundColor Yellow
    }
    
    if ($xFrame) {
        Write-Host "✅ X-Frame-Options header present" -ForegroundColor Green
    } else {
        Write-Host "❌ X-Frame-Options header missing" -ForegroundColor Red
    }
    
    if ($xContentType) {
        Write-Host "✅ X-Content-Type-Options header present" -ForegroundColor Green
    } else {
        Write-Host "❌ X-Content-Type-Options header missing" -ForegroundColor Red
    }
    
    if ($referrer) {
        Write-Host "✅ Referrer-Policy header present" -ForegroundColor Green
    } else {
        Write-Host "❌ Referrer-Policy header missing" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to check headers: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Webhook Signature Verification
Write-Host "Test 3: Webhook Signature Verification" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Yellow

try {
    $webhookResponse = Invoke-WebRequest -Uri "$ApiUrl/stripe/webhook" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Stripe-Signature" = "fake_signature"
        } `
        -Body '{"id":"evt_fake","type":"payment_intent.succeeded"}' `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    $webhookStatus = $webhookResponse.StatusCode
} catch {
    $webhookStatus = $_.Exception.Response.StatusCode.value__
}

if ($webhookStatus -eq 400 -or $webhookStatus -eq 401 -or $webhookStatus -eq 403) {
    Write-Host "✅ Webhook signature verification working: Got $webhookStatus (rejected fake signature)" -ForegroundColor Green
} else {
    Write-Host "❌ Webhook signature verification NOT working: Got $webhookStatus (should be 400/401/403)" -ForegroundColor Red
}

Write-Host ""

# Test 4: CORS Configuration
Write-Host "Test 4: CORS Configuration" -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow

try {
    $corsResponse = Invoke-WebRequest -Uri "$ApiUrl/health" `
        -Method OPTIONS `
        -Headers @{
            "Origin" = "http://evil.com"
            "Access-Control-Request-Method" = "GET"
        } `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    $allowedOrigin = $corsResponse.Headers["Access-Control-Allow-Origin"]
    
    if ($allowedOrigin) {
        if ($allowedOrigin -like "*evil.com*") {
            Write-Host "❌ CORS misconfigured: Allows evil.com" -ForegroundColor Red
        } else {
            Write-Host "✅ CORS configured: Access-Control-Allow-Origin: $allowedOrigin" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  CORS headers not visible in OPTIONS response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  CORS test failed (may be expected if CORS blocks): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "======================" -ForegroundColor Cyan
Write-Host "Smoke tests completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: For BOLA/IDOR tests, you need:" -ForegroundColor Yellow
Write-Host "  1. Two user tokens (User A and User B)"
Write-Host "  2. A resource owned by User A"
Write-Host "  3. Try accessing it with User B token - should get 403/404"
Write-Host ""
Write-Host "For file upload tests, try uploading forbidden files (.html, .php, .exe)"
Write-Host "and verify you get 400 responses."





