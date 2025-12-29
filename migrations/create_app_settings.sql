-- Migration: Create app_settings table
-- Date: 2025-12-29
-- Purpose: Store application-wide settings including Sukarelawan Ramadhan active year

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description VARCHAR(255),
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
('sukarelawan_tahun_aktif', YEAR(CURDATE()), 'number', 'Tahun aktif untuk pendaftaran Sukarelawan Ramadhan'),
('sukarelawan_pendaftaran_aktif', 'true', 'boolean', 'Status pendaftaran Sukarelawan Ramadhan (true=buka, false=tutup)')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
