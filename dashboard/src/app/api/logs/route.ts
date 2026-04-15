import { activeRuns } from '@/lib/runManager';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId || !activeRuns.has(runId)) {
    return new Response('Run not found', { status: 404 });
  }

  const runData = activeRuns.get(runId)!;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const push = (text: string) => {
         try {
             controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
         } catch(e) {}
      }

      // Catch up on missed logs
      for (const log of runData.logs) {
        push(log);
      }

      // Add listener for live logs
      const listener = (newLog: string) => {
        push(newLog);
        if (newLog === "[END_STREAM]") {
            try { controller.close(); } catch(e){}
        }
      };

      if (runData.status !== 'running') {
         push(`\n[SYSTEM] Run finished with status: ${runData.status}\n`);
         push("[END_STREAM]");
         setTimeout(() => { try { controller.close(); } catch(e){} }, 100);
      } else {
         runData.subscribers.add(listener);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
