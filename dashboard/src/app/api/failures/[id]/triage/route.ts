import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triageFailure } from "@/lib/gemini";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await prisma.testResult.findUnique({
      where: { id },
      include: { run: true }
    });

    if (!result) return NextResponse.json({ error: "Result not found" }, { status: 404 });

    const triage = await triageFailure({
      name: result.name,
      file: result.file || "unknown",
      errorMessage: result.errorMessage || "",
      errorStack: result.errorStack || "",
      history: [] // Add history lookup logic if needed
    });

    const updated = await prisma.testResult.update({
      where: { id },
      data: {
        category: triage.category,
        aiTriageReason: `${triage.rootCause} | Suggestion: ${triage.suggestedFix}`
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to triage failure" }, { status: 500 });
  }
}
