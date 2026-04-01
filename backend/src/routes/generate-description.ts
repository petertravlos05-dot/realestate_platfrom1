import { Router, Response } from 'express';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { mediumRateLimit } from '../middleware/rateLimit';

const router = Router();

const SYSTEM_PROMPT = `Είσαι ένας κορυφαίος, έμπειρος Real Estate Copywriter στην Ελλάδα.
ΟΔΗΓΙΕΣ:
1. Γράψε φυσικά και ανθρώπινα. ΑΠΑΓΟΡΕΥΟΝΤΑΙ κλισέ εκφράσεις όπως "Αυτό το αξιόλογο ακίνητο", "Ιδανικό για όσους αναζητούν", "Βελτιώνει την καθημερινή ζωή".
2. Ο Τίτλος ΠΡΕΠΕΙ να περιέχει τον Τύπο του ακινήτου (π.χ. Βίλα, Οικόπεδο) και την Τοποθεσία (π.χ. στο Χαλάνδρι).
3. Αν σου δοθούν φωτογραφίες, ΠΕΡΙΓΡΑΨΕ ΑΥΤΟ ΠΟΥ ΒΛΕΠΕΙΣ (π.χ. ξύλινα δάπεδα, κρυφοί φωτισμοί, νησίδα στην κουζίνα, μεγάλα παράθυρα).
4. Δομή JSON: "title", "short_description", "long_description".`;

function buildUserPromptText(payload: {
  propertyType: string;
  location: string;
  sqm: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  condition: string;
  amenities: string[];
  viewTags: string[];
  styleTags: string[];
  locationTags: string[];
  secretWeapon: string;
}): string {
  const amenities = Array.isArray(payload.amenities) ? payload.amenities.join(', ') : '-';
  const viewTags = Array.isArray(payload.viewTags) ? payload.viewTags.join(', ') : '-';
  const styleTags = Array.isArray(payload.styleTags) ? payload.styleTags.join(', ') : '-';
  const locationTags = Array.isArray(payload.locationTags) ? payload.locationTags.join(', ') : '-';

  return `Γράψε την αγγελία για το παρακάτω ακίνητο:
ΤΥΠΟΣ ΑΚΙΝΗΤΟΥ: ${payload.propertyType}
ΤΟΠΟΘΕΣΙΑ: ${payload.location}

--- ΤΕΧΝΙΚΑ ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ---
Εμβαδόν: ${payload.sqm} τ.μ.
Όροφος: ${payload.floor}
Υπνοδωμάτια: ${payload.bedrooms} | Μπάνια: ${payload.bathrooms}
Κατάσταση: ${payload.condition}
Επιπλέον: ${amenities}

--- ΑΙΣΘΗΤΙΚΗ ---
Προσανατολισμός/Θέα: ${viewTags}
Στυλ: ${styleTags}
Κοντά σε: ${locationTags}
Το δυνατό σημείο: "${payload.secretWeapon}"`;
}

/** Parse data URL (data:image/jpeg;base64,...) to { mimeType, data } */
function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const data = match[2];
  if (!data) return null;
  return { mimeType, data };
}

/** Fetch image from URL and return base64 inlineData */
async function fetchImageAsInlineData(url: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const data = buffer.toString('base64');
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim().toLowerCase();
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const finalMime = allowed.includes(mimeType) ? mimeType : 'image/jpeg';
    return { inlineData: { mimeType: finalMime, data } };
  } catch {
    return null;
  }
}

/** Convert photo URL (data URL or http URL) to Gemini Part */
async function urlToPart(url: string): Promise<Part | null> {
  if (!url || typeof url !== 'string') return null;

  const parsed = parseDataUrl(url);
  if (parsed) {
    return {
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    };
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fetchImageAsInlineData(url);
  }

  return null;
}

router.post(
  '/',
  mediumRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('[generate-description] GEMINI_API_KEY is not set');
        return res.status(500).json({
          error: 'Προέκυψε σφάλμα κατά τη δημιουργία της περιγραφής. Η υπηρεσία AI δεν είναι διαθέσιμη.',
        });
      }

      const payload = req.body;

      const userPromptText = buildUserPromptText({
        propertyType: payload.propertyType ?? 'Ακίνητο',
        location: payload.location ?? '-',
        sqm: payload.sqm ?? '-',
        floor: payload.floor ?? '-',
        bedrooms: payload.bedrooms ?? '-',
        bathrooms: payload.bathrooms ?? '-',
        condition: payload.condition ?? '-',
        amenities: payload.amenities ?? [],
        viewTags: payload.viewTags ?? [],
        styleTags: payload.styleTags ?? [],
        locationTags: payload.locationTags ?? [],
        secretWeapon: payload.secretWeapon ?? '(δεν δόθηκε)',
      });

      const parts: Part[] = [{ text: userPromptText }];

      if (payload.photoUrls && Array.isArray(payload.photoUrls) && payload.photoUrls.length > 0) {
        const imagesToProcess = payload.photoUrls.slice(0, 4);
        for (const url of imagesToProcess) {
          const part = await urlToPart(url);
          if (part) parts.push(part);
        }
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent(parts);
      const response = result.response;
      const content = response.text();

      if (!content) {
        return res.status(500).json({
          error: 'Προέκυψε σφάλμα κατά τη δημιουργία της περιγραφής. Η απάντηση του AI ήταν κενή.',
        });
      }

      const parsed = JSON.parse(content) as {
        title?: string;
        short_description?: string;
        long_description?: string;
      };

      return res.json({
        title: parsed.title ?? '',
        short_description: parsed.short_description ?? '',
        long_description: parsed.long_description ?? '',
      });
    } catch (error) {
      console.error('[generate-description] Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        error: 'Προέκυψε σφάλμα κατά τη δημιουργία της περιγραφής',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }
);

export default router;
