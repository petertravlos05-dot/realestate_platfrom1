# Setup Guide: Monitoring System

## 1. Environment Variables

### Πού να προσθέσετε:

**Για Development (local):**
- Δημιουργήστε ή επεξεργαστείτε το `backend/.env` file

**Για Production (Render):**
- Πηγαίνετε στο Render Dashboard → Your Service → Environment
- Προσθέστε τα variables εκεί

### Environment Variables που χρειάζονται:

```env
# ============================================
# MONITORING SYSTEM
# ============================================

# Enable monitoring jobs
OPS_MONITOR_ENABLE=true

# Queue monitoring thresholds (minutes)
QUEUE_STUCK_QUEUED_MIN=60
QUEUE_STUCK_PROCESSING_MIN=30
QUEUE_FAILED_ALERT_THRESHOLD=1

# Database monitoring timeout (milliseconds)
DB_TIMEOUT_MS=1500

# Uptime ping configuration
BACKEND_PUBLIC_URL=http://localhost:3001
OPS_PING_TIMEOUT_MS=3000

# Admin health endpoint (must be enabled for /api/admin/ops/health)
ENABLE_ADMIN_HEALTH=true

# ============================================
# SENTRY (Required for alerts)
# ============================================
SENTRY_ENABLE=true
SENTRY_DSN_BACKEND=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

### Quick Setup για Local Testing:

```bash
# Στο backend directory
cd backend

# Αν δεν έχετε .env file, δημιουργήστε το:
cp .env.example .env  # αν υπάρχει
# ή
touch .env

# Προσθέστε αυτές τις γραμμές στο .env:
echo "" >> .env
echo "# Monitoring" >> .env
echo "OPS_MONITOR_ENABLE=true" >> .env
echo "QUEUE_STUCK_QUEUED_MIN=60" >> .env
echo "QUEUE_STUCK_PROCESSING_MIN=30" >> .env
echo "QUEUE_FAILED_ALERT_THRESHOLD=1" >> .env
echo "DB_TIMEOUT_MS=1500" >> .env
echo "BACKEND_PUBLIC_URL=http://localhost:3001" >> .env
echo "OPS_PING_TIMEOUT_MS=3000" >> .env
echo "ENABLE_ADMIN_HEALTH=true" >> .env
```

## 2. Πώς να πάρετε Admin Token

### Μέθοδος 1: Login μέσω API (PowerShell)

```powershell
# 1. Πηγαίνετε στο backend directory
cd backend

# 2. Τρέξτε το script που δημιουργεί admin user και παίρνει token:
powershell -ExecutionPolicy Bypass -File scripts/setup-admin-and-test-health.ps1

# Το script θα:
# - Δημιουργήσει admin user (admin@example.com / AdminPassword123!)
# - Κάνει login
# - Εμφανίσει το token
```

### Μέθοδος 2: Manual Login (PowerShell)

```powershell
# 1. Get CSRF token
curl.exe -s -c cookies.txt http://localhost:3001/health
$csrf = (Get-Content cookies.txt | Select-String "csrf_token").Line.Split("`t")[6]

# 2. Login
$loginBody = @{
    email = "admin@example.com"
    password = "AdminPassword123!"
} | ConvertTo-Json -Compress
$loginBody | Out-File -FilePath "login-body.json" -Encoding utf8 -NoNewline

$loginResponse = curl.exe -s -b cookies.txt -c cookies.txt -X POST "http://localhost:3001/api/auth/login" `
    -H "Content-Type: application/json" `
    -H "X-CSRF-Token: $csrf" `
    --data "@login-body.json"

# 3. Extract token
$loginJson = $loginResponse | ConvertFrom-Json
$TOKEN = $loginJson.token
Write-Host "Token: $TOKEN"
```

### Μέθοδος 3: Create Admin User + Login (Node.js)

```bash
# 1. Δημιουργήστε admin user:
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  try {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    const user = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    console.log('✅ Admin user created/updated:', user.email);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

# 2. Μετά κάντε login μέσω API (βλέπε Μέθοδος 2)
```

### Μέθοδος 4: Login μέσω Frontend

1. Ανοίξτε το frontend: `http://localhost:3004`
2. Κάντε login με admin credentials
3. Ανοίξτε Browser DevTools (F12)
4. Πηγαίνετε στο **Application** → **Cookies**
5. Βρείτε το `token` cookie ή
6. Πηγαίνετε στο **Network** tab → βρείτε login request → copy το token από response

## 3. Quick Test Commands

### Test Public Health:
```bash
curl http://localhost:3001/health
```

### Test Admin Ops Health (με token):
```bash
# Set token variable
TOKEN="your-admin-token-here"

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/ops/health
```

### Test Queue Monitor:
```bash
cd backend
export OPS_MONITOR_ENABLE=true
npm run job:queue-monitor
```

### Test DB Monitor:
```bash
cd backend
export OPS_MONITOR_ENABLE=true
npm run job:db-monitor
```

### Test Uptime Ping:
```bash
cd backend
export BACKEND_PUBLIC_URL=http://localhost:3001
npm run ping:health
```

## 4. Complete Setup Script

Δημιουργήστε `backend/setup-monitoring.sh`:

```bash
#!/bin/bash

echo "🔧 Setting up Monitoring System..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating..."
    touch .env
fi

# Add monitoring variables
echo ""
echo "📝 Adding monitoring variables to .env..."
cat >> .env << EOF

# Monitoring System
OPS_MONITOR_ENABLE=true
QUEUE_STUCK_QUEUED_MIN=60
QUEUE_STUCK_PROCESSING_MIN=30
QUEUE_FAILED_ALERT_THRESHOLD=1
DB_TIMEOUT_MS=1500
BACKEND_PUBLIC_URL=http://localhost:3001
OPS_PING_TIMEOUT_MS=3000
ENABLE_ADMIN_HEALTH=true
EOF

echo "✅ Environment variables added!"
echo ""

# Create admin user
echo "👤 Creating admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  try {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    const user = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    console.log('✅ Admin user ready:', user.email);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Login as admin@example.com / AdminPassword123!"
echo "2. Get token from login response"
echo "3. Test endpoints with: curl -H 'Authorization: Bearer TOKEN' http://localhost:3001/api/admin/ops/health"
```

Τρέξτε:
```bash
chmod +x backend/setup-monitoring.sh
./backend/setup-monitoring.sh
```

## 5. Troubleshooting

### Admin endpoint returns 404:
- Ελέγξτε ότι `ENABLE_ADMIN_HEALTH=true` στο .env
- Restart backend server

### Login fails:
- Ελέγξτε ότι backend server τρέχει
- Ελέγξτε CSRF token
- Ελέγξτε ότι admin user υπάρχει (βλέπε Μέθοδος 3)

### Token not working:
- Ελέγξτε ότι token είναι valid (not expired)
- Ελέγξτε format: `Authorization: Bearer TOKEN`
- Ελέγξτε ότι user έχει role ADMIN ή SUPER_ADMIN



