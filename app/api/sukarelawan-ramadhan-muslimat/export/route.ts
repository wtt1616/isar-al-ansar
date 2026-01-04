import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Export sukarelawan muslimat to CSV (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear().toString();
    const status = searchParams.get('status');

    let whereClause = 'WHERE tahun = ?';
    const params: any[] = [tahun];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id as 'No',
        nama_penuh as 'Nama Penuh',
        no_telefon as 'No Telefon',
        zon_tempat_tinggal as 'Zon',
        size_baju as 'Size Baju',
        hari_bertugas as 'Hari Bertugas',
        status as 'Status',
        catatan as 'Catatan',
        DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as 'Tarikh Daftar'
       FROM sukarelawan_ramadhan_muslimat ${whereClause}
       ORDER BY created_at ASC`,
      params
    );

    // Create CSV content with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const headers = ['No', 'Nama Penuh', 'No Telefon', 'Zon', 'Size Baju', 'Hari Bertugas', 'Status', 'Catatan', 'Tarikh Daftar'];

    let csvContent = BOM + headers.join(',') + '\n';

    let counter = 1;
    rows.forEach((row: any) => {
      const values = [
        counter++,
        `"${(row['Nama Penuh'] || '').replace(/"/g, '""')}"`,
        `"${row['No Telefon'] || ''}"`,
        `"${row['Zon'] || ''}"`,
        `"${row['Size Baju'] || ''}"`,
        `"${row['Hari Bertugas'] || ''}"`,
        `"${row['Status'] || ''}"`,
        `"${(row['Catatan'] || '').replace(/"/g, '""')}"`,
        `"${row['Tarikh Daftar'] || ''}"`
      ];
      csvContent += values.join(',') + '\n';
    });

    // Return as downloadable CSV
    const filename = `sukarelawan_ramadhan_muslimat_${tahun}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error exporting sukarelawan muslimat:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
