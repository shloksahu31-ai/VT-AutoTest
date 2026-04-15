import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { gateId, role, detail } = await req.json();

    // Only developers can approve
    if (role !== "developer" && role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Developer role required" }, { status: 403 });
    }

    const updated = await prisma.releaseGate.update({
      where: { id: gateId },
      data: {
        status: "pass",
        detail: `Manually approved: ${detail || "No additional detail"}`,
        lastCheckedAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to approve gate" }, { status: 500 });
  }
}
