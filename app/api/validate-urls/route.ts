import { NextRequest, NextResponse } from "next/server";
import { SourceValidator } from "../../../lib/source-validator";

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "Invalid request. Expected array of URLs." },
        { status: 400 }
      );
    }

    const sourcesToValidate = urls.map((url: string) => ({
      url,
      title: `URL Validation Test`
    }));

    const validatedSources = await SourceValidator.validateUrls(sourcesToValidate);
    
    return NextResponse.json({
      results: validatedSources,
      summary: {
        total: validatedSources.length,
        valid: validatedSources.filter(s => s.isValid).length,
        invalid: validatedSources.filter(s => !s.isValid).length
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error during URL validation" },
      { status: 500 }
    );
  }
}
