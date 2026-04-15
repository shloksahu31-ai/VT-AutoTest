import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not found");
    
    const sql = neon(url);
    const suites = await sql`SELECT id, name, description, "testCases" FROM "TestSuite" ORDER BY "createdAt" DESC`;
    
    return NextResponse.json(suites);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
