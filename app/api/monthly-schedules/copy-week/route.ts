import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as any).role;

  // Only head_imam and admin can copy schedules
  if (userRole !== 'head_imam' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Get first week schedules (days 1-7 of the month)
    const [firstWeekSchedules] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM monthly_schedules
       WHERE month_number = ? AND year = ?
       AND DAY(schedule_date) <= 7
       ORDER BY schedule_date, schedule_type, prayer_time`,
      [month, year]
    );

    if (firstWeekSchedules.length === 0) {
      return NextResponse.json(
        { error: 'Tiada jadual minggu pertama. Sila jana jadual terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Delete existing schedules for week 2 onwards (day > 7)
    await pool.execute(
      `DELETE FROM monthly_schedules
       WHERE month_number = ? AND year = ?
       AND DAY(schedule_date) > 7`,
      [month, year]
    );

    // Group first week schedules by day of week
    const schedulesByDayOfWeek = new Map<number, RowDataPacket[]>();
    for (const schedule of firstWeekSchedules) {
      const scheduleDate = new Date(schedule.schedule_date);
      const dayOfWeek = scheduleDate.getDay();

      if (!schedulesByDayOfWeek.has(dayOfWeek)) {
        schedulesByDayOfWeek.set(dayOfWeek, []);
      }
      schedulesByDayOfWeek.get(dayOfWeek)!.push(schedule);
    }

    // Get all days in the month after day 7
    const daysInMonth = new Date(year, month, 0).getDate();
    const createdBy = (session.user as any).id;
    const newSchedules: any[] = [];

    for (let day = 8; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const templateSchedules = schedulesByDayOfWeek.get(dayOfWeek);
      if (templateSchedules) {
        for (const template of templateSchedules) {
          newSchedules.push([
            dateStr,
            template.schedule_type,
            template.prayer_time,
            template.petugas_id,
            template.petugas_role,
            month,
            year,
            false, // is_auto_generated = false since it's copied
            createdBy
          ]);
        }
      }
    }

    // Insert new schedules in batches
    if (newSchedules.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < newSchedules.length; i += batchSize) {
        const batch = newSchedules.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = batch.flat();

        await pool.execute(
          `INSERT INTO monthly_schedules
           (schedule_date, schedule_type, prayer_time, petugas_id, petugas_role, month_number, year, is_auto_generated, created_by)
           VALUES ${placeholders}`,
          flatValues
        );
      }
    }

    return NextResponse.json({
      message: `Jadual minggu pertama berjaya disalin ke minggu 2-${Math.ceil(daysInMonth / 7)}`,
      copied: newSchedules.length
    });
  } catch (error: any) {
    console.error('Error copying week schedules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy schedules' },
      { status: 500 }
    );
  }
}
