import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  try {
    const where: any = { status: "failed" };
    if (category) where.category = category;

    const failures = await prisma.testResult.findMany({
      where,
      orderBy: { run: { startedAt: "desc" } },
      include: { run: { select: { startedAt: true, environment: true } } },
      take: 50
    });

    return NextResponse.json(failures);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch failures" }, { status: 500 });
  }
}
