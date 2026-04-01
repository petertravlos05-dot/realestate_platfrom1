import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Μετατροπή του αρχείου σε buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Δημιουργία μοναδικού ονόματος αρχείου
    const fileName = `properties/${Date.now()}_${file.name}`;

    // Ανέβασμα στο S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type
    }));

    // DO NOT return direct S3 URL - client must request signed URL via backend /api/files/download-url
    // Return S3 key instead - client will request signed URL separately
    return NextResponse.json({ 
      s3Key: fileName,
      message: 'File uploaded successfully. Use backend /api/files/download-url?key=<s3Key> to get signed URL.'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 