import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

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

    // Calculate previous month
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    // Get all schedules from previous month
    const [prevSchedules] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM monthly_schedules
       WHERE month_number = ? AND year = ?
       ORDER BY schedule_date, schedule_type, prayer_time`,
      [prevMonth, prevYear]
    );

    if (prevSchedules.length === 0) {
      const monthNames = [
        'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
        'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
      ];
      return NextResponse.json(
        { error: `Tiada jadual untuk ${monthNames[prevMonth - 1]} ${prevYear}. Sila jana jadual bulan tersebut terlebih dahulu.` },
        { status: 400 }
      );
    }

    // Check if current month already has schedules
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM monthly_schedules WHERE month_number = ? AND year = ?',
      [month, year]
    );

    if ((existing[0] as any).count > 0) {
      return NextResponse.json(
        { error: 'Jadual untuk bulan ini sudah wujud. Sila padam dahulu sebelum copy dari bulan sebelumnya.' },
        { status: 400 }
      );
    }

    // Group previous month schedules by day of week
    const schedulesByDayOfWeek = new Map<number, RowDataPacket[]>();
    for (const schedule of prevSchedules) {
      const scheduleDate = new Date(schedule.schedule_date);
      const dayOfWeek = scheduleDate.getDay();

      if (!schedulesByDayOfWeek.has(dayOfWeek)) {
        schedulesByDayOfWeek.set(dayOfWeek, []);
      }
      schedulesByDayOfWeek.get(dayOfWeek)!.push(schedule);
    }

    // For each day of week, we'll use the first occurrence's schedules as template
    const templateByDayOfWeek = new Map<number, RowDataPacket[]>();
    for (const [dayOfWeek, schedules] of schedulesByDayOfWeek) {
      // Get first day's schedule for this day of week
      const firstDaySchedules: RowDataPacket[] = [];
      const seenKeys = new Set<string>();

      for (const schedule of schedules) {
        // Create unique key for schedule type + prayer time + role
        const key = `${schedule.schedule_type}-${schedule.prayer_time || 'null'}-${schedule.petugas_role}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          firstDaySchedules.push(schedule);
        }
      }
      templateByDayOfWeek.set(dayOfWeek, firstDaySchedules);
    }

    // Get all days in the target month
    const daysInMonth = new Date(year, month, 0).getDate();
    const createdBy = (session.user as any).id;
    const newSchedules: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const templateSchedules = templateByDayOfWeek.get(dayOfWeek);
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

    const monthNames = [
      'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
      'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
    ];

    return NextResponse.json({
      message: `Jadual berjaya disalin dari ${monthNames[prevMonth - 1]} ${prevYear}`,
      copied: newSchedules.length,
      sourceMonth: prevMonth,
      sourceYear: prevYear
    });
  } catch (error: any) {
    console.error('Error copying from previous month:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy schedules' },
      { status: 500 }
    );
  }
}
