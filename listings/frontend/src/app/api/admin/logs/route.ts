import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Format the log entry
    const logEntry = `[${data.timestamp}] ${data.component} - ${data.type}\n${JSON.stringify(data.data, null, 2)}\n\n`;
    
    // Get the logs directory path
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    
    // Write to a file named with today's date
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}.log`);
    
    // Append the log entry to the file
    fs.appendFileSync(logFile, logEntry);
    
    // Also output to console for immediate viewing
    console.log(logEntry);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging data:', error);
    return NextResponse.json({ error: 'Failed to log data' }, { status: 500 });
  }
} 