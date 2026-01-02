import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Get public form by slug (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, description, slug, fields, settings, start_date, end_date
       FROM custom_forms
       WHERE slug = ? AND is_active = TRUE`,
      [params.slug]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai atau tidak aktif' }, { status: 404 });
    }

    const form = rows[0];

    // Check date range
    const now = new Date();
    if (form.start_date && new Date(form.start_date) > now) {
      return NextResponse.json({
        error: 'Pendaftaran belum dibuka',
        start_date: form.start_date
      }, { status: 400 });
    }
    if (form.end_date && new Date(form.end_date) < now) {
      return NextResponse.json({
        error: 'Pendaftaran telah ditutup',
        end_date: form.end_date
      }, { status: 400 });
    }

    // Parse JSON fields
    if (typeof form.fields === 'string') {
      form.fields = JSON.parse(form.fields);
    }
    if (form.settings && typeof form.settings === 'string') {
      form.settings = JSON.parse(form.settings);
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error fetching public form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
