import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.flakynessRecord.findMany({
      orderBy: { flakinessRate: "desc" },
      take: 20
    });
    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch flakiness records" }, { status: 500 });
  }
}
