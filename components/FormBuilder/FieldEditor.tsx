'use client';

import { useState, useEffect } from 'react';
import { FormField, FIELD_TYPES } from './FieldTypes';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onClose: () => void;
}

export default function FieldEditor({ field, onUpdate, onClose }: FieldEditorProps) {
  const [editedField, setEditedField] = useState<FormField>({ ...field });
  const [optionsText, setOptionsText] = useState(field.options?.join('\n') || '');

  const fieldConfig = FIELD_TYPES.find(f => f.type === field.type);

  const handleChange = (key: keyof FormField, value: any) => {
    setEditedField(prev => ({ ...prev, [key]: value }));
  };

  const handleValidationChange = (key: string, value: any) => {
    setEditedField(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value
      }
    }));
  };

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text.split('\n').filter(line => line.trim() !== '');
    setEditedField(prev => ({ ...prev, options }));
  };

  const handleSave = () => {
    onUpdate(editedField);
    onClose();
  };

  return (
    <div className="card shadow-lg" style={{ position: 'absolute', right: 0, top: 0, width: '350px', zIndex: 1000 }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <i className={`${fieldConfig?.icon} me-2`}></i>
          Edit Field
        </h6>
        <button className="btn btn-sm btn-link text-muted p-0" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Label */}
        <div className="mb-3">
          <label className="form-label small fw-medium">Label</label>
          <input
            type="text"
            className="form-control form-control-sm"
            value={editedField.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Label field"
          />
        </div>

        {/* Content for heading and paragraph */}
        {['heading', 'paragraph'].includes(field.type) && (
          <div className="mb-3">
            <label className="form-label small fw-medium">
              {field.type === 'heading' ? 'Teks Tajuk' : 'Teks Keterangan'}
            </label>
            {field.type === 'heading' ? (
              <input
                type="text"
                className="form-control form-control-sm"
                value={editedField.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                placeholder="Masukkan tajuk seksyen..."
              />
            ) : (
              <textarea
                className="form-control form-control-sm"
                rows={4}
                value={editedField.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                placeholder="Masukkan keterangan atau arahan..."
              ></textarea>
            )}
          </div>
        )}

        {/* Placeholder for input fields */}
        {!['checkbox', 'radio', 'date', 'time', 'file', 'heading', 'paragraph'].includes(field.type) && (
          <div className="mb-3">
            <label className="form-label small fw-medium">Placeholder</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={editedField.placeholder || ''}
              onChange={(e) => handleChange('placeholder', e.target.value)}
              placeholder="Contoh placeholder..."
            />
          </div>
        )}

        {/* Required - not for heading/paragraph */}
        {!['heading', 'paragraph'].includes(field.type) && (
          <div className="mb-3">
            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id="fieldRequired"
                checked={editedField.required}
                onChange={(e) => handleChange('required', e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="fieldRequired">
                Wajib diisi
              </label>
            </div>
          </div>
        )}

        {/* Options (for dropdown, radio, checkbox, multiselect) */}
        {fieldConfig?.hasOptions && (
          <div className="mb-3">
            <label className="form-label small fw-medium">Pilihan (satu per baris)</label>
            <textarea
              className="form-control form-control-sm"
              rows={5}
              value={optionsText}
              onChange={(e) => handleOptionsChange(e.target.value)}
              placeholder="Pilihan 1&#10;Pilihan 2&#10;Pilihan 3"
            ></textarea>
            <small className="text-muted">
              {editedField.options?.length || 0} pilihan
            </small>
          </div>
        )}

        {/* Validation - Text fields */}
        {['text', 'textarea', 'email', 'phone'].includes(field.type) && (
          <>
            <hr />
            <h6 className="small fw-medium mb-3">Validasi</h6>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small">Min. aksara</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={editedField.validation?.minLength || ''}
                  onChange={(e) => handleValidationChange('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                />
              </div>
              <div className="col-6">
                <label className="form-label small">Max. aksara</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={editedField.validation?.maxLength || ''}
                  onChange={(e) => handleValidationChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                />
              </div>
            </div>
          </>
        )}

        {/* Validation - Number fields */}
        {field.type === 'number' && (
          <>
            <hr />
            <h6 className="small fw-medium mb-3">Validasi</h6>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small">Nilai minimum</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={editedField.validation?.min ?? ''}
                  onChange={(e) => handleValidationChange('min', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="col-6">
                <label className="form-label small">Nilai maksimum</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={editedField.validation?.max ?? ''}
                  onChange={(e) => handleValidationChange('max', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>
          </>
        )}

        {/* Validation - File fields */}
        {field.type === 'file' && (
          <>
            <hr />
            <h6 className="small fw-medium mb-3">Validasi Fail</h6>
            <div className="mb-3">
              <label className="form-label small">Jenis fail dibenarkan</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={editedField.validation?.fileTypes?.join(', ') || 'jpg, png, pdf'}
                onChange={(e) => handleValidationChange('fileTypes', e.target.value.split(',').map(s => s.trim()))}
                placeholder="jpg, png, pdf"
              />
            </div>
            <div className="mb-3">
              <label className="form-label small">Saiz maksimum (MB)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={editedField.validation?.maxFileSize || 5}
                onChange={(e) => handleValidationChange('maxFileSize', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>
          </>
        )}
      </div>
      <div className="card-footer d-flex gap-2">
        <button className="btn btn-secondary btn-sm flex-grow-1" onClick={onClose}>
          Batal
        </button>
        <button className="btn btn-primary btn-sm flex-grow-1" onClick={handleSave}>
          <i className="bi bi-check-lg me-1"></i>Simpan
        </button>
      </div>
    </div>
  );
}
