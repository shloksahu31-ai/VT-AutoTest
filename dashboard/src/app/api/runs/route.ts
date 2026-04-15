import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeTestRun } from "@/lib/runner";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const suiteId = searchParams.get("suiteId");
  const status = searchParams.get("status");
  const environment = searchParams.get("environment");
  const context = searchParams.get("context");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const where: any = {};
  if (suiteId) where.suiteId = suiteId;
  if (status) where.status = status;
  if (environment) where.environment = environment;
  if (context) where.context = context;

  const total = await prisma.testRun.count({ where });
  const runs = await prisma.testRun.findMany({
    where,
    orderBy: { startedAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: { suite: { select: { name: true } } }
  });

  return NextResponse.json({ runs, total, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const { suiteId, environment, branch, context, triggeredBy } = await req.json();

    const run = await prisma.testRun.create({
      data: {
        suiteId,
        environment: environment || "staging",
        branch: branch || "main",
        context: context || "regression",
        triggeredBy: triggeredBy || "Manual",
        triggerType: "manual",
        status: "running",
        startedAt: new Date(),
      },
    });

    // Trigger execution in the background
    executeTestRun({
      runId: run.id,
      suiteId,
      environment,
      branch,
      context,
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("Failed to trigger run:", error);
    return NextResponse.json({ error: "Failed to trigger run" }, { status: 500 });
  }
}
