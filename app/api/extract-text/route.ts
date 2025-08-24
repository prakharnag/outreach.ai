import { NextResponse } from "next/server";

// For Node.js runtime compatibility
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log('[Extract Text API] Processing file:', file.name, 'type:', file.type, 'size:', file.size);

    // Convert File to Buffer (equivalent to fs.readFileSync for uploaded file)
    console.log('[Extract Text API] Converting file to ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[Extract Text API] ArrayBuffer size:', arrayBuffer.byteLength);
    
    console.log('[Extract Text API] Converting ArrayBuffer to Buffer...');
    const dataBuffer = Buffer.from(arrayBuffer);
    console.log('[Extract Text API] Buffer size:', dataBuffer.length);
    console.log('[Extract Text API] Buffer first 20 bytes:', dataBuffer.subarray(0, 20));

    // Use dynamic require to avoid initialization issues
    console.log('[Extract Text API] Loading pdf-parse with require...');
    const pdf = require('pdf-parse');
    
    // Use pdf-parse with the buffer approach
    console.log('[Extract Text API] Starting PDF parsing...');
    const data = await pdf(dataBuffer);
    console.log('[Extract Text API] PDF parsing completed successfully');
    
    // Log PDF details like in the example
    console.log('Number of pages:', data.numpages);
    console.log('Number of rendered pages:', data.numrender);
    console.log('PDF info:', data.info);
    console.log('PDF metadata:', data.metadata);
    console.log('PDF.js version:', data.version);
    console.log('PDF text length:', data.text.length);
    console.log('PDF text preview (first 200 chars):', data.text.substring(0, 200));

    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error('[Extract Text API] Error:', error.message);
    console.error('[Extract Text API] Full error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}
