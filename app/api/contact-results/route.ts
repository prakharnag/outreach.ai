import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
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

    const { data, error } = await supabase
      .from("contact_results")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('relation "contact_results" does not exist')) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      company_name,
      contact_name,
      contact_title,
      contact_email,
      email_inferred,
      confidence_score,
      source_url,
      source_title,
      research_data
    } = body;

    // Check if company already exists for this user
    const { data: existing } = await supabase
      .from("contact_results")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_name", company_name)
      .single();

    let data, error;
    
    if (existing) {
      // Update existing record
      const result = await supabase
        .from("contact_results")
        .update({
          contact_name,
          contact_title,
          contact_email,
          email_inferred: email_inferred || false,
          confidence_score,
          source_url,
          source_title,
          research_data,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from("contact_results")
        .insert({
          user_id: user.id,
          company_name,
          contact_name,
          contact_title,
          contact_email,
          email_inferred: email_inferred || false,
          confidence_score,
          source_url,
          source_title,
          research_data
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      // If table doesn't exist, return error but don't crash
      if (error.message.includes('relation "contact_results" does not exist')) {
        return NextResponse.json({ error: "Contact results table not available" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}