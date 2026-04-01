# How to Generate a Secure JWT_SECRET

## Quick Method (Node.js)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This will output a secure 44-character base64-encoded secret.

## Alternative Methods

### Using OpenSSL
```bash
openssl rand -base64 32
```

### Using PowerShell (Windows)
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Using Python
```python
import secrets
print(secrets.token_urlsafe(32))
```

## Requirements

- **Minimum length:** 32 characters
- **Recommended:** 44+ characters (base64-encoded 32 bytes)
- **Format:** Any alphanumeric string with special characters

## Example Output

```
S87qwNWmsGswj5DHRIKDN2YmvVVtEC+icI8YZJ7U5XY=
```

## Update Your .env File

After generating a secret, add it to your `backend/.env` file:

```env
JWT_SECRET=S87qwNWmsGswj5DHRIKDN2YmvVVtEC+icI8YZJ7U5XY=
```

**Important:** 
- Never commit `.env` files to version control
- Use different secrets for development, staging, and production
- Keep secrets secure and rotate them periodically





