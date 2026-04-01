# Complete script to setup admin user and test admin health endpoint
# This script handles rate limits, creates admin user if needed, accepts consents, and tests the endpoint

$BASE_URL = "http://localhost:3001"
$ADMIN_EMAIL = "admin@example.com"
$ADMIN_PASSWORD = "AdminPassword123!"

Write-Host "=== Setup Admin User and Test Health Endpoint ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear rate limits (if Redis configured)
Write-Host "Step 1: Clearing rate limits..." -ForegroundColor Yellow
$clearResult = node scripts/clear-export-rate-limit.js 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Rate limits cleared" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Rate limits not cleared (using in-memory or Redis not configured)" -ForegroundColor Yellow
    Write-Host "   Note: If rate limit errors occur, restart backend server" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Get CSRF token
Write-Host "Step 2: Getting CSRF token..." -ForegroundColor Yellow
$null = curl.exe -s -c cookies.txt "$BASE_URL/health"
$csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
if ($csrfLine) {
    $csrf = $csrfLine.Line.Split("`t")[6]
    Write-Host "   ✅ CSRF Token obtained" -ForegroundColor Green
} else {
    Write-Host "   ❌ CSRF token not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Try to login (to check if user exists)
Write-Host "Step 3: Checking if admin user exists..." -ForegroundColor Yellow
$loginBody = @{
    email = $ADMIN_EMAIL
    password = $ADMIN_PASSWORD
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"

$loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue

if ($loginJson.token) {
    Write-Host "   ✅ Admin user exists and login successful" -ForegroundColor Green
    $TOKEN = $loginJson.token
} elseif ($loginJson.error -eq "Too many requests") {
    Write-Host "   ⚠️  Rate limited. Waiting 60 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
    Write-Host "   Retrying login..." -ForegroundColor Yellow
    
    # Refresh CSRF
    $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
    $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
    if ($csrfLine) {
        $csrf = $csrfLine.Line.Split("`t")[6]
    }
    
    $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
        -H "Content-Type: application/json" `
        -H "X-CSRF-Token: $csrf" `
        --data "@login-body.json"
    $loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($loginJson.token) {
        Write-Host "   ✅ Login successful after wait" -ForegroundColor Green
        $TOKEN = $loginJson.token
    } else {
        Write-Host "   ❌ Login still failing: $($loginJson.error)" -ForegroundColor Red
        Write-Host "   Creating admin user via Node.js script..." -ForegroundColor Yellow
        
        # Create admin user using Node.js script
        node -e "
        const { PrismaClient } = require('@prisma/client');
        const bcrypt = require('bcryptjs');
        const prisma = new PrismaClient();
        (async () => {
          try {
            const hashedPassword = await bcrypt.hash('$ADMIN_PASSWORD', 10);
            const user = await prisma.user.upsert({
              where: { email: '$ADMIN_EMAIL' },
              update: { password: hashedPassword, role: 'ADMIN' },
              create: {
                email: '$ADMIN_EMAIL',
                password: hashedPassword,
                name: 'Admin User',
                role: 'ADMIN'
              }
            });
            console.log('Admin user created/updated:', user.email);
          } catch (e) {
            console.error('Error:', e.message);
            process.exit(1);
          } finally {
            await prisma.`$disconnect();
          }
        })();
        "
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Admin user created/updated" -ForegroundColor Green
            Write-Host "   Waiting 2 seconds for DB to sync..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            # Try login again
            $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
            $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
            if ($csrfLine) {
                $csrf = $csrfLine.Line.Split("`t")[6]
            }
            $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
                -H "Content-Type: application/json" `
                -H "X-CSRF-Token: $csrf" `
                --data "@login-body.json"
            Write-Host "   Login response: $loginResponse" -ForegroundColor Gray
            $loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($loginJson.token) {
                $TOKEN = $loginJson.token
                Write-Host "   ✅ Login successful after user creation" -ForegroundColor Green
            } elseif ($loginJson.error -eq "CONSENT_REQUIRED") {
                Write-Host "   ⚠️  Consent required. Will accept consents..." -ForegroundColor Yellow
                # Will be handled below
            } else {
                Write-Host "   ⚠️  Login still failing: $($loginJson.error)" -ForegroundColor Yellow
            }
        }
    }
} elseif ($loginJson.error -eq "CONSENT_REQUIRED") {
    Write-Host "   ⚠️  Consent required. Accepting consents..." -ForegroundColor Yellow
    
    # Accept consents
    $consentBody = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
        consents = @(
            @{ type = "TERMS"; version = $loginJson.versions.terms },
            @{ type = "PRIVACY"; version = $loginJson.versions.privacy }
        )
    } | ConvertTo-Json -Compress -Depth 10
    $consentBody | Out-File -FilePath "consent-body.json" -Encoding utf8 -NoNewline
    
    # Refresh CSRF
    $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
    $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
    if ($csrfLine) {
        $csrf = $csrfLine.Line.Split("`t")[6]
    }
    
    $consentResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/user/consents/accept-with-auth" `
        -H "Content-Type: application/json" `
        -H "X-CSRF-Token: $csrf" `
        --data "@consent-body.json"
    
    Write-Host "   ✅ Consents accepted" -ForegroundColor Green
    
    # Login again
    $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
    $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
    if ($csrfLine) {
        $csrf = $csrfLine.Line.Split("`t")[6]
    }
    $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
        -H "Content-Type: application/json" `
        -H "X-CSRF-Token: $csrf" `
        --data "@login-body.json"
    $loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($loginJson.token) {
        $TOKEN = $loginJson.token
        Write-Host "   ✅ Login successful after consent" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Login failed: $($loginJson.error)" -ForegroundColor Yellow
    Write-Host "   Creating admin user..." -ForegroundColor Yellow
    
    # Create admin user
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    (async () => {
      try {
        const hashedPassword = await bcrypt.hash('$ADMIN_PASSWORD', 10);
        const user = await prisma.user.upsert({
          where: { email: '$ADMIN_EMAIL' },
          update: { password: hashedPassword, role: 'ADMIN' },
          create: {
            email: '$ADMIN_EMAIL',
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN'
          }
        });
        console.log('Admin user created/updated:', user.email);
      } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
      } finally {
        await prisma.`$disconnect();
      }
    })();
    "
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Admin user created/updated" -ForegroundColor Green
        Write-Host "   Waiting 2 seconds for DB to sync..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        # Try login again
        $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
        $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
        if ($csrfLine) {
            $csrf = $csrfLine.Line.Split("`t")[6]
        }
        $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
            -H "Content-Type: application/json" `
            -H "X-CSRF-Token: $csrf" `
            --data "@login-body.json"
        Write-Host "   Login response: $loginResponse" -ForegroundColor Gray
        $loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($loginJson.token) {
            $TOKEN = $loginJson.token
            Write-Host "   ✅ Login successful after user creation" -ForegroundColor Green
        } elseif ($loginJson.error -eq "CONSENT_REQUIRED") {
            Write-Host "   ⚠️  Consent required. Will accept consents..." -ForegroundColor Yellow
            # Will be handled below
        } else {
            Write-Host "   ⚠️  Login still failing: $($loginJson.error)" -ForegroundColor Yellow
        }
    }
}

# Handle consent requirement if needed
if (-not $TOKEN -and $loginJson.error -eq "CONSENT_REQUIRED") {
    Write-Host ""
    Write-Host "Step 3b: Accepting consents..." -ForegroundColor Yellow
    
    # Accept consents
    $consentBody = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
        consents = @(
            @{ type = "TERMS"; version = $loginJson.versions.terms },
            @{ type = "PRIVACY"; version = $loginJson.versions.privacy }
        )
    } | ConvertTo-Json -Compress -Depth 10
    $consentBody | Out-File -FilePath "consent-body.json" -Encoding utf8 -NoNewline
    
    # Refresh CSRF
    $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
    $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
    if ($csrfLine) {
        $csrf = $csrfLine.Line.Split("`t")[6]
    }
    
    $consentResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/user/consents/accept-with-auth" `
        -H "Content-Type: application/json" `
        -H "X-CSRF-Token: $csrf" `
        --data "@consent-body.json"
    
    Write-Host "   Consent response: $consentResponse" -ForegroundColor Gray
    
    # Login again after consent
    $null = curl.exe -s -c cookies.txt "$BASE_URL/health"
    $csrfLine = Get-Content cookies.txt | Select-String "csrf_token"
    if ($csrfLine) {
        $csrf = $csrfLine.Line.Split("`t")[6]
    }
    $loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "$BASE_URL/api/auth/login" `
        -H "Content-Type: application/json" `
        -H "X-CSRF-Token: $csrf" `
        --data "@login-body.json"
    Write-Host "   Login response after consent: $loginResponse" -ForegroundColor Gray
    $loginJson = $loginResponse | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($loginJson.token) {
        $TOKEN = $loginJson.token
        Write-Host "   ✅ Login successful after consent" -ForegroundColor Green
    }
}
Write-Host ""

# Step 4: Test admin health endpoint
if ($TOKEN) {
    Write-Host "Step 4: Testing admin health endpoint..." -ForegroundColor Yellow
    Write-Host "   Token: $($TOKEN.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host ""
    
    $adminResponse = curl.exe -s -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host $adminResponse
    Write-Host ""
    
    $adminJsonResponse = curl.exe -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/gdpr/health"
    try {
        $adminJson = $adminJsonResponse | ConvertFrom-Json
        Write-Host "JSON Response:" -ForegroundColor Green
        $adminJson | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "Response is not JSON (might be 404 if ENABLE_ADMIN_HEALTH not set): $adminJsonResponse" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Could not obtain token. Cannot test admin endpoint." -ForegroundColor Red
    Write-Host "   Please check:" -ForegroundColor Yellow
    Write-Host "   1. Backend server is running" -ForegroundColor Gray
    Write-Host "   2. Admin user exists with correct password" -ForegroundColor Gray
    Write-Host "   3. Rate limits are cleared (restart backend if needed)" -ForegroundColor Gray
}

# Cleanup
Remove-Item cookies.txt -ErrorAction SilentlyContinue
Remove-Item login-body.json -ErrorAction SilentlyContinue
Remove-Item consent-body.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan

