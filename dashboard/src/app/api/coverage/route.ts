import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Mock coverage data by domains
    const domains = [
      { name: "Auth", coverage: 98, total: 45, tested: 44 },
      { name: "Intake", coverage: 82, total: 110, tested: 90 },
      { name: "Vacancy generation", coverage: 91, total: 56, tested: 51 },
      { name: "Payments", coverage: 100, total: 32, tested: 32 },
      { name: "Admin Portal", coverage: 45, total: 200, tested: 90 },
      { name: "Search", coverage: 88, total: 42, tested: 37 }
    ];

    return NextResponse.json(domains);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch coverage data" }, { status: 500 });
  }
}
