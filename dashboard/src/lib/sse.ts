import { NextRequest } from "next/server";

type SSEEvent = {
  type: "test:start" | "test:pass" | "test:fail" | "test:skip" | "log:line" | "run:progress" | "run:complete";
  data: any;
};

class SSEManager {
  private clients: Map<string, Set<ReadableStreamDefaultController>> = new Map();

  addClient(runId: string, controller: ReadableStreamDefaultController) {
    if (!this.clients.has(runId)) {
      this.clients.set(runId, new Set());
    }
    this.clients.get(runId)?.add(controller);
    
    // Send initial connection message
    this.sendToClient(controller, { type: "log:line", data: { message: "Connected to live stream...", level: "info", timestamp: new Date() } });
  }

  removeClient(runId: string, controller: ReadableStreamDefaultController) {
    this.clients.get(runId)?.delete(controller);
    if (this.clients.get(runId)?.size === 0) {
      this.clients.delete(runId);
    }
  }

  broadcast(runId: string, event: SSEEvent) {
    const clients = this.clients.get(runId);
    if (clients) {
      const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      clients.forEach((controller) => {
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch (e) {
          this.removeClient(runId, controller);
        }
      });
    }
  }

  private sendToClient(controller: ReadableStreamDefaultController, event: SSEEvent) {
    const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (e) {
      // client already disconnected
    }
  }
}

export const sseManager = new SSEManager();
