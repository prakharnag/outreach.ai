/**
 * ICP API Endpoint
 * GET  /api/icp - Get user's ICP profile
 * POST /api/icp - Create/update ICP profile
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ICPProfile {
  target_roles: string[];
  industries: string[];
  company_sizes: string[];
  locations: string[];
  tech_stack: string[];
  additional_criteria?: Record<string, any>;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's most recent ICP
    const { data, error } = await supabase
      .from('icp_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No ICP found
        return NextResponse.json({ icp: null });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ icp: data });
  } catch (error: any) {
    console.error('[ICP API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ICPProfile & { conversation_id?: string } = await req.json();

    // Authenticate
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create ICP profile
    const { data, error } = await supabase
      .from('icp_profiles')
      .insert({
        user_id: user.id,
        conversation_id: body.conversation_id || null,
        target_roles: body.target_roles || [],
        industries: body.industries || [],
        company_sizes: body.company_sizes || [],
        locations: body.locations || [],
        tech_stack: body.tech_stack || [],
        additional_criteria: body.additional_criteria || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ icp: data });
  } catch (error: any) {
    console.error('[ICP API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
