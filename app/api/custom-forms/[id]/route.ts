import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - Get single form by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        cf.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM custom_form_submissions WHERE form_id = cf.id) as submission_count
      FROM custom_forms cf
      LEFT JOIN users u ON cf.created_by = u.id
      WHERE cf.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    const form = rows[0];
    // Parse JSON fields
    if (typeof form.fields === 'string') {
      form.fields = JSON.parse(form.fields);
    }
    if (form.settings && typeof form.settings === 'string') {
      form.settings = JSON.parse(form.settings);
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// PUT - Update form (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, slug, fields, settings, is_active, start_date, end_date } = body;

    // Check if form exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM custom_forms WHERE id = ?',
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    // Check if slug is unique (if changed)
    if (slug) {
      const [slugCheck] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM custom_forms WHERE slug = ? AND id != ?',
        [slug, params.id]
      );
      if (slugCheck.length > 0) {
        return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      values.push(slug);
    }
    if (fields !== undefined) {
      updates.push('fields = ?');
      values.push(JSON.stringify(fields));
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(settings ? JSON.stringify(settings) : null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(end_date || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tiada data untuk dikemaskini' }, { status: 400 });
    }

    values.push(params.id);

    await pool.query(
      `UPDATE custom_forms SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'Form berjaya dikemaskini'
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// DELETE - Delete form (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if form exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, title FROM custom_forms WHERE id = ?',
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    // Delete form (submissions will be deleted automatically due to CASCADE)
    await pool.query('DELETE FROM custom_forms WHERE id = ?', [params.id]);

    return NextResponse.json({
      success: true,
      message: 'Form berjaya dipadam'
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
