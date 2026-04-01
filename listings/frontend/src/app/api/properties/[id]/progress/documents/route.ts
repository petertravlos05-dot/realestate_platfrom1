import { NextResponse } from 'next/server';
import { ListObjectsV2Command, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params;
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET!,
      Prefix: `${propertyId}/`,
    });
    const data = await s3.send(command);
    const contents = data.Contents || [];
    const documents = contents
      .filter((obj) => obj.Key && !obj.Key.endsWith('/'))
      .map((obj) => {
        // Εξαγωγή τύπου εγγράφου από το key
        let type = '';
        if (obj.Key) {
          // Υποστηρίζει και Windows και Unix path separator
          const match = obj.Key.match(/^[^/]+[\\/]([^/\\]+)[\\/]/) || obj.Key.match(/^[^/]+\/([^/]+)\//) || obj.Key.match(/^[^/]+\/([^/]+)\//);
          if (match) {
            type = match[1];
          } else {
            // Fallback: πάρε το δεύτερο κομμάτι μετά το propertyId
            const parts = obj.Key.split(/[\\/]/);
            if (parts.length > 1) type = parts[1];
          }
        }
        return {
          key: obj.Key,
          type,
          status: 'uploaded',
          uploadedAt: obj.LastModified,
          // DO NOT return direct S3 URL - client must request signed URL via backend /api/files/download-url
          // Frontend should call backend API to get signed URLs
          size: obj.Size,
        };
      });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά την ανάκτηση των εγγράφων από το S3' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params;
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    // Διαβάζουμε το multipart form
    const formData = await request.formData();
    const file = formData.get('file');
    const documentType = formData.get('documentType');
    if (!file || typeof documentType !== 'string') {
      return NextResponse.json({ error: 'Λείπει το αρχείο ή ο τύπος εγγράφου' }, { status: 400 });
    }

    // Παίρνουμε το όνομα του αρχείου
    const fileName = (file as File).name;
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ορίζουμε το path στο S3
    const s3Key = `${propertyId}/${documentType}/${Date.now()}_${fileName}`;

    // Ανεβάζουμε το αρχείο στο S3
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: buffer,
      ContentType: (file as File).type,
    }));

    // DO NOT return direct S3 URL - client must request signed URL via backend /api/files/download-url
    // Return S3 key instead - client will request signed URL separately
    return NextResponse.json({ 
      success: true, 
      s3Key,
      message: 'File uploaded successfully. Use backend /api/files/download-url?key=<s3Key> to get signed URL.'
    });
  } catch (error) {
    console.error('Error uploading document to S3:', error);
    return NextResponse.json({ error: 'Σφάλμα κατά το ανέβασμα στο S3' }, { status: 500 });
  }
} 