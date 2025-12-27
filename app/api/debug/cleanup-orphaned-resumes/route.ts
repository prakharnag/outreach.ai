import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get all user profiles with resume data
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, resume_filename, resume_url')
      .not('resume_filename', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        message: 'No profiles with resume data found',
        cleaned: 0,
        total: 0
      });
    }

    let cleanedCount = 0;
    const results = [];

    for (const profile of profiles) {
      try {
        // Check if file exists in storage
        let fileName = profile.resume_filename;
        
        // Handle different filename formats
        if (!fileName.includes('/')) {
          fileName = `${profile.user_id}/${fileName}`;
        }

        const { data: files, error: listError } = await supabase.storage
          .from('resumes')
          .list(fileName.split('/')[0], {
            search: fileName.split('/').pop()
          });

        if (listError) {
          console.error(`Error checking file for user ${profile.user_id}:`, listError);
          continue;
        }

        // If file doesn't exist, clean up the database record
        if (!files || files.length === 0) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              resume_url: null,
              resume_filename: null,
              resume_content: null,
              use_resume_in_personalization: false
            })
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error(`Error cleaning up profile for user ${profile.user_id}:`, updateError);
            results.push({
              user_id: profile.user_id,
              filename: profile.resume_filename,
              status: 'error',
              error: updateError.message
            });
          } else {
            cleanedCount++;
            results.push({
              user_id: profile.user_id,
              filename: profile.resume_filename,
              status: 'cleaned'
            });
          }
        } else {
          results.push({
            user_id: profile.user_id,
            filename: profile.resume_filename,
            status: 'exists'
          });
        }
      } catch (error) {
        console.error(`Error processing profile for user ${profile.user_id}:`, error);
        results.push({
          user_id: profile.user_id,
          filename: profile.resume_filename,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Cleanup completed. ${cleanedCount} orphaned records cleaned.`,
      cleaned: cleanedCount,
      total: profiles.length,
      results
    });

  } catch (error) {
    console.error('Error in cleanup-orphaned-resumes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup orphaned resumes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
