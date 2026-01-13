import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

// GET - Fetch iftar submissions (admin only)
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
      return NextResponse.json({
        success: true,
        data: [],
        stats: { total: 0, by_amount: {}, total_value: 0 }
      });
    }

    const formId = forms[0].id;

    // Get all submissions
    const [submissions] = await pool.query<RowDataPacket[]>(
      'SELECT id, data, created_at FROM custom_form_submissions WHERE form_id = ? ORDER BY created_at DESC',
      [formId]
    );

    // Process submissions
    const processedData = submissions.map((sub: RowDataPacket) => {
      const data: SubmissionData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;

      return {
        id: sub.id,
        jumlah_tajaan: data[FIELD_IDS.jumlah_tajaan] || [],
        nama_penaja: data[FIELD_IDS.nama_penaja] || '',
        nama_pic: data[FIELD_IDS.nama_pic] || '',
        no_tel: data[FIELD_IDS.no_tel] || '',
        alamat: data[FIELD_IDS.alamat] || '',
        created_at: sub.created_at
      };
    });

    // Calculate statistics
    const stats = {
      total: processedData.length,
      by_amount: {} as { [key: string]: number },
      total_value: 0
    };

    // Initialize amount counts
    Object.keys(AMOUNT_VALUES).forEach(key => {
      stats.by_amount[key] = 0;
    });

    // Calculate stats
    processedData.forEach(item => {
      const amounts = Array.isArray(item.jumlah_tajaan) ? item.jumlah_tajaan : [item.jumlah_tajaan];
      amounts.forEach((amount: string) => {
        if (stats.by_amount.hasOwnProperty(amount)) {
          stats.by_amount[amount]++;
        }
        stats.total_value += AMOUNT_VALUES[amount] || 0;
      });
    });

    return NextResponse.json({
      success: true,
      data: processedData,
      stats
    });
  } catch (error) {
    console.error('Error fetching iftar data:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}

// DELETE - Delete a submission (admin only)
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

    await pool.query<ResultSetHeader>(
      'DELETE FROM custom_form_submissions WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
