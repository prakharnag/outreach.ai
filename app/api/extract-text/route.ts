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


    // Convert File to Buffer (equivalent to fs.readFileSync for uploaded file)
    const arrayBuffer = await file.arrayBuffer();
    
    const dataBuffer = Buffer.from(arrayBuffer);

    // Use dynamic require to avoid initialization issues
    const pdf = require('pdf-parse');
    
    // Use pdf-parse with the buffer approach
    const data = await pdf(dataBuffer);
    
    // Log PDF details like in the example

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
