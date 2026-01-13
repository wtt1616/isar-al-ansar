import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

const FORM_SLUG = 'iftar-al-ansar-2026';

// Field IDs from the form
const FIELD_IDS = {
  jumlah_tajaan: 'field_1767323460661_7175ib3',
  nama_penaja: 'field_1767323533404_uokfuik',
  nama_pic: 'field_1767323590975_0suogkx',
  no_tel: 'field_1767323612059_lmttw2i',
  alamat: 'field_1767323656709_phnoljw'
};

const AMOUNT_VALUES: { [key: string]: number } = {
  'RM130 (1 lot)': 130,
  'RM650 (5 lot)': 650,
  'RM1300 (10 lot)': 1300,
  'RM 3900 (sehari)': 3900
};

interface SubmissionData {
  [key: string]: string | string[];
}

// GET - Export iftar submissions to CSV (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form ID
    const [forms] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM custom_forms WHERE slug = ?',
      [FORM_SLUG]
    );

    if (!forms || forms.length === 0) {
      return NextResponse.json({ error: 'Form tidak dijumpai' }, { status: 404 });
    }

    const formId = forms[0].id;

    // Get all submissions
    const [submissions] = await pool.query<RowDataPacket[]>(
      'SELECT id, data, created_at FROM custom_form_submissions WHERE form_id = ? ORDER BY created_at ASC',
      [formId]
    );

    // Create CSV content with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const headers = ['No', 'Nama Penaja', 'Nama PIC', 'No Telefon', 'Alamat', 'Jumlah Tajaan', 'Nilai (RM)', 'Tarikh Daftar'];

    let csvContent = BOM + headers.join(',') + '\n';

    let counter = 1;
    submissions.forEach((sub: RowDataPacket) => {
      const data: SubmissionData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;

      const jumlahTajaan = data[FIELD_IDS.jumlah_tajaan] || [];
      const amounts = Array.isArray(jumlahTajaan) ? jumlahTajaan : [jumlahTajaan];
      const totalValue = amounts.reduce((sum: number, amount: string) => sum + (AMOUNT_VALUES[amount] || 0), 0);

      const createdAt = new Date(sub.created_at).toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const values = [
        counter++,
        `"${(data[FIELD_IDS.nama_penaja] || '').toString().replace(/"/g, '""')}"`,
        `"${(data[FIELD_IDS.nama_pic] || '').toString().replace(/"/g, '""')}"`,
        `"${data[FIELD_IDS.no_tel] || ''}"`,
        `"${(data[FIELD_IDS.alamat] || '').toString().replace(/"/g, '""')}"`,
        `"${amounts.join('; ')}"`,
        totalValue,
        `"${createdAt}"`
      ];
      csvContent += values.join(',') + '\n';
    });

    // Return as downloadable CSV
    const filename = `iftar_al_ansar_2026.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error exporting iftar data:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
