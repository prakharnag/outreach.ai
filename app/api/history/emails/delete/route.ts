import { NextRequest } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = "edge";

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options ?? {})
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in email delete:', authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.log('Email delete request - User ID:', user.id);

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Email ID is required" }), { status: 400 });
    }

    console.log('Attempting to delete email with ID:', id);

    // Delete the email from the database
    const { error } = await supabase
      .from('email_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user can only delete their own emails

    if (error) {
      console.error('Failed to delete email:', error);
      return new Response(JSON.stringify({ error: "Failed to delete email" }), { status: 500 });
    }

    console.log('Successfully deleted email with ID:', id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Delete email error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
