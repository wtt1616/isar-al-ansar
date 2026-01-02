-- Migration: Create Custom Forms Tables
-- Date: 2025-01-02
-- Description: Tables for custom form builder module

-- Table for storing form definitions
CREATE TABLE IF NOT EXISTS custom_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  fields JSON NOT NULL,
  settings JSON,
  is_active BOOLEAN DEFAULT FALSE,
  start_date DATETIME,
  end_date DATETIME,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_slug (slug),
  INDEX idx_active (is_active),
  INDEX idx_dates (start_date, end_date)
);

-- Table for storing form submissions
CREATE TABLE IF NOT EXISTS custom_form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  data JSON NOT NULL,
  files JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES custom_forms(id) ON DELETE CASCADE,
  INDEX idx_form_id (form_id),
  INDEX idx_created_at (created_at)
);

-- Example fields JSON structure:
-- [
--   {
--     "id": "uuid-1",
--     "type": "text",
--     "label": "Nama Penuh",
--     "placeholder": "Masukkan nama penuh",
--     "required": true,
--     "order": 1
--   },
--   {
--     "id": "uuid-2",
--     "type": "dropdown",
--     "label": "Jantina",
--     "options": ["Lelaki", "Perempuan"],
--     "required": true,
--     "order": 2
--   }
-- ]
