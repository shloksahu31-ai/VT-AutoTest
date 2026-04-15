import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      sseManager.addClient(id, controller);
      
      const interval = setInterval(() => {
        // Keep-alive signal
        try {
          controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
        } catch (e) {
          clearInterval(interval);
          sseManager.removeClient(id, controller);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        sseManager.removeClient(id, controller);
        controller.close();
      });
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
