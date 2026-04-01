# Core Security Verification - C1. File Uploads

**Date:** 2025-01-XX  
**Status:** ⚠️ **PARTIAL PASS** (S3 signed URLs not implemented)

---

## C1. File Uploads - VERIFICATION RESULTS

### ✅ C1.1: MIME + Magic Bytes

**Status:** ✅ **PASS**

**Evidence:**

1. **MIME Type Validation** (`backend/src/middleware/file-upload.ts:64-72`):
   ```typescript
   // Check MIME type is allowed
   if (!(allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
     const error = new Error(
       `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
     );
     error.status = 400;
     return cb(error);
   }
   ```

2. **Magic Bytes Validation** (`backend/src/lib/utils/file-validation.ts:64-95, 145-202`):
   ```typescript
   const MAGIC_BYTES: Record<string, number[][]> = {
     'image/jpeg': [[0xFF, 0xD8, 0xFF]],
     'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
     'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
     'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF + WEBP check
     'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
   };

   export function validateMagicBytes(buffer: Buffer, expectedMimeType: string): boolean {
     // Validates file signature matches declared MIME type
   }
   ```

3. **File Validation Middleware** (`backend/src/middleware/file-upload.ts:89-150`):
   ```typescript
   export const validateUploadedFile = (type: FileUploadType = 'image') => {
     return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
       // Validate file using magic bytes
       const validation = await validateFile(
         file.buffer,
         mimetype,
         allowedMimeTypes as readonly string[]
       );

       if (!validation.valid) {
         res.status(400).json({
           error: validation.error || 'File validation failed',
           detectedMimeType: validation.detectedMimeType,
         });
         return;
       }
     };
   };
   ```

4. **File Type Detection** (`backend/src/lib/utils/file-validation.ts:166-173`):
   ```typescript
   // Detect actual MIME type from magic bytes
   let detectedMimeType: string | undefined;
   try {
     const fileType = await fileTypeFromBuffer(buffer);
     detectedMimeType = fileType?.mime;
   } catch (error) {
     // file-type might fail for some files, continue with magic byte check
   }
   ```

5. **Magic Bytes Check** (`backend/src/lib/utils/file-validation.ts:176-184`):
   ```typescript
   // Validate magic bytes match declared MIME type
   const magicBytesValid = validateMagicBytes(buffer, declaredMimeType);

   if (!magicBytesValid) {
     return {
       valid: false,
       error: `File content does not match declared MIME type ${declaredMimeType}. Detected: ${detectedMimeType || 'unknown'}`,
       detectedMimeType,
     };
   }
   ```

**Verification:** ✅ MIME type and magic bytes validation is implemented:
- ✅ MIME type checked against allowed list
- ✅ Magic bytes validated using file signatures
- ✅ File type detection using `file-type` library
- ✅ Mismatch between declared and detected MIME type rejected
- ✅ Special handling for WebP (RIFF + WEBP check)

---

### ✅ C1.2: Forbidden Extensions Blocked

**Status:** ✅ **PASS**

**Evidence:**

1. **Forbidden Extensions List** (`backend/src/lib/utils/file-validation.ts:37-41`):
   ```typescript
   export const FORBIDDEN_EXTENSIONS = [
     '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
     '.sh', '.bash', '.zsh', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb',
     '.pl', '.ps1', '.psm1', '.psd1', '.psc1', '.msi', '.dll', '.so', '.dylib',
   ] as const;
   ```
   **Impact:** Comprehensive list of executable and script file extensions.

2. **Extension Check Function** (`backend/src/lib/utils/file-validation.ts:207-210`):
   ```typescript
   export function hasForbiddenExtension(filename: string): boolean {
     const lowerFilename = filename.toLowerCase();
     return FORBIDDEN_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
   }
   ```

3. **Blocked in Upload Middleware** (`backend/src/middleware/file-upload.ts:51-59`):
   ```typescript
   // Check filename for forbidden extensions
   if (hasForbiddenExtension(file.originalname)) {
     const error = new Error(
       `Forbidden file extension. File appears to be executable or script file.`
     ) as any;
     error.status = 400;
     error.statusCode = 400;
     return cb(error);
   }
   ```

4. **Blocked in Filename Generation** (`backend/src/lib/utils/file-validation.ts:128-134`):
   ```typescript
   // Validate extension is not forbidden
   const forbiddenExt = FORBIDDEN_EXTENSIONS.find(ext => 
     originalFilename.toLowerCase().endsWith(ext)
   );
   
   if (forbiddenExt) {
     throw new Error(`Forbidden file extension: ${forbiddenExt}`);
   }
   ```

**Verification:** ✅ Forbidden extensions are blocked:
- ✅ Comprehensive list of executable/script extensions
- ✅ Checked during upload (multer fileFilter)
- ✅ Checked during filename generation
- ✅ Returns 400 error if forbidden extension detected

---

### ✅ C1.3: Secure Filenames (UUID)

**Status:** ✅ **PASS**

**Evidence:**

1. **Secure Filename Generation** (`backend/src/lib/utils/file-validation.ts:123-140`):
   ```typescript
   export function generateSecureFilename(originalFilename: string, useTimestamp = true): string {
     const { randomUUID } = require('crypto');
     const ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
     
     // Validate extension is not forbidden
     const forbiddenExt = FORBIDDEN_EXTENSIONS.find(ext => 
       originalFilename.toLowerCase().endsWith(ext)
     );
     
     if (forbiddenExt) {
       throw new Error(`Forbidden file extension: ${forbiddenExt}`);
     }

     const uuid = randomUUID();
     const timestamp = useTimestamp ? `${Date.now()}_` : '';
     
     return `${timestamp}${uuid}${ext}`;
   }
   ```
   **Impact:** Generates filenames like `1234567890_550e8400-e29b-41d4-a716-446655440000.jpg`.

2. **Applied in Upload Middleware** (`backend/src/middleware/file-upload.ts:137-140`):
   ```typescript
   // Generate secure filename
   if (file.originalname && typeof file.originalname === 'string') {
     file.filename = generateSecureFilename(file.originalname);
   }
   ```

3. **Used in S3 Upload** (`backend/src/routes/properties.ts:968-970`):
   ```typescript
   // Use secure filename (already generated by middleware)
   const secureFileName = file.filename || file.originalname;
   const s3Key = `${propertyId}/${documentType}/${secureFileName}`;
   ```

4. **Filename Sanitization** (`backend/src/lib/utils/file-validation.ts:100-118`):
   ```typescript
   export function sanitizeFilename(filename: string): string {
     // Remove path separators and dangerous characters
     let sanitized = filename
       .replace(/[\/\\]/g, '_') // Replace path separators
       .replace(/[<>:"|?*\x00-\x1F]/g, '_') // Replace dangerous characters
       .replace(/\.\./g, '_') // Replace parent directory references
       .trim();
     
     // Limit length
     if (sanitized.length > 255) {
       const ext = sanitized.substring(sanitized.lastIndexOf('.'));
       sanitized = sanitized.substring(0, 255 - ext.length) + ext;
     }
     
     return sanitized || 'file';
   }
   ```

**Verification:** ✅ Secure filenames using UUID:
- ✅ UUID generated using `crypto.randomUUID()`
- ✅ Timestamp prefix for uniqueness
- ✅ Original extension preserved (lowercase)
- ✅ Filename sanitization removes dangerous characters
- ✅ Applied before S3 upload

---

### ❌ C1.4: S3 Private Bucket + Signed URLs

**Status:** ❌ **FAIL**

**Evidence:**

1. **Direct URLs Used** (`backend/src/routes/properties.ts:931, 980`):
   ```typescript
   // Line 931: Document listing
   fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`,
   
   // Line 980: Document upload response
   const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
   ```
   **Impact:** Files are accessible via direct URLs without authentication or expiration.

2. **ACL Comment** (`backend/src/routes/properties.ts:977`):
   ```typescript
   // ACL: 'private', // Set to private for sensitive documents
   ```
   **Impact:** Comment indicates intention for private bucket, but ACL is commented out.

3. **No Signed URL Implementation:**
   - ❌ No `getSignedUrl` from `@aws-sdk/s3-request-presigner`
   - ❌ No `GetObjectCommand` for signed URLs
   - ❌ No expiration time set
   - ❌ Files remain accessible indefinitely

4. **Frontend Also Uses Direct URLs** (`listings/frontend/src/app/api/properties/[id]/progress/documents/route.ts:43`):
   ```typescript
   fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`,
   ```

5. **Security Risk:**
   - Files accessible to anyone with URL
   - No expiration on URLs
   - Files remain accessible after user deletion (until S3 cleanup runs)
   - No access control at URL level

**Verification:** ❌ S3 private bucket + signed URLs NOT implemented:
- ❌ Direct URLs used instead of signed URLs
- ❌ No expiration on URLs
- ❌ Files accessible without authentication
- ❌ ACL commented out (not enforced)

**Fix Required:**
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// Generate signed URL with 1-hour expiration
const command = new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: s3Key,
});
const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
```

---

### ⚠️ C1.5: Ownership Enforced (No One Can See Other People's Files)

**Status:** ⚠️ **PARTIAL PASS** (Upload protected, but file access not protected)

**Evidence:**

1. **Upload Protected** (`backend/src/routes/properties.ts:944`):
   ```typescript
   router.post('/:id/progress/documents', optionalAuth, requirePropertyOwnership, uploadDocument.single('file'), validateUploadedFile('document'), async (req: AuthRequest, res: Response) => {
   ```
   **Impact:** Upload endpoint requires property ownership (`requirePropertyOwnership` middleware).

2. **Property Ownership Check** (`backend/src/middleware/authorization.ts:22-57`):
   ```typescript
   export const requirePropertyOwnership = async (
     req: AuthRequest,
     res: Response,
     next: NextFunction
   ): Promise<void> => {
     const result = await checkPropertyOwnership(propertyId, userId);
     
     if (!result.allowed) {
       res.status(403).json({
         error: result.reason || 'You do not have permission to access this property',
       });
       return;
     }
     next();
   };
   ```
   **Impact:** Only property owners can upload files.

3. **File Listing Protected** (`backend/src/routes/properties.ts:898`):
   ```typescript
   router.get('/:id/progress/documents', optionalAuth, async (req: AuthRequest, res: Response) => {
   ```
   **Impact:** File listing endpoint uses `optionalAuth` (not `requirePropertyOwnership`).

4. **No Ownership Check on File Access:**
   - ❌ File listing endpoint doesn't check ownership
   - ❌ Direct URLs don't require authentication
   - ❌ Anyone with URL can access files
   - ❌ No authorization check before generating URLs

5. **S3 Key Structure** (`backend/src/routes/properties.ts:970`):
   ```typescript
   const s3Key = `${propertyId}/${documentType}/${secureFileName}`;
   ```
   **Impact:** S3 keys include `propertyId`, but no authorization check before listing/accessing.

**Verification:** ⚠️ Ownership enforcement is partial:
- ✅ Upload protected (requires property ownership)
- ⚠️ File listing not protected (uses `optionalAuth`, no ownership check)
- ❌ Direct URLs don't require authentication
- ❌ No authorization check before generating URLs

**Fix Required:**
1. Add ownership check to file listing endpoint:
   ```typescript
   router.get('/:id/progress/documents', optionalAuth, requirePropertyOwnership, async (req: AuthRequest, res: Response) => {
   ```

2. Implement signed URLs with ownership check:
   ```typescript
   // Check ownership before generating signed URL
   const ownershipCheck = await checkPropertyOwnership(propertyId, userId);
   if (!ownershipCheck.allowed) {
     return res.status(403).json({ error: 'Access denied' });
   }
   
   // Generate signed URL
   const signedUrl = await getSignedUrl(...);
   ```

---

## Summary

| Requirement | Status | Evidence Location |
|------------|--------|-------------------|
| MIME + magic bytes | ✅ PASS | `file-validation.ts:64-95, 145-202` |
| Forbidden extensions blocked | ✅ PASS | `file-validation.ts:37-41, 207-210` |
| Secure filenames (UUID) | ✅ PASS | `file-validation.ts:123-140` |
| S3 private bucket + signed URLs | ❌ FAIL | `properties.ts:931, 980` (direct URLs) |
| Ownership enforced | ⚠️ PARTIAL | Upload protected, but file access not protected |

---

## ⚠️ VERDICT: PARTIAL PASS (Critical Issues)

**File upload security requirements:**

- ✅ MIME type and magic bytes validation implemented
- ✅ Forbidden extensions blocked
- ✅ Secure filenames using UUID
- ❌ S3 signed URLs NOT implemented (CRITICAL)
- ⚠️ Ownership enforcement partial (upload protected, but file access not protected)

**Blocking Issues:**
1. **CRITICAL:** S3 files accessible via direct URLs (no signed URLs, no expiration)
2. **HIGH:** File listing endpoint doesn't check ownership
3. **HIGH:** No authorization check before generating file URLs

---

## Recommended Fixes

### Fix 1: Implement S3 Signed URLs

**File:** `backend/src/routes/properties.ts`

**Change 1:** Add signed URL generation function
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

async function generateSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
  if (!s3Client || !process.env.AWS_S3_BUCKET) {
    throw new Error('S3 not configured');
  }
  
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}
```

**Change 2:** Replace direct URLs with signed URLs (line 931)
```typescript
// BEFORE:
fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`,

// AFTER:
fileUrl: await generateSignedUrl(obj.Key, 3600), // 1-hour expiration
```

**Change 3:** Replace direct URLs with signed URLs (line 980)
```typescript
// BEFORE:
const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

// AFTER:
const fileUrl = await generateSignedUrl(s3Key, 3600); // 1-hour expiration
```

### Fix 2: Add Ownership Check to File Listing

**File:** `backend/src/routes/properties.ts`

**Change:** Add ownership check to file listing endpoint (line 898)
```typescript
// BEFORE:
router.get('/:id/progress/documents', optionalAuth, async (req: AuthRequest, res: Response) => {

// AFTER:
router.get('/:id/progress/documents', optionalAuth, requirePropertyOwnership, async (req: AuthRequest, res: Response) => {
```

### Fix 3: Ensure S3 Bucket is Private

**AWS S3 Configuration:**
- Set bucket policy to deny public access
- Remove public read ACLs
- Ensure all objects uploaded with `ACL: 'private'` (uncomment line 977)

---

**Next Steps:**
1. **CRITICAL:** Implement signed URLs before production deployment
2. **HIGH:** Add ownership check to file listing endpoint
3. **HIGH:** Verify S3 bucket is private (no public access)
4. **MEDIUM:** Update frontend to use signed URLs from backend API

---

**Full verification report:** `docs/CORE_SECURITY_C1_VERIFICATION.md`


