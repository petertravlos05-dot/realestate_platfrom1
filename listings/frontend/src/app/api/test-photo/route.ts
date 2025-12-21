import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    
    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
    await mkdir(uploadsDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `test_${timestamp}_${photo.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Convert file to buffer and save
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);
    
    // Generate URL for the saved file
    const fileUrl = `/uploads/properties/${fileName}`;
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json({ 
      error: 'Failed to upload photo' 
    }, { status: 500 });
  }
} 