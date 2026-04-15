import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.testSuite.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Suite deleted successfully' });
  } catch (error) {
    console.error('Error deleting suite:', error);
    return NextResponse.json({ error: 'Failed to delete suite' }, { status: 500 });
  }
}
