import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const testCases = [
      "tests/happy-path.spec.ts",
      "tests/full-flow.spec.ts",
      "tests/final-comprehensive-flow.spec.ts"
    ];

    const suite = await prisma.testSuite.create({
      data: {
        name: "Happy Flow V1",
        description: "Core E2E Happy Flow combining 3 end-to-end happy paths.",
        isCustom: false,
        testCases: testCases,
        createdBy: "System"
      }
    });
    
    return NextResponse.json({ success: true, suite });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
