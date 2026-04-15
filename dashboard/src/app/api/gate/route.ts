import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gates = await prisma.releaseGate.findMany({
      orderBy: [{ required: "desc" }, { category: "asc" }]
    });
    
    const statusCounts = gates.reduce((acc: any, gate) => {
      acc[gate.status] = (acc[gate.status] || 0) + 1;
      return acc;
    }, {});

    const totalRequired = gates.filter(g => g.required).length;
    const passedRequired = gates.filter(g => g.required && g.status === "pass").length;
    
    // Overall verdict
    let verdict = "PASSED";
    if (gates.some(g => g.required && g.status === "fail")) verdict = "FAILED";
    else if (gates.some(g => g.required && g.status === "warn")) verdict = "WARNING";

    return NextResponse.json({
      gates,
      summary: {
        verdict,
        total: gates.length,
        passing: passedRequired,
        required: totalRequired,
        statusCounts
      }
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch release gates" }, { status: 500 });
  }
}
