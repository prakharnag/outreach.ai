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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const dataBuffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // Handle different file types
    if (file.type === 'application/pdf') {
      try {
        const pdf = require('pdf-parse');
        const data = await pdf(dataBuffer);
        extractedText = data.text;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error('Failed to parse PDF file');
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.type === 'application/msword') {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        extractedText = result.value;
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError);
        throw new Error('Failed to parse Word document');
      }
    } else {
      throw new Error('Unsupported file type');
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();

    return NextResponse.json({ text: extractedText });
  } catch (error: any) {
    console.error('[Extract Text API] Error:', error.message);
    console.error('[Extract Text API] Full error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}
