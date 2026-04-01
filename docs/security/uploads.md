# File Upload Security

## Overview

File uploads are secured through multiple layers:
1. **MIME type validation** - Only allowed MIME types accepted
2. **Magic byte validation** - File content verified against declared type
3. **Forbidden extension blocking** - Executable/script files blocked
4. **Secure filename generation** - UUID-based filenames prevent enumeration
5. **S3 private bucket** - All files stored privately
6. **Signed URL access** - Files accessed via short-lived signed URLs only

## Upload Security

### MIME Type Validation

**Allowed Image Types:**
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

**Allowed Document Types:**
- `application/pdf`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)

**Validation:**
- Declared MIME type checked against allowed list
- File content verified using magic bytes
- Mismatch between declared and detected type rejected

### Magic Byte Validation

**Magic Bytes (File Signatures):**
- JPEG: `0xFF 0xD8 0xFF`
- PNG: `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`
- GIF: `0x47 0x49 0x46 0x38 0x37 0x61` or `0x47 0x49 0x46 0x38 0x39 0x61`
- WebP: `0x52 0x49 0x46 0x46` + "WEBP" check
- PDF: `0x25 0x50 0x44 0x46` (%PDF)

**Validation Process:**
1. File buffer read
2. Magic bytes checked against expected signature
3. File type detection using `file-type` library
4. Mismatch rejected with error message

### Forbidden Extensions

**Blocked Extensions:**
- Executables: `.exe`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.msi`, `.dll`
- Scripts: `.js`, `.vbs`, `.sh`, `.bash`, `.zsh`, `.php`, `.asp`, `.aspx`, `.jsp`, `.py`, `.rb`, `.pl`
- PowerShell: `.ps1`, `.psm1`, `.psd1`, `.psc1`
- Archives: `.jar`
- Libraries: `.so`, `.dylib`

**Validation:**
- Checked during upload (multer fileFilter)
- Checked during filename generation
- Returns 400 error if forbidden extension detected

### Secure Filename Generation

**Format:**
```
{timestamp}_{uuid}.{extension}
```

**Example:**
```
1234567890_550e8400-e29b-41d4-a716-446655440000.jpg
```

**Properties:**
- UUID generated using `crypto.randomUUID()`
- Timestamp prefix for uniqueness
- Original extension preserved (lowercase)
- Filename sanitization removes dangerous characters
- Path separators removed (`/`, `\`)
- Dangerous characters removed (`<`, `>`, `:`, `"`, `|`, `?`, `*`, control chars)

### File Size Limits

**Limits:**
- Images: 10MB (`MAX_IMAGE_SIZE`)
- Documents: 10MB (`MAX_DOCUMENT_SIZE`)
- General: 10MB (`MAX_FILE_SIZE`)

**Validation:**
- Checked during upload (multer limits)
- Checked during magic byte validation
- Returns 400 error if exceeded

## S3 Storage Security

### Private Bucket Configuration

**Requirements:**
- **Block Public Access**: All public access must be blocked
- **ACL**: Objects uploaded without ACL (defaults to private)
- **Bucket Policy**: No policy allowing public `s3:GetObject`

**AWS Console Setup:**
1. S3 bucket → Permissions → Block Public Access
2. Enable **all** public access blocks
3. Verify bucket policy doesn't allow public access

### File Access via Signed URLs

**Access Pattern:**
1. File uploaded → S3 key returned (not direct URL)
2. Client requests signed URL: `GET /api/files/download-url?key=<s3Key>`
3. Authorization check performed
4. If authorized → Signed URL generated (expires in 5 minutes)
5. Client uses signed URL to access file

**See:** [S3 Security Documentation](./s3.md) for detailed signed URL implementation

## Upload Endpoints

### Backend Endpoints

**Property Images:**
- `POST /api/properties/images`
- Requires authentication
- Returns S3 key (not direct URL)

**Property Documents:**
- `POST /api/properties/:id/progress/documents`
- Requires property ownership
- Returns S3 key (not direct URL)

### Frontend Endpoints (Next.js API Routes)

**Note:** Frontend endpoints should be deprecated in favor of backend endpoints for better security.

**Current:**
- `POST /api/properties/images` (Next.js route)
- `POST /api/properties/[id]/progress/documents` (Next.js route)

**Recommendation:** Use backend endpoints instead for:
- Centralized authorization
- Consistent security checks
- Signed URL generation

## Malware Scanning

**Current Status:** Stub implementation

**TODO:**
- Integrate ClamAV (local)
- OR integrate cloud service (AWS GuardDuty, VirusTotal API)
- OR implement file signature database

**Current Behavior:**
- Basic validation (file size, empty file check)
- Always returns `clean: true` (stub)

## Security Checklist

- [x] MIME type validation
- [x] Magic byte validation
- [x] Forbidden extension blocking
- [x] Secure filename generation (UUID)
- [x] File size limits
- [x] S3 private bucket (no public access)
- [x] Signed URL access (no direct URLs)
- [x] Authorization checks before file access
- [ ] Malware scanning (stub - needs implementation)

## Related Documentation

- [S3 Security](./s3.md) - S3 file access and signed URLs
- [File Validation](../CORE_SECURITY_C1_VERIFICATION.md) - Detailed verification report
- [Authorization Matrix](../authz_matrix.md) - Who can upload files


