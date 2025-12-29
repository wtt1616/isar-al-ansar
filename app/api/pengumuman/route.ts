import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

// GET - Fetch pengumuman (public for active, admin for all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forAdmin = searchParams.get('admin') === 'true';
    const activeOnly = searchParams.get('active') === 'true';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (forAdmin) {
      // Admin view - check authorization
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (activeOnly) {
      // Public view - only show active announcements within date range
      whereClause += ' AND p.status = ? AND p.tarikh_mula <= CURDATE() AND p.tarikh_akhir >= CURDATE()';
      params.push('aktif');
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        p.*,
        u.name as created_by_name
       FROM pengumuman p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.tarikh_mula DESC, p.created_at DESC`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching pengumuman:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// POST - Create new pengumuman (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const tajuk = formData.get('tajuk') as string;
    const keterangan = formData.get('keterangan') as string;
    const tarikh_mula = formData.get('tarikh_mula') as string;
    const tarikh_akhir = formData.get('tarikh_akhir') as string;
    const status = formData.get('status') as string || 'aktif';
    const url = formData.get('url') as string;
    const imejFile = formData.get('imej') as File | null;

    // Validation
    if (!tajuk || !tarikh_mula || !tarikh_akhir) {
      return NextResponse.json({ error: 'Tajuk, tarikh mula dan tarikh akhir diperlukan' }, { status: 400 });
    }

    let imejFilename: string | null = null;

    // Handle image upload
    if (imejFile && imejFile.size > 0) {
      const bytes = await imejFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if not exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pengumuman');
      await mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const ext = path.extname(imejFile.name);
      imejFilename = `pengumuman_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, imejFilename);

      await writeFile(filePath, buffer);
    }

    // Insert into database
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO pengumuman (tajuk, keterangan, tarikh_mula, tarikh_akhir, status, url, imej, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tajuk, keterangan || null, tarikh_mula, tarikh_akhir, status, url || null, imejFilename, session.user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Pengumuman berjaya ditambah',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating pengumuman:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// PUT - Update pengumuman (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const tajuk = formData.get('tajuk') as string;
    const keterangan = formData.get('keterangan') as string;
    const tarikh_mula = formData.get('tarikh_mula') as string;
    const tarikh_akhir = formData.get('tarikh_akhir') as string;
    const status = formData.get('status') as string;
    const url = formData.get('url') as string;
    const imejFile = formData.get('imej') as File | null;
    const removeImage = formData.get('removeImage') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    // Get current record
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT imej FROM pengumuman WHERE id = ?',
      [id]
    );

    if ((existing as RowDataPacket[]).length === 0) {
      return NextResponse.json({ error: 'Pengumuman tidak dijumpai' }, { status: 404 });
    }

    let imejFilename = (existing as RowDataPacket[])[0].imej;

    // Handle image removal
    if (removeImage && imejFilename) {
      const oldFilePath = path.join(process.cwd(), 'public', 'uploads', 'pengumuman', imejFilename);
      try {
        await unlink(oldFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
      imejFilename = null;
    }

    // Handle new image upload
    if (imejFile && imejFile.size > 0) {
      // Delete old image if exists
      if (imejFilename) {
        const oldFilePath = path.join(process.cwd(), 'public', 'uploads', 'pengumuman', imejFilename);
        try {
          await unlink(oldFilePath);
        } catch (e) {
          // Ignore if file doesn't exist
        }
      }

      const bytes = await imejFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pengumuman');
      await mkdir(uploadDir, { recursive: true });

      const ext = path.extname(imejFile.name);
      imejFilename = `pengumuman_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, imejFilename);

      await writeFile(filePath, buffer);
    }

    // Update database
    await pool.query(
      `UPDATE pengumuman SET
        tajuk = ?,
        keterangan = ?,
        tarikh_mula = ?,
        tarikh_akhir = ?,
        status = ?,
        url = ?,
        imej = ?
       WHERE id = ?`,
      [tajuk, keterangan || null, tarikh_mula, tarikh_akhir, status, url || null, imejFilename, id]
    );

    return NextResponse.json({ success: true, message: 'Pengumuman dikemaskini' });
  } catch (error) {
    console.error('Error updating pengumuman:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// DELETE - Remove pengumuman (admin only)
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

    // Get image filename before deleting
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT imej FROM pengumuman WHERE id = ?',
      [id]
    );

    if ((existing as RowDataPacket[]).length > 0 && (existing as RowDataPacket[])[0].imej) {
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'pengumuman', (existing as RowDataPacket[])[0].imej);
      try {
        await unlink(filePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    }

    await pool.query('DELETE FROM pengumuman WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Pengumuman dipadam' });
  } catch (error) {
    console.error('Error deleting pengumuman:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
