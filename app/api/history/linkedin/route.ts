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

    // Get all LinkedIn messages for the user
    const { data: allLinkedIn, error } = await supabase
      .from("linkedin_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group LinkedIn messages by company, keeping only the most recent for each company
    const groupedByCompany = new Map();
    
    allLinkedIn?.forEach((message) => {
      const companyName = message.company_name;
      if (!groupedByCompany.has(companyName) || 
          new Date(message.created_at) > new Date(groupedByCompany.get(companyName).created_at)) {
        // Add a count of total messages for this company
        const totalForCompany = allLinkedIn.filter(m => m.company_name === companyName).length;
        groupedByCompany.set(companyName, {
          ...message,
          total_count: totalForCompany,
          all_messages: allLinkedIn.filter(m => m.company_name === companyName)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        });
      }
    });

    // Convert back to array and limit to 50 companies
    const result = Array.from(groupedByCompany.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    return NextResponse.json(result || []);
  } catch (error) {
    console.error('LinkedIn history GET error:', error);
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

    const { company_name, role, message_content } = await request.json();

    const { data, error } = await supabase
      .from("linkedin_history")
      .insert({
        user_id: user.id,
        company_name,
        role,
        content: message_content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}