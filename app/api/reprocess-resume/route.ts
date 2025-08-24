import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's resume data
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('resume_url, resume_filename, resume_content')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData?.resume_url) {
      return NextResponse.json({ error: "No resume found" }, { status: 404 });
    }

    // Check if the current content looks like a fallback (filename only)
    if (profileData.resume_content && 
        !profileData.resume_content.startsWith('Resume file:') && 
        profileData.resume_content.length > 100) {
      return NextResponse.json({ 
        message: "Resume content appears to be properly extracted already",
        contentLength: profileData.resume_content.length 
      });
    }

    // Download the file from the resume URL
    const fileResponse = await fetch(profileData.resume_url);
    if (!fileResponse.ok) {
      console.log('[Reprocess Resume] Failed to download file, status:', fileResponse.status);
      return NextResponse.json({ error: "Failed to download resume file" }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    
    // Determine file type from URL or filename
    const fileExtension = profileData.resume_filename?.split('.').pop()?.toLowerCase();
    let mimeType = 'application/pdf'; // Default to PDF
    
    if (fileExtension === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileExtension === 'doc') {
      mimeType = 'application/msword';
    }
    
    const file = new File([blob], profileData.resume_filename || 'resume.pdf', {
      type: mimeType
    });

    console.log('[Reprocess Resume] Re-extracting text from file:', file.name, 'type:', file.type);

    // Re-extract text using the extract-text API
    const formData = new FormData();
    formData.append('file', file);

    const extractResponse = await fetch(`${request.nextUrl.origin}/api/extract-text`, {
      method: 'POST',
      body: formData,
    });

    if (!extractResponse.ok) {
      const errorData = await extractResponse.text();
      return NextResponse.json({ 
        error: "Failed to extract text from resume", 
        details: errorData 
      }, { status: 400 });
    }

    const { text } = await extractResponse.json();

    if (!text || text.length < 10) {
      return NextResponse.json({ 
        error: "Could not extract meaningful text from resume file" 
      }, { status: 400 });
    }

    console.log('[Reprocess Resume] Successfully extracted text, length:', text.length);

    // Update the user profile with the new extracted text
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        resume_content: text,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ 
        error: "Failed to update resume content in database" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Resume content successfully re-extracted and updated",
      contentLength: text.length,
      contentPreview: text.slice(0, 200) + '...'
    });

  } catch (error: any) {
    console.error('[Reprocess Resume] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reprocess resume' },
      { status: 500 }
    );
  }
}
