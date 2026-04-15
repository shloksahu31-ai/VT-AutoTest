import { prisma } from '@/lib/prisma';

export async function GET() {
  const settings = await prisma.globalSetting.findMany();
  return Response.json(settings);
}

export async function POST(req: Request) {
  const { key, value } = await req.json();
  const setting = await prisma.globalSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return Response.json(setting);
}
