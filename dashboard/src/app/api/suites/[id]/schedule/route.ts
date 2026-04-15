import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduler } from '@/lib/scheduler';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { schedule, isScheduled } = body;

    const suite = await prisma.testSuite.update({
      where: { id },
      data: {
        schedule: schedule !== undefined ? schedule : undefined,
        isScheduled: isScheduled !== undefined ? isScheduled : undefined,
      },
    });

    // Sync scheduler after update
    await scheduler.syncSchedules();

    return NextResponse.json(suite);
  } catch (error) {
    console.error('Failed to update suite schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
