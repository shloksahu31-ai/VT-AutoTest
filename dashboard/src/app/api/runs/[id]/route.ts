import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const run = await prisma.testRun.findUnique({
      where: { id },
      include: {
        results: true,
        suite: true,
        qualityScores: true
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error(`Failed to fetch run ${id}:`, error);
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 });
  }
}
