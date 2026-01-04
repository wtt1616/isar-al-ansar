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

    // Get previous month date range
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

    // Get all schedules from previous month
    const [prevSchedules] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM preacher_schedules
       WHERE schedule_date BETWEEN ? AND ?
       ORDER BY schedule_date`,
      [prevStartDate, prevEndDate]
    );

    if (prevSchedules.length === 0) {
      const monthNames = [
        'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
        'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
      ];
      return NextResponse.json(
        { error: `Tiada jadual ceramah untuk ${monthNames[prevMonth - 1]} ${prevYear}. Sila isi jadual bulan tersebut terlebih dahulu.` },
        { status: 400 }
      );
    }

    // Check if current month already has schedules
    const currentStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const currentEndDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM preacher_schedules WHERE schedule_date BETWEEN ? AND ?',
      [currentStartDate, currentEndDate]
    );

    if ((existing[0] as any).count > 0) {
      return NextResponse.json(
        { error: 'Jadual ceramah untuk bulan ini sudah wujud. Sila padam dahulu sebelum copy dari bulan sebelumnya.' },
        { status: 400 }
      );
    }

    // Group previous month schedules by day of week
    const schedulesByDayOfWeek = new Map<number, RowDataPacket>();
    for (const schedule of prevSchedules) {
      const scheduleDate = new Date(schedule.schedule_date);
      const dayOfWeek = scheduleDate.getDay();

      // Use first occurrence for each day of week as template
      if (!schedulesByDayOfWeek.has(dayOfWeek)) {
        schedulesByDayOfWeek.set(dayOfWeek, schedule);
      }
    }

    // Get all days in the target month
    const daysInMonth = new Date(year, month, 0).getDate();
    const createdBy = (session.user as any).id;
    const newSchedules: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const templateSchedule = schedulesByDayOfWeek.get(dayOfWeek);
      if (templateSchedule) {
        newSchedules.push([
          dateStr,
          templateSchedule.subuh_preacher_id,
          templateSchedule.dhuha_preacher_id,
          templateSchedule.maghrib_preacher_id,
          templateSchedule.friday_preacher_id,
          templateSchedule.friday_dhuha_preacher_id,
          templateSchedule.yasin_kahfi_preacher_id,
          templateSchedule.kahfi_muslimat_preacher_id,
          null, // subuh_banner - don't copy banners
          null, // dhuha_banner
          null, // maghrib_banner
          null, // friday_banner
          null, // friday_dhuha_banner
          null, // yasin_kahfi_banner
          null, // kahfi_muslimat_banner
          null, // notes
          createdBy
        ]);
      }
    }

    // Insert new schedules in batches
    if (newSchedules.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < newSchedules.length; i += batchSize) {
        const batch = newSchedules.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = batch.flat();

        await pool.execute(
          `INSERT INTO preacher_schedules
           (schedule_date, subuh_preacher_id, dhuha_preacher_id, maghrib_preacher_id, friday_preacher_id, friday_dhuha_preacher_id,
            yasin_kahfi_preacher_id, kahfi_muslimat_preacher_id,
            subuh_banner, dhuha_banner, maghrib_banner, friday_banner, friday_dhuha_banner,
            yasin_kahfi_banner, kahfi_muslimat_banner, notes, created_by)
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
      message: `Jadual ceramah berjaya disalin dari ${monthNames[prevMonth - 1]} ${prevYear}`,
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
