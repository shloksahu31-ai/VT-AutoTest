import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not found");

const sql = neon(url);

async function main() {
  const testCases = JSON.stringify([
    "tests/happy-path.spec.ts",
    "tests/full-flow.spec.ts",
    "tests/final-comprehensive-flow.spec.ts"
  ]);

  console.log("Inserting Happy Flow V1 via raw SQL...");
  
  const res = await sql`
      INSERT INTO "TestSuite" (id, name, description, "isCustom", "testCases", "createdBy", "createdAt", "updatedAt") 
      VALUES (gen_random_uuid()::text, 'Happy Flow V1', 'Core E2E Happy Flow combining 3 end-to-end happy paths.', false, ${testCases}::jsonb, 'System', NOW(), NOW())
      RETURNING id, name;
  `;

  console.log("Successfully created test suite:", res[0].name, "(ID:", res[0].id, ")");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

