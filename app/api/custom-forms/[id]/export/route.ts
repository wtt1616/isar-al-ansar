import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Export submissions to CSV
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
    const format = searchParams.get('format') || 'csv';

    // Get form with fields
    const [formRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, title, fields FROM custom_forms WHERE id = ?',
      [params.id]
    );

    if (formRows.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    const form = formRows[0];
    const fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

    // Get all submissions
    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM custom_form_submissions
       WHERE form_id = ?
       ORDER BY created_at DESC`,
      [params.id]
    );

    if (submissions.length === 0) {
      return NextResponse.json({ error: 'Tiada submission untuk dieksport' }, { status: 400 });
    }

    // Build CSV content
    const headers = ['No', 'Tarikh Hantar', ...fields.map((f: any) => f.label)];

    const rows = submissions.map((sub, index) => {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      const createdAt = new Date(sub.created_at).toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const rowData = [
        String(index + 1),
        createdAt,
        ...fields.map((field: any) => {
          const value = data[field.id];
          if (value === undefined || value === null) return '';
          if (Array.isArray(value)) return value.join(', ');
          return String(value);
        })
      ];

      return rowData;
    });

    // Generate CSV
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    const filename = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_submissions_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting submissions:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
