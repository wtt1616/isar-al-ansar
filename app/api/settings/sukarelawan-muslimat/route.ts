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

const DEFAULT_HARI_OPTIONS = 'Isnin,Selasa,Rabu,Khamis,Jumaat,Sabtu,Ahad,Setiap Hari';

// GET - Fetch sukarelawan muslimat settings (public for tahun_aktif)
export async function GET() {
  try {
    const [rows] = await pool.query<SettingRow[]>(
      `SELECT setting_key, setting_value, setting_type
       FROM app_settings
       WHERE setting_key IN ('sukarelawan_muslimat_tahun_aktif', 'sukarelawan_muslimat_pendaftaran_aktif', 'sukarelawan_muslimat_hari_options')`
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
    if (!settings.sukarelawan_muslimat_tahun_aktif) {
      settings.sukarelawan_muslimat_tahun_aktif = new Date().getFullYear();
    }
    if (settings.sukarelawan_muslimat_pendaftaran_aktif === undefined) {
      settings.sukarelawan_muslimat_pendaftaran_aktif = true;
    }
    if (!settings.sukarelawan_muslimat_hari_options) {
      settings.sukarelawan_muslimat_hari_options = DEFAULT_HARI_OPTIONS;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching sukarelawan muslimat settings:', error);
    // Return default values on error
    return NextResponse.json({
      sukarelawan_muslimat_tahun_aktif: new Date().getFullYear(),
      sukarelawan_muslimat_pendaftaran_aktif: true,
      sukarelawan_muslimat_hari_options: DEFAULT_HARI_OPTIONS
    });
  }
}

// POST - Update sukarelawan muslimat settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('POST /api/settings/sukarelawan-muslimat - Session:', session?.user?.email, 'Role:', session?.user?.role);

    if (!session || session.user.role !== 'admin') {
      console.log('POST /api/settings/sukarelawan-muslimat - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tahun_aktif, pendaftaran_aktif, hari_options } = body;
    console.log('POST /api/settings/sukarelawan-muslimat - Body:', { tahun_aktif, pendaftaran_aktif, hari_options });

    if (tahun_aktif !== undefined) {
      const year = parseInt(tahun_aktif, 10);
      if (isNaN(year) || year < 2020 || year > 2100) {
        return NextResponse.json({ error: 'Tahun tidak sah' }, { status: 400 });
      }

      console.log('POST /api/settings/sukarelawan-muslimat - Updating tahun_aktif to:', year);
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
         VALUES ('sukarelawan_muslimat_tahun_aktif', ?, 'number', 'Tahun aktif pendaftaran sukarelawan muslimat', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [year.toString(), session.user.id]
      );
    }

    if (pendaftaran_aktif !== undefined) {
      const isActive = pendaftaran_aktif ? 'true' : 'false';
      console.log('POST /api/settings/sukarelawan-muslimat - Updating pendaftaran_aktif to:', isActive);
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
         VALUES ('sukarelawan_muslimat_pendaftaran_aktif', ?, 'boolean', 'Status pendaftaran sukarelawan muslimat', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [isActive, session.user.id]
      );
    }

    if (hari_options !== undefined) {
      // hari_options is a comma-separated string of enabled days
      console.log('POST /api/settings/sukarelawan-muslimat - Updating hari_options to:', hari_options);
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
         VALUES ('sukarelawan_muslimat_hari_options', ?, 'string', 'Pilihan hari bertugas muslimat (comma separated)', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [hari_options, session.user.id]
      );
    }

    console.log('POST /api/settings/sukarelawan-muslimat - Success');
    return NextResponse.json({ success: true, message: 'Tetapan dikemaskini' });
  } catch (error) {
    console.error('Error updating sukarelawan muslimat settings:', error);
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 });
  }
}
