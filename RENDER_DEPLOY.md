# Render Deployment Guide - Αναλυτικός Οδηγός

Αυτός ο οδηγός εξηγεί αναλυτικά πώς να κάνετε deploy το Real Estate Platform στο Render μέσω GitHub.

## Προαπαιτούμενα

1. **Λογαριασμός στο Render**: Δημιουργήστε λογαριασμό στο [Render.com](https://render.com)
2. **GitHub Repository**: Το project σας πρέπει να είναι στο GitHub (public ή private)
3. **PostgreSQL Database**: Θα δημιουργήσουμε ένα PostgreSQL database στο Render
4. **Environment Variables**: Θα χρειαστείτε τα secrets και keys σας (Stripe, AWS, κτλ.)

---

## Βήμα 0: Δημιουργία GitHub Repository (Αν δεν υπάρχει ήδη)

### 0.1 Δημιουργία Νέου Repository στο GitHub

**Αν δεν έχετε ακόμα repository στο GitHub, ακολουθήστε τα παρακάτω βήματα:**

#### Βήμα 0.1.1: Πρόσβαση στο GitHub

1. Πηγαίνετε στο [GitHub.com](https://github.com)
2. Κάντε **login** με το λογαριασμό σας
3. Αν δεν έχετε λογαριασμό, κάντε **"Sign up"** για να δημιουργήσετε νέο

#### Βήμα 0.1.2: Δημιουργία Νέου Repository

1. Κάντε κλικ στο **"+"** (πάνω δεξιά) → **"New repository"**
   - Ή πηγαίνετε απευθείας στο: [github.com/new](https://github.com/new)

2. **Συμπληρώστε τα στοιχεία:**
   - **Repository name**: `realestate-platform` (ή ό,τι όνομα θέλετε)
     - ⚠️ **Σημαντικό**: Χρησιμοποιήστε **υπογράμμισμα (_)** ή **παύλα (-)** αντί για spaces
     - ✅ **Σωστά**: `realestate-platform`, `realestate_platform`
     - ❌ **Λάθος**: `realestate platform` (με space)
   
   - **Description** (προαιρετικό): "Real Estate Platform - Backend and Frontend"
   
   - **Visibility**:
     - **Public**: Ο καθένας μπορεί να το δει (δωρεάν)
     - **Private**: Μόνο εσείς και οι collaborators (μπορεί να χρειαστεί paid plan)
   
   - **⚠️ ΜΗΝ επιλέξετε:**
     - ❌ "Add a README file" (αν έχετε ήδη code)
     - ❌ "Add .gitignore" (αν έχετε ήδη)
     - ❌ "Choose a license" (μπορείτε να το προσθέσετε αργότερα)

3. Κάντε κλικ στο **"Create repository"**

#### Βήμα 0.1.3: Αντιγραφή Repository URL

Μετά τη δημιουργία, το GitHub θα σας δείξει το URL του repository:
- **HTTPS**: `https://github.com/YOUR_USERNAME/realestate-platform.git`
- **SSH**: `git@github.com:YOUR_USERNAME/realestate-platform.git`

**Αντιγράψτε το HTTPS URL** - θα το χρειαστούμε στο επόμενο βήμα.

---

### 0.2 Αρχικοποίηση Git Repository στο Local Project

**Αν το project σας δεν είναι ήδη git repository:**

#### Βήμα 0.2.1: Άνοιγμα Terminal στο Root Directory

1. Ανοίξτε **PowerShell** ή **Command Prompt**
2. Μεταβείτε στο root directory του project:
   ```powershell
   cd "C:\Users\ptrav\OneDrive\Υπολογιστής\realestate_platform3 ( backend with frontend"
   ```
   
   **Εναλλακτικά**: Ανοίξτε το folder στο File Explorer και κάντε **right-click** → **"Open in Terminal"** ή **"Open PowerShell window here"**

#### Βήμα 0.2.2: Αρχικοποίηση Git Repository

```powershell
# 1. Αρχικοποιήστε το git repository
git init
```

**Αν δείτε**: `Initialized empty Git repository in ...` → ✅ Επιτυχία!

#### Βήμα 0.2.3: Προσθήκη Remote Repository

```powershell
# 2. Προσθέστε το GitHub repository ως remote
git remote add origin https://github.com/YOUR_USERNAME/realestate-platform.git
```

**Αντικαταστήστε:**
- `YOUR_USERNAME` με το GitHub username σας (π.χ. `petertravlos05-dot`)
- `realestate-platform` με το όνομα που δώσατε στο repository

**Παράδειγμα:**
```powershell
git remote add origin https://github.com/petertravlos05-dot/realestate-platform.git
```

**Αν το remote υπάρχει ήδη και θέλετε να το αλλάξετε:**
```powershell
# Διαγράψτε το παλιό remote
git remote remove origin

# Προσθέστε το νέο
git remote add origin https://github.com/YOUR_USERNAME/realestate-platform.git
```

**Ή αλλάξτε το URL:**
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/realestate-platform.git
```

#### Βήμα 0.2.4: Προσθήκη Αρχείων και Commit

```powershell
# 3. Προσθέστε όλα τα αρχεία (εκτός από αυτά στο .gitignore)
git add .
```

**Ελέγξτε τι θα προστεθεί:**
```powershell
git status
```

Θα δείτε όλα τα αρχεία που θα προστεθούν (με πράσινο χρώμα).

```powershell
# 4. Κάντε commit
git commit -m "Initial commit"
```

**Αν χρειαστεί να ορίσετε όνομα και email (πρώτη φορά):**
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Βήμα 0.2.5: Δημιουργία Main Branch και Push

```powershell
# 5. Δημιουργήστε το main branch (αν δεν υπάρχει)
git branch -M main

# 6. Push στο GitHub
git push -u origin main
```

**Αν σας ζητηθεί authentication:**

1. **Username**: Το GitHub username σας
2. **Password**: **Personal Access Token** (όχι το GitHub password!)

**Για να δημιουργήσετε Personal Access Token:**
1. GitHub → **Settings** (προφίλ σας) → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)**
4. **Note**: "Render Deployment" (ή ό,τι θέλετε)
5. **Expiration**: Επιλέξτε διάρκεια (π.χ. 90 days ή No expiration)
6. **Select scopes**: Επιλέξτε **`repo`** (full control of private repositories)
7. Κάντε κλικ **"Generate token"**
8. **Αντιγράψτε το token** (θα το δείτε μόνο μια φορά!)
9. Χρησιμοποιήστε το token ως password

**Αν το push είναι επιτυχές**, θα δείτε:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/YOUR_USERNAME/realestate-platform.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

---

### 0.3 Επαλήθευση Repository

#### Ελέγξτε ότι όλα είναι σωστά:

1. **Πηγαίνετε στο GitHub repository** σας
2. **Ελέγξτε ότι:**
   - ✅ Όλα τα αρχεία είναι εκεί
   - ✅ Το `render.yaml` είναι στο root directory
   - ✅ Το `backend/` folder υπάρχει
   - ✅ Το `listings/frontend/` folder υπάρχει

#### Ελέγξτε το remote URL:

```powershell
git remote -v
```

Θα πρέπει να δείτε:
```
origin  https://github.com/YOUR_USERNAME/realestate-platform.git (fetch)
origin  https://github.com/YOUR_USERNAME/realestate-platform.git (push)
```

---

## Βήμα 1: Προετοιμασία GitHub Repository

### 1.1 Ελέγξτε ότι το `render.yaml` είναι στο root directory

Βεβαιωθείτε ότι το αρχείο `render.yaml` βρίσκεται στο root directory του repository σας (όχι μέσα σε backend ή frontend).

**Ελέγξτε:**
```powershell
Test-Path "render.yaml"
```

Αν επιστρέψει `True`, το αρχείο υπάρχει. Αν επιστρέψει `False`, πρέπει να το δημιουργήσετε ή να το μετακινήσετε.

### 1.2 Commit και Push στο GitHub

**Αν έχετε ήδη repository και θέλετε να προσθέσετε το `render.yaml`:**

```powershell
# 1. Προσθέστε το render.yaml
git add render.yaml

# 2. Κάντε commit
git commit -m "Add Render deployment configuration"

# 3. Push στο GitHub
git push origin main
```

**Αν έχετε άλλα αλλαγμένα αρχεία:**
```powershell
# Προσθέστε όλα τα αρχεία
git add .

# Commit
git commit -m "Update project files"

# Push
git push origin main
```

---

## Βήμα 2: Σύνδεση GitHub με Render - Αναλυτικός Οδηγός

### 2.1 Προετοιμασία GitHub Repository

**Πριν ξεκινήσετε, βεβαιωθείτε ότι:**

1. Το project σας είναι ήδη στο GitHub (public ή private repository)
2. Έχετε πρόσβαση στο repository (είστε owner ή collaborator)
3. Το `render.yaml` είναι committed και pushed στο repository

**Αν δεν έχετε ακόμα το project στο GitHub:**

```bash
# 1. Αρχικοποιήστε git repository (αν δεν υπάρχει ήδη)
git init

# 2. Προσθέστε το remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 3. Προσθέστε όλα τα αρχεία
git add .

# 4. Κάντε commit
git commit -m "Initial commit"

# 5. Push στο GitHub
git push -u origin main
```

**Σημείωση**: Αν το repository είναι private, θα χρειαστεί να δώσετε πρόσβαση στο Render.

---

### 2.2 Σύνδεση GitHub Account με Render

#### Βήμα 2.2.1: Πρόσβαση στο Render Dashboard

1. Πηγαίνετε στο [Render Dashboard](https://dashboard.render.com)
2. Κάντε login με το λογαριασμό σας (ή δημιουργήστε νέο)
3. Θα βρεθείτε στο main dashboard

#### Βήμα 2.2.2: Εκκίνηση Blueprint Deploy

1. Κάντε κλικ στο κουμπί **"New +"** (συνήθως πάνω δεξιά)
2. Από το dropdown menu, επιλέξτε **"Blueprint"**
3. Θα ανοίξει μια νέα σελίδα για το Blueprint setup

#### Βήμα 2.2.3: Σύνδεση GitHub Account

**Πρώτη φορά (αν δεν έχετε συνδέσει GitHub):**

1. Θα δείτε ένα κουμπί **"Connect GitHub"** ή **"Connect account"**
2. Κάντε κλικ στο **"Connect GitHub"**
3. Θα μεταφερθείτε στο GitHub για authorization:
   - **GitHub Login**: Αν δεν είστε logged in, θα σας ζητηθεί να κάνετε login
   - **Authorize Render**: Το GitHub θα σας ρωτήσει αν θέλετε να επιτρέψετε στο Render να έχει πρόσβαση στα repositories σας
   - **Permissions**: Το Render θα ζητήσει:
     - Access to repositories (για να διαβάσει το code)
     - Webhook access (για auto-deploy όταν push-άρετε)
     - Metadata access (για να δει τα repositories σας)
4. Κάντε κλικ στο **"Authorize Render"** ή **"Install"**
5. Θα μεταφερθείτε πίσω στο Render dashboard

**Αν έχετε ήδη συνδέσει GitHub:**

- Θα δείτε τα repositories σας αμέσως
- Αν δεν βλέπετε το repository, κάντε κλικ στο **"Configure account"** για να ελέγξετε τις permissions

---

### 2.3 Επιλογή Repository

#### Βήμα 2.3.1: Εύρεση Repository

1. Μετά τη σύνδεση, θα δείτε μια λίστα με τα repositories σας
2. Μπορείτε να:
   - **Αναζητήσετε** το repository με το όνομα του
   - **Φιλτράρετε** ανά organization (αν έχετε)
   - **Επιλέξετε** αν θέλετε μόνο public ή private repositories

#### Βήμα 2.3.2: Επιλογή Repository

1. Βρείτε το repository που περιέχει το project σας
2. Κάντε κλικ στο repository
3. Το Render θα ελέγξει αν υπάρχει `render.yaml` στο root directory

**Σημαντικό**: Αν δεν βλέπετε το repository:
- Ελέγξτε ότι το repository είναι visible στο GitHub
- Ελέγξτε ότι έχετε δώσει τις σωστές permissions στο Render
- Αν το repository είναι σε organization, βεβαιωθείτε ότι η organization έχει επιτρέψει το Render

---

### 2.4 Επιλογή Branch

#### Βήμα 2.4.1: Branch Selection

1. Μετά την επιλογή repository, θα σας ζητηθεί να επιλέξετε **Branch**
2. Συνήθως θα δείτε:
   - `main` (πιο συνηθισμένο)
   - `master` (παλιότερα repositories)
   - Άλλα branches (αν έχετε)

3. **Επιλέξτε το branch** που περιέχει το `render.yaml` και το latest code

**Συνιστάται**: Χρησιμοποιήστε το `main` branch για production

#### Βήμα 2.4.2: Blueprint Preview

Μετά την επιλογή branch, το Render θα:
1. **Διαβάσει** το `render.yaml` file
2. **Εμφανίσει** μια προεπισκόπηση των services που θα δημιουργηθούν:
   - `realestate-backend` (Web Service)
   - `realestate-frontend` (Web Service)
3. **Εμφανίσει** τα environment variables που χρειάζονται (με `sync: false`)

---

### 2.5 Ολοκλήρωση Σύνδεσης

#### Βήμα 2.5.1: Review Configuration

Πριν κάνετε deploy, ελέγξτε:

- ✅ Το repository είναι σωστό
- ✅ Το branch είναι σωστό
- ✅ Τα services που θα δημιουργηθούν είναι σωστά
- ✅ Το `render.yaml` έχει διαβαστεί σωστά

#### Βήμα 2.5.2: Apply Blueprint

1. Κάντε κλικ στο **"Apply"** button
2. Το Render θα:
   - Δημιουργήσει τα services
   - Ξεκινήσει το πρώτο build
   - Εμφανίσει τα services στο dashboard σας

**Σημείωση**: Το πρώτο build μπορεί να αποτύχει επειδή δεν έχετε ορίσει ακόμα τα environment variables. Αυτό είναι φυσιολογικό!

---

### 2.6 Επαλήθευση Σύνδεσης

#### Μετά το Deploy:

1. Πηγαίνετε στο **Dashboard** του Render
2. Θα δείτε τα δύο services:
   - `realestate-backend`
   - `realestate-frontend`
3. Κάθε service θα έχει:
   - **Status**: "Build failed" ή "Live" (ανάλογα με τα environment variables)
   - **URL**: Το URL του service
   - **GitHub**: Ένα link που δείχνει το connected repository

#### Auto-Deploy Setup:

Από προεπιλογή, το Render είναι ρυθμισμένο για **auto-deploy**:
- Όταν push-άρετε στο connected branch, το Render θα κάνει auto-deploy
- Μπορείτε να το απενεργοποιήσετε από **Settings** → **Auto-Deploy**

---

### 2.7 Troubleshooting Σύνδεσης GitHub

#### Πρόβλημα: "Repository not found"

**Λύσεις:**
- Ελέγξτε ότι το repository υπάρχει στο GitHub
- Ελέγξτε ότι έχετε πρόσβαση στο repository
- Αν το repository είναι private, βεβαιωθείτε ότι το Render έχει πρόσβαση

#### Πρόβλημα: "render.yaml not found"

**Λύσεις:**
- Ελέγξτε ότι το `render.yaml` είναι στο **root directory** (όχι σε subdirectory)
- Ελέγξτε ότι το `render.yaml` είναι committed και pushed
- Ελέγξτε ότι είστε στο σωστό branch

#### Πρόβλημα: "Permission denied"

**Λύσεις:**
- Πηγαίνετε στο GitHub → **Settings** → **Applications** → **Authorized OAuth Apps**
- Βρείτε το Render και ελέγξτε τις permissions
- Αν χρειάζεται, κάντε **Revoke** και **Re-authorize**

#### Πρόβλημα: "Cannot connect to GitHub"

**Λύσεις:**
- Ελέγξτε το internet connection σας
- Δοκιμάστε να refresh τη σελίδα
- Κάντε logout και login ξανά στο Render
- Ελέγξτε αν υπάρχουν issues με το GitHub API

---

### 2.8 Manual Service Connection (Εναλλακτική)

Αν προτιμάτε να συνδέσετε κάθε service ξεχωριστά (χωρίς Blueprint):

#### Backend Service:

1. **"New"** → **"Web Service"**
2. Κάντε κλικ στο **"Connect GitHub"**
3. Επιλέξτε το repository
4. Συμπληρώστε:
   - **Name**: `realestate-backend`
   - **Branch**: `main`
   - **Root Directory**: (αφήστε κενό)
   - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `cd backend && npm start`

#### Frontend Service:

1. **"New"** → **"Web Service"**
2. Κάντε κλικ στο **"Connect GitHub"**
3. Επιλέξτε το **ίδιο** repository
4. Συμπληρώστε:
   - **Name**: `realestate-frontend`
   - **Branch**: `main`
   - **Root Directory**: (αφήστε κενό)
   - **Build Command**: `cd listings/frontend && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd listings/frontend && npm start`

---

## Βήμα 3: Δημιουργία PostgreSQL Database

### 3.1 Δημιουργία Database

1. Στο Render Dashboard, κάντε κλικ στο **"New"** → **"PostgreSQL"**
2. Συμπληρώστε:
   - **Name**: `realestate-database` (ή ό,τι θέλετε)
   - **Database**: `realestate` (ή ό,τι θέλετε)
   - **User**: Θα δημιουργηθεί αυτόματα
   - **Region**: Επιλέξτε την πλησιέστερη περιοχή
   - **Plan**: Επιλέξτε το plan (Starter plan είναι δωρεάν)
3. Κάντε κλικ στο **"Create Database"**

### 3.2 Αντιγραφή Connection String

1. Αφού δημιουργηθεί το database, πηγαίνετε στις **"Connections"**
2. Αντιγράψτε το **"Internal Database URL"** (θα το χρησιμοποιήσουμε ως `DATABASE_URL`)

**Σημείωση**: Το Internal Database URL είναι για services μέσα στο Render. Αν χρειάζεστε external access, χρησιμοποιήστε το "External Database URL".

---

## Βήμα 4: Deploy με Blueprint (render.yaml)

### 4.1 Εκκίνηση Blueprint Deploy

1. Αφού συνδέσετε το GitHub repository, το Render θα διαβάσει το `render.yaml`
2. Θα δείτε μια προεπισκόπηση των services που θα δημιουργηθούν:
   - `realestate-backend` (Web Service)
   - `realestate-frontend` (Web Service)
3. Κάντε κλικ στο **"Apply"**

### 4.2 Ρύθμιση Environment Variables

Το Render θα δημιουργήσει τα services, αλλά θα χρειαστεί να ορίσετε τα environment variables. Θα πρέπει να τα προσθέσετε **μετά** το πρώτο deploy (θα δείτε build errors).

---

## Βήμα 5: Ρύθμιση Environment Variables

### 5.1 Backend Service Environment Variables

Πηγαίνετε στο service `realestate-backend` → **"Environment"** → **"Add Environment Variable"**:

| Variable | Value | Σημειώσεις |
|----------|-------|------------|
| `NODE_ENV` | `production` | - |
| `DATABASE_URL` | `postgresql://...` | Το Internal Database URL από το βήμα 3.2 |
| `JWT_SECRET` | `[generate]` | Δημιουργήστε με: `openssl rand -base64 32` |
| `FRONTEND_URL` | `https://realestate-frontend.onrender.com` | **⚠️ ΑΠΑΡΑΙΤΗΤΟ** - URL του frontend service (με https://) |
| `STRIPE_SECRET_KEY` | `sk_live_...` ή `sk_test_...` | Από το Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Από το Stripe Dashboard |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Από το AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | `...` | Από το AWS IAM |
| `AWS_REGION` | `us-east-1` | Η περιοχή του S3 bucket σας |
| `AWS_S3_BUCKET_NAME` | `your-bucket-name` | Το όνομα του S3 bucket σας |

### 5.2 Frontend Service Environment Variables

**⚠️ ΚΡΙΣΙΜΟ**: Το `NEXT_PUBLIC_API_URL` είναι **ΑΠΑΡΑΙΤΗΤΟ** - χωρίς αυτό το frontend δεν θα μπορεί να συνδεθεί με το backend και θα δείτε errors στο browser console!

Πηγαίνετε στο service `realestate-frontend` → **"Environment"** → **"Add Environment Variable"**:

| Variable | Value | Σημειώσεις |
|----------|-------|------------|
| `NODE_ENV` | `production` | - |
| `NEXTAUTH_URL` | `https://realestate-frontend.onrender.com` | Θα το αλλάξετε μετά το deploy |
| `NEXTAUTH_SECRET` | `[generate]` | Δημιουργήστε με: `openssl rand -base64 32` |
| `DATABASE_URL` | `postgresql://...` | **Το ίδιο** με το backend |
| `NEXT_PUBLIC_API_URL` | `https://realestate-backend.onrender.com` | **⚠️ ΑΠΑΡΑΙΤΗΤΟ** - URL του backend service (με https://) |
| `JWT_SECRET` | `[same as backend]` | **Το ίδιο** με το backend |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` ή `pk_test_...` | Από το Stripe Dashboard |
| `STRIPE_SECRET_KEY` | `sk_live_...` ή `sk_test_...` | Από το Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Από το Stripe Dashboard |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Από το AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | `...` | Από το AWS IAM |
| `AWS_REGION` | `us-east-1` | Η περιοχή του S3 bucket σας |
| `AWS_S3_BUCKET_NAME` | `your-bucket-name` | Το όνομα του S3 bucket σας |

### 5.3 Δημιουργία Secrets

Για να δημιουργήσετε τα secrets (JWT_SECRET, NEXTAUTH_SECRET):

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

---

## Βήμα 6: Manual Deploy (Εναλλακτική Μέθοδος)

Αν προτιμάτε να κάνετε manual deploy αντί για Blueprint:

### 6.1 Backend Service

1. **"New"** → **"Web Service"**
2. **Connect GitHub repository** (επιλέξτε το repository σας)
3. **Configure:**
   - **Name**: `realestate-backend`
   - **Environment**: `Node`
   - **Region**: Επιλέξτε την περιοχή σας
   - **Branch**: `main` (ή το branch σας)
   - **Root Directory**: (αφήστε κενό - το root είναι το root directory)
   - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Health Check Path**: `/health`
   - **Plan**: Επιλέξτε το plan (Starter είναι δωρεάν)
4. Προσθέστε όλα τα **environment variables** από το 5.1
5. Κάντε κλικ στο **"Create Web Service"**

### 6.2 Frontend Service

1. **"New"** → **"Web Service"**
2. **Connect GitHub repository** (το ίδιο repository)
3. **Configure:**
   - **Name**: `realestate-frontend`
   - **Environment**: `Node`
   - **Region**: Η ίδια περιοχή με το backend
   - **Branch**: `main` (ή το branch σας)
   - **Root Directory**: (αφήστε κενό)
   - **Build Command**: `cd listings/frontend && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd listings/frontend && npm start`
   - **Plan**: Επιλέξτε το plan
4. Προσθέστε όλα τα **environment variables** από το 5.2
5. Κάντε κλικ στο **"Create Web Service"**

---

## Βήμα 7: Ενημέρωση URLs μετά το Deploy

### 7.1 Αντιγραφή URLs

Μετά το deploy, κάθε service θα έχει ένα URL:
- Backend: `https://realestate-backend.onrender.com` (ή το όνομα που δώσατε)
- Frontend: `https://realestate-frontend.onrender.com` (ή το όνομα που δώσατε)

### 7.2 Ενημέρωση Environment Variables

1. **Backend Service**:
   - Ενημερώστε το `FRONTEND_URL` με το URL του frontend

2. **Frontend Service**:
   - Ενημερώστε το `NEXTAUTH_URL` με το URL του frontend
   - Ενημερώστε το `NEXT_PUBLIC_API_URL` με το URL του backend

3. **Redeploy**: Μετά από κάθε αλλαγή environment variable, το Render θα κάνει auto-redeploy

---

## Βήμα 8: Επαλήθευση Deploy

### 8.1 Έλεγχος Backend

1. Πηγαίνετε στο backend service → **"Logs"**
2. Ελέγξτε ότι δεν υπάρχουν errors
3. Ελέγξτε το health check: `https://realestate-backend.onrender.com/health`
4. Θα πρέπει να δείτε μια επιτυχημένη απάντηση

### 8.2 Έλεγχος Frontend

1. Πηγαίνετε στο frontend service → **"Logs"**
2. Ελέγξτε ότι το build ήταν επιτυχημένο
3. Ανοίξτε το URL του frontend στον browser
4. Ελέγξτε ότι φορτώνει σωστά

### 8.3 Έλεγχος Database Connection

1. Ελέγξτε τα logs του backend για database connection errors
2. Αν υπάρχουν errors, ελέγξτε ότι το `DATABASE_URL` είναι σωστό
3. Ελέγξτε ότι οι migrations τρέξανε (`npx prisma migrate deploy`)

---

## Βήμα 9: Stripe Webhooks (Εάν χρησιμοποιείτε)

### 9.1 Ρύθμιση Webhook στο Stripe

1. Πηγαίνετε στο [Stripe Dashboard](https://dashboard.stripe.com) → **"Developers"** → **"Webhooks"**
2. Κάντε κλικ στο **"Add endpoint"**
3. **Endpoint URL**: `https://realestate-backend.onrender.com/api/stripe/webhook`
4. Επιλέξτε τα events που θέλετε
5. Αντιγράψτε το **"Signing secret"** (ξεκινάει με `whsec_`)
6. Προσθέστε το στο `STRIPE_WEBHOOK_SECRET` environment variable

---

## Σημαντικές Σημειώσεις

### Project Structure

Το Render αναμένει την ακόλουθη δομή:
```
repository-root/
├── render.yaml          (στο root)
├── backend/             (backend code)
│   ├── package.json
│   ├── src/
│   └── prisma/
└── listings/
    └── frontend/        (frontend code)
        ├── package.json
        ├── src/
        └── prisma/
```

### Build Commands

- **Backend**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Frontend**: `cd listings/frontend && npm install && npx prisma generate && npm run build`

### Start Commands

- **Backend**: `cd backend && npm start`
- **Frontend**: `cd listings/frontend && npm start`

### Cold Starts

Το Render starter plan έχει **cold starts**. Αυτό σημαίνει ότι:
- Αν το service δεν έχει χρησιμοποιηθεί για 15 λεπτά, "κοιμάται"
- Το πρώτο request μετά το sleep μπορεί να πάρει 30-60 δευτερόλεπτα
- Για production, σκεφτείτε upgrade σε higher tier plan

### Auto-Deploy

Από προεπιλογή, το Render κάνει **auto-deploy** όταν push-άρετε στο connected branch. Μπορείτε να το απενεργοποιήσετε από τις **"Settings"** του service.

### Environment Variables Sync

Στο `render.yaml`, τα environment variables έχουν `sync: false`, που σημαίνει ότι πρέπει να τα ορίσετε manually στο Render dashboard.

### 5. Post-Deploy

Μετά το deploy:

1. Ελέγξτε ότι και τα δύο services είναι "Live"
2. Ελέγξτε το health check endpoint: `https://realestate-backend.onrender.com/health`
3. Ελέγξτε ότι το frontend μπορεί να συνδεθεί με το backend
4. Ελέγξτε τα Stripe webhooks (αν χρησιμοποιείτε)

## Troubleshooting

### Build Fails

- Ελέγξτε τα logs στο Render dashboard
- Βεβαιωθείτε ότι όλα τα environment variables είναι ορισμένα
- Ελέγξτε ότι το DATABASE_URL είναι σωστό

### Database Connection Issues

- Ελέγξτε ότι το database είναι "Available" στο Render
- Ελέγξτε ότι το DATABASE_URL είναι σωστό
- Ελέγξτε ότι οι migrations έχουν τρέξει (`npx prisma migrate deploy`)

### Database Tables Missing (P2021 Error)

**Αν βλέπετε error: `The table 'public.users' does not exist in the current database`:**

Αυτό σημαίνει ότι το database δεν έχει τα tables. Το `render.yaml` χρησιμοποιεί `prisma db push` για να δημιουργήσει τα tables από το schema.

**⚠️ Βήμα 1: Ελέγξτε το DATABASE_URL**

1. Πηγαίνετε στο Render dashboard → **Backend service** → **Environment**
2. Βεβαιωθείτε ότι το `DATABASE_URL` είναι set και σωστό
3. Το value πρέπει να είναι το **Internal Database URL** από το PostgreSQL database service
4. Αν λείπει ή είναι λάθος, προσθέστε/διορθώστε το και **Save Changes**

**🔄 Βήμα 2: Automatic Database Setup**

Το `render.yaml` έχει `prisma db push` στο **start command**, οπότε θα τρέξει αυτόματα κάθε φορά που ξεκινάει το service.

**Αν το error εξακολουθεί να εμφανίζεται:**

1. **Redeploy** το backend service:
   - Backend service → **Manual Deploy** → **Deploy latest commit**
   - Ή κάντε push νέο commit στο GitHub

2. **Ελέγξτε τα logs** κατά το start:
   - Backend service → **Logs**
   - Ψάξτε για "Running prisma db push" ή "All models are now in sync"
   - Αν βλέπετε errors, δείτε παρακάτω

**🔧 Βήμα 3: Manual Database Setup (Αν το automatic δεν λειτουργεί)**

Αν το automatic δεν λειτουργεί, κάντε manual push:

1. **Πηγαίνετε στο Render Shell**:
   - Render dashboard → **Backend service** → **Shell** tab
   - Ή πηγαίνετε στο service → **Settings** → **Shell**

2. **Εκτελέστε**:
   ```bash
   cd backend
   npx prisma db push
   ```

3. **Ελέγξτε το output**: Θα πρέπει να δείτε "All models are now in sync"

4. **Redeploy** το backend service (για να βεβαιωθείτε ότι όλα είναι OK)

**📝 Βήμα 4: Με Migrations (Για Production - Προαιρετικό)**

Αν θέλετε να χρησιμοποιήσετε migrations αντί για `db push`:

1. **Τοπικά**, δημιουργήστε migrations:
   ```powershell
   cd backend
   npx prisma migrate dev --name init
   ```

2. **Commit και push**:
   ```powershell
   git add backend/prisma/migrations
   git commit -m "Add Prisma migrations"
   git push origin main
   ```

3. **Στο `render.yaml`**, αλλάξτε το build command:
   ```yaml
   buildCommand: cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

4. **Redeploy** το backend service

### Frontend Cannot Connect to Backend

- **Ελέγξτε ότι το `NEXT_PUBLIC_API_URL` είναι set** στο Render dashboard
  - Πηγαίνετε στο frontend service → **Environment** → Ελέγξτε ότι υπάρχει `NEXT_PUBLIC_API_URL`
  - Το value πρέπει να είναι: `https://realestate-backend.onrender.com` (με https://)
  - **Αν λείπει**, προσθέστε το και κάντε **Manual Deploy** ή **Redeploy**
- Ελέγξτε ότι το `FRONTEND_URL` στο backend είναι σωστό
- Ελέγξτε τα CORS settings στο backend

### 404 Not Found στο Backend Endpoints

**Αν βλέπετε 404 στο `/api/auth/register` ή άλλα backend endpoints:**

1. **Ελέγξτε ότι το backend service είναι "Live"**:
   - Πηγαίνετε στο Render dashboard → Backend service
   - Ελέγξτε ότι το status είναι **"Live"** (όχι "Build failed" ή "Stopped")

2. **Ελέγξτε το `FRONTEND_URL` στο backend**:
   - Backend service → **Environment**
   - Βεβαιωθείτε ότι το `FRONTEND_URL` είναι set
   - Value: `https://realestate-frontend.onrender.com` (το URL του frontend σας)
   - **Αν λείπει**, προσθέστε το και κάντε **Redeploy**

3. **Ελέγξτε τα Backend Logs**:
   - Backend service → **Logs**
   - Ψάξτε για errors όπως "Route not found" ή CORS errors
   - Ελέγξτε ότι το server έχει start-άρει σωστά

4. **Test το Backend Health Check**:
   - Ανοίξτε: `https://realestate-backend.onrender.com/health`
   - Θα πρέπει να δείτε: `{"status":"ok","timestamp":"..."}`
   - Αν δεν λειτουργεί, το backend δεν είναι deployed σωστά

### 401 Unauthorized στο /api/auth/token

Αυτό είναι **φυσιολογικό** όταν ο χρήστης δεν είναι logged in. Το endpoint `/api/auth/token` χρειάζεται NextAuth session.

**Αν βλέπετε 401 κατά την εγγραφή:**
- Ελέγξτε ότι το `NEXTAUTH_URL` είναι σωστό
- Ελέγξτε ότι το `NEXTAUTH_SECRET` είναι set
- Ελέγξτε ότι το `DATABASE_URL` είναι σωστό (το NextAuth χρειάζεται database)

### Network Errors - localhost:3001 ή ERR_CONNECTION_REFUSED

**Αν βλέπετε errors όπως:**
- `POST http://localhost:3001/api/auth/register net::ERR_CONNECTION_REFUSED`
- `GET http://localhost:3001/api/notifications net::ERR_CONNECTION_REFUSED`
- `POST http://127.0.0.1:7243/ingest/... net::ERR_CONNECTION_REFUSED`

**Αυτό σημαίνει ότι το `NEXT_PUBLIC_API_URL` δεν είναι set ή είναι λάθος!**

#### Βήμα-βήμα Λύση:

**1. Ελέγξτε το `NEXT_PUBLIC_API_URL` στο Render:**

1. Πηγαίνετε στο [Render Dashboard](https://dashboard.render.com)
2. Επιλέξτε το **frontend service** (π.χ. `realestate-frontend`)
3. Κάντε κλικ στο **"Environment"** (αριστερά στο menu)
4. Ελέγξτε αν υπάρχει `NEXT_PUBLIC_API_URL`:
   - **Αν λείπει**: Προσθέστε το (βλέπε βήμα 2)
   - **Αν υπάρχει**: Ελέγξτε ότι το value είναι σωστό

**2. Προσθέστε/Ενημερώστε το `NEXT_PUBLIC_API_URL`:**

1. Στο **"Environment"** tab, κάντε κλικ **"Add Environment Variable"**
2. Συμπληρώστε:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://realestate-backend.onrender.com` (ή το URL του backend σας)
     - ⚠️ **Σημαντικό**: Χρησιμοποιήστε **https://** (όχι http://)
     - ⚠️ **Σημαντικό**: Χωρίς trailing slash (όχι `https://.../`)
     - ✅ **Σωστό**: `https://realestate-backend.onrender.com`
     - ❌ **Λάθος**: `http://localhost:3001`
     - ❌ **Λάθος**: `https://realestate-backend.onrender.com/`
3. Κάντε κλικ **"Save Changes"**

**3. Redeploy το Frontend:**

Μετά την προσθήκη/αλλαγή του environment variable:

1. Πηγαίνετε στο **"Events"** tab (ή **"Manual Deploy"**)
2. Κάντε κλικ **"Manual Deploy"** → **"Deploy latest commit"**
3. Περιμένετε να ολοκληρωθεί το deploy (2-5 λεπτά)
4. Ελέγξτε τα **"Logs"** για errors

**4. Clear Browser Cache:**

Μετά το redeploy:

1. **Hard Refresh**: `Ctrl+Shift+R` (Windows) ή `Cmd+Shift+R` (Mac)
2. **Ή Clear Cache**:
   - `Ctrl+Shift+Delete` (Windows) ή `Cmd+Shift+Delete` (Mac)
   - Επιλέξτε "Cached images and files"
   - Κάντε **"Clear data"**
3. **Ή Incognito/Private Window**: Ανοίξτε το site σε incognito window

**5. Επαλήθευση:**

1. Ανοίξτε το browser console (F12)
2. Ελέγξτε ότι δεν υπάρχουν errors για `localhost:3001`
3. Προσπαθήστε να κάνετε register/login
4. Ελέγξτε τα Network requests - θα πρέπει να δείτε requests στο backend URL (όχι localhost)

**Αν τα errors συνεχίζονται:**

- Ελέγξτε τα **Logs** του frontend service στο Render
- Ελέγξτε ότι το backend service είναι **"Live"**
- Ελέγξτε ότι το backend URL είναι σωστό (πηγαίνετε στο backend service → **"Settings"** → δείτε το **"URL"**)

## Notes

- Το Render starter plan έχει cold starts, οπότε το πρώτο request μπορεί να πάρει λίγο χρόνο
- Για production, σκεφτείτε να χρησιμοποιήσετε higher tier plans
- Βεβαιωθείτε ότι τα secrets είναι secure και δεν είναι committed στο repository

