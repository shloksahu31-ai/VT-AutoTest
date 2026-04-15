const { neon } = require('@neondatabase/serverless');
const { PrismaNeonHTTP } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testConnection() {
  console.log('--- DB DIAGNOSTIC START ---');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL is missing');
    return;
  }
  
  console.log('Testing Neon connection to:', url.split('@')[1]);
  
  try {
    const sql = neon(url);
    const adapter = new PrismaNeonHTTP(sql);
    const prisma = new PrismaClient({ adapter });
    
    console.log('Prisma initialized with adapter. Attempting query...');
    const result = await prisma.testSuite.count();
    console.log('SUCCESS! Count:', result);
  } catch (error) {
    console.error('DIAGNOSTIC FAILURE:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Code:', error.code);
    console.error('Raw Error:', JSON.stringify(error, null, 2));
  }
}

testConnection();
