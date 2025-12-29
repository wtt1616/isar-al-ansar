import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface SettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string;
  setting_type: string;
}

// GET - Fetch sukarelawan settings (public for tahun_aktif)
export async function GET() {
  try {
    const [rows] = await pool.query<SettingRow[]>(
      `SELECT setting_key, setting_value, setting_type
       FROM app_settings
       WHERE setting_key IN ('sukarelawan_tahun_aktif', 'sukarelawan_pendaftaran_aktif')`
    );

    const settings: Record<string, any> = {};
    rows.forEach(row => {
      if (row.setting_type === 'number') {
        settings[row.setting_key] = parseInt(row.setting_value, 10);
      } else if (row.setting_type === 'boolean') {
        settings[row.setting_key] = row.setting_value === 'true';
      } else {
        settings[row.setting_key] = row.setting_value;
      }
    });

    // Default values if not found
    if (!settings.sukarelawan_tahun_aktif) {
      settings.sukarelawan_tahun_aktif = new Date().getFullYear();
    }
    if (settings.sukarelawan_pendaftaran_aktif === undefined) {
      settings.sukarelawan_pendaftaran_aktif = true;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching sukarelawan settings:', error);
    // Return default values on error
    return NextResponse.json({
      sukarelawan_tahun_aktif: new Date().getFullYear(),
      sukarelawan_pendaftaran_aktif: true
    });
  }
}

// POST - Update sukarelawan settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('PUT /api/settings/sukarelawan - Session:', session?.user?.email, 'Role:', session?.user?.role);

    if (!session || session.user.role !== 'admin') {
      console.log('PUT /api/settings/sukarelawan - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tahun_aktif, pendaftaran_aktif } = body;
    console.log('PUT /api/settings/sukarelawan - Body:', { tahun_aktif, pendaftaran_aktif });

    if (tahun_aktif !== undefined) {
      const year = parseInt(tahun_aktif, 10);
      if (isNaN(year) || year < 2020 || year > 2100) {
        return NextResponse.json({ error: 'Tahun tidak sah' }, { status: 400 });
      }

      console.log('PUT /api/settings/sukarelawan - Updating tahun_aktif to:', year);
      await pool.query(
        `UPDATE app_settings SET setting_value = ?, updated_by = ? WHERE setting_key = 'sukarelawan_tahun_aktif'`,
        [year.toString(), session.user.id]
      );
    }

    if (pendaftaran_aktif !== undefined) {
      const isActive = pendaftaran_aktif ? 'true' : 'false';
      console.log('PUT /api/settings/sukarelawan - Updating pendaftaran_aktif to:', isActive);
      await pool.query(
        `UPDATE app_settings SET setting_value = ?, updated_by = ? WHERE setting_key = 'sukarelawan_pendaftaran_aktif'`,
        [isActive, session.user.id]
      );
    }

    console.log('PUT /api/settings/sukarelawan - Success');
    return NextResponse.json({ success: true, message: 'Tetapan dikemaskini' });
  } catch (error) {
    console.error('Error updating sukarelawan settings:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
