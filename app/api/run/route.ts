import { NextRequest } from "next/server";
import { runChain } from "@/lib/chain";

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
    const { company, role, highlights } = await req.json();
    if (!company || !role || !highlights) {
      return new Response(JSON.stringify({ error: "Missing company, role or highlights" }), { status: 400 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const result = await runChain(
            { company: String(company), role: String(role), highlights: String(highlights) },
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


