import { NextRequest } from "next/server";
import { runChain } from "lib/chain";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = "edge";

type Event =
  | { type: "status"; data: any }
  | { type: "intermediate"; data: any }
  | { type: "final"; data: any }
  | { type: "error"; data: { message: string } };

function toNdjson(event: Event): string {
  return JSON.stringify(event) + "\n";
}

export async function POST(req: NextRequest) {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.log('[API Run] Authenticated user:', user.id);


    const { company, domain, role, highlights, tone, resumeContent, useResumeInPersonalization } = await req.json();
    if (!company || !role || !highlights) {
      return new Response(JSON.stringify({ error: "Missing company, role or highlights" }), { status: 400 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const result = await runChain(
            { 
              company: String(company), 
              domain: domain ? String(domain) : undefined, 
              role: String(role), 
              highlights: String(highlights),
              tone: tone || undefined,
              userId: user.id,
              resumeContent: useResumeInPersonalization ? (resumeContent || undefined) : undefined
            },
            {
              onStatus: (s) => controller.enqueue(encoder.encode(toNdjson({ type: "status", data: s }))),
              onIntermediate: (i) => controller.enqueue(encoder.encode(toNdjson({ type: "intermediate", data: i }))),
            }
          );
          controller.enqueue(encoder.encode(toNdjson({ type: "final", data: result })));
        } catch (e: any) {
          controller.enqueue(encoder.encode(toNdjson({ type: "error", data: { message: e?.message || "Unknown error" } })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e: any) {
    console.error("[/api/run] error", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error", stack: e?.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


