import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}


export type SaveRunInput = {
  company: string;
  role: string;
  research_json: unknown;
  verified_json: unknown;
  linkedin: string;
  email: string;
};

export async function saveRun(data: SaveRunInput) {
  try {
    const client = getSupabase();
    if (!client) return; // no-op when not configured
    await client.from("runs").insert([
      {
        company: data.company,
        role: data.role,
        research_json: data.research_json as any,
        verified_json: data.verified_json as any,
        linkedin: data.linkedin,
        email: data.email,
      },
    ]);
  } catch (_) {
    // ignore for MVP
  }
}

export type CachedRun = {
  research_json: unknown;
  verified_json: unknown;
  created_at: string;
} | null;

export async function findRecentRun(
  company: string,
  role: string,
  withinHours: number
): Promise<CachedRun> {
  try {
    const client = getSupabase();
    if (!client) return null;
    const sinceIso = new Date(Date.now() - withinHours * 3600 * 1000).toISOString();
    const { data, error } = await client
      .from("runs")
      .select("research_json,verified_json,created_at")
      .eq("company", company)
      .eq("role", role)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return null;
    if (!data || !data.length) return null;
    return data[0] as any;
  } catch (_) {
    return null;
  }
}


