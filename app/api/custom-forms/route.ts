import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// GET - List all forms (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'

    let query = `
      SELECT
        cf.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM custom_form_submissions WHERE form_id = cf.id) as submission_count
      FROM custom_forms cf
      LEFT JOIN users u ON cf.created_by = u.id
    `;

    const params: any[] = [];

    if (status === 'active') {
      query += ' WHERE cf.is_active = TRUE';
    } else if (status === 'inactive') {
      query += ' WHERE cf.is_active = FALSE';
    }

    query += ' ORDER BY cf.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return NextResponse.json({ forms: rows });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// POST - Create new form (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, fields, settings, is_active, start_date, end_date } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Title dan fields diperlukan' }, { status: 400 });
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let slugExists = true;
    let counter = 0;

    while (slugExists) {
      const checkSlug = counter === 0 ? slug : `${slug}-${counter}`;
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM custom_forms WHERE slug = ?',
        [checkSlug]
      );
      if (existing.length === 0) {
        slug = checkSlug;
        slugExists = false;
      } else {
        counter++;
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO custom_forms (title, description, slug, fields, settings, is_active, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        slug,
        JSON.stringify(fields),
        settings ? JSON.stringify(settings) : null,
        is_active || false,
        start_date || null,
        end_date || null,
        session.user.id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Form berjaya dicipta',
      id: result.insertId,
      slug
    });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
