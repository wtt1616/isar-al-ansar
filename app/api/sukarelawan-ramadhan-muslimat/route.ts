import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - Fetch sukarelawan muslimat registrations (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear().toString();
    const status = searchParams.get('status');
    const hari = searchParams.get('hari');

    let whereClause = 'WHERE tahun = ?';
    const params: any[] = [tahun];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (hari && hari !== 'all') {
      whereClause += ' AND hari_bertugas LIKE ?';
      params.push(`%${hari}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sukarelawan_ramadhan_muslimat ${whereClause} ORDER BY created_at DESC`,
      params
    );

    // Get statistics
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM sukarelawan_ramadhan_muslimat WHERE tahun = ?`,
      [tahun]
    );

    // Get count by hari - split comma-separated values and count each day
    const [approvedRows] = await pool.query<RowDataPacket[]>(
      `SELECT hari_bertugas FROM sukarelawan_ramadhan_muslimat WHERE tahun = ? AND status = 'approved'`,
      [tahun]
    );

    // Count each day separately
    const hariCount: { [key: string]: number } = {};
    for (const row of approvedRows) {
      if (row.hari_bertugas) {
        const days = row.hari_bertugas.split(',').map((d: string) => d.trim());
        for (const day of days) {
          if (day) {
            hariCount[day] = (hariCount[day] || 0) + 1;
          }
        }
      }
    }

    // Convert to array format
    const hariStats = Object.entries(hariCount).map(([hari_bertugas, count]) => ({
      hari_bertugas,
      count
    }));

    // Get count by size
    const [sizeStats] = await pool.query<RowDataPacket[]>(
      `SELECT size_baju, COUNT(*) as count
       FROM sukarelawan_ramadhan_muslimat
       WHERE tahun = ? AND status = 'approved'
       GROUP BY size_baju
       ORDER BY FIELD(size_baju, '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '5XL', '7XL')`,
      [tahun]
    );

    return NextResponse.json({
      data: rows,
      stats: stats[0],
      hariStats,
      sizeStats
    });
  } catch (error) {
    console.error('Error fetching sukarelawan muslimat:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// POST - Register new sukarelawan muslimat (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tahun, nama_penuh, no_telefon, zon_tempat_tinggal, size_baju, hari_bertugas } = body;

    // Validation
    if (!tahun || !nama_penuh || !no_telefon || !zon_tempat_tinggal || !size_baju || !hari_bertugas) {
      return NextResponse.json({ error: 'Sila lengkapkan semua maklumat' }, { status: 400 });
    }

    // Check for duplicate registration (same phone number for same year)
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM sukarelawan_ramadhan_muslimat WHERE no_telefon = ? AND tahun = ?',
      [no_telefon, tahun]
    );

    if ((existing as RowDataPacket[]).length > 0) {
      return NextResponse.json({
        error: 'Nombor telefon ini telah didaftarkan untuk tahun ini'
      }, { status: 400 });
    }

    // Insert registration
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO sukarelawan_ramadhan_muslimat
       (tahun, nama_penuh, no_telefon, zon_tempat_tinggal, size_baju, hari_bertugas, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [tahun, nama_penuh, no_telefon, zon_tempat_tinggal, size_baju, hari_bertugas]
    );

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berjaya',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error registering sukarelawan muslimat:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// PUT - Update sukarelawan muslimat (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, catatan, nama_penuh, no_telefon, zon_tempat_tinggal, size_baju, hari_bertugas } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    // If status is provided, update status only
    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Status tidak sah' }, { status: 400 });
      }

      await pool.query(
        'UPDATE sukarelawan_ramadhan_muslimat SET status = ?, catatan = ? WHERE id = ?',
        [status, catatan || null, id]
      );

      return NextResponse.json({ success: true, message: 'Status dikemaskini' });
    }

    // Otherwise, update record details
    if (nama_penuh || no_telefon || zon_tempat_tinggal || size_baju || hari_bertugas) {
      await pool.query(
        `UPDATE sukarelawan_ramadhan_muslimat SET
          nama_penuh = COALESCE(?, nama_penuh),
          no_telefon = COALESCE(?, no_telefon),
          zon_tempat_tinggal = COALESCE(?, zon_tempat_tinggal),
          size_baju = COALESCE(?, size_baju),
          hari_bertugas = COALESCE(?, hari_bertugas)
         WHERE id = ?`,
        [nama_penuh, no_telefon, zon_tempat_tinggal, size_baju, hari_bertugas, id]
      );

      return NextResponse.json({ success: true, message: 'Rekod dikemaskini' });
    }

    return NextResponse.json({ error: 'Tiada data untuk dikemaskini' }, { status: 400 });
  } catch (error) {
    console.error('Error updating sukarelawan muslimat:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// DELETE - Remove sukarelawan muslimat (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    await pool.query('DELETE FROM sukarelawan_ramadhan_muslimat WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Pendaftaran dipadam' });
  } catch (error) {
    console.error('Error deleting sukarelawan muslimat:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
