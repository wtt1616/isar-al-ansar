import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List submissions for a form (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get form to verify it exists
    const [formRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, title, fields FROM custom_forms WHERE id = ?',
      [params.id]
    );

    if (formRows.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    const form = formRows[0];

    // Get submissions with pagination
    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM custom_form_submissions
       WHERE form_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [params.id, limit, offset]
    );

    // Get total count
    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM custom_form_submissions WHERE form_id = ?',
      [params.id]
    );
    const total = countResult[0].total;

    // Parse JSON data in submissions
    const parsedSubmissions = submissions.map(sub => ({
      ...sub,
      data: typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data,
      files: sub.files ? (typeof sub.files === 'string' ? JSON.parse(sub.files) : sub.files) : null
    }));

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        fields: typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields
      },
      submissions: parsedSubmissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// POST - Submit form (public)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get form and check if it's active
    const [formRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, title, fields, is_active, start_date, end_date FROM custom_forms WHERE id = ?',
      [params.id]
    );

    if (formRows.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    const form = formRows[0];

    // Check if form is active
    if (!form.is_active) {
      return NextResponse.json({ error: 'Form ini tidak aktif' }, { status: 400 });
    }

    // Check date range
    const now = new Date();
    if (form.start_date && new Date(form.start_date) > now) {
      return NextResponse.json({ error: 'Pendaftaran belum dibuka' }, { status: 400 });
    }
    if (form.end_date && new Date(form.end_date) < now) {
      return NextResponse.json({ error: 'Pendaftaran telah ditutup' }, { status: 400 });
    }

    const body = await request.json();
    const { data, files } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Data tidak sah' }, { status: 400 });
    }

    // Validate required fields
    const fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;
    const missingFields: string[] = [];

    for (const field of fields) {
      if (field.required && (!data[field.id] || data[field.id] === '')) {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Sila lengkapkan: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    // Insert submission
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO custom_form_submissions (form_id, data, files, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        params.id,
        JSON.stringify(data),
        files ? JSON.stringify(files) : null,
        ip,
        userAgent
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berjaya dihantar',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// DELETE - Delete a submission (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID diperlukan' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM custom_form_submissions WHERE id = ? AND form_id = ?',
      [submissionId, params.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Submission berjaya dipadam'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
