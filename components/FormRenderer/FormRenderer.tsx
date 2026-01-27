'use client';

import { useState } from 'react';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    fileTypes?: string[];
    maxFileSize?: number;
  };
}

interface FormRendererProps {
  formId: number;
  title: string;
  description?: string;
  fields: FormField[];
  onSuccess?: () => void;
}

export default function FormRenderer({ formId, title, description, fields, onSuccess }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const current = formData[fieldId] || [];
    const updated = checked
      ? [...current, option]
      : current.filter((o: string) => o !== option);
    handleChange(fieldId, updated);
  };

  const handleFileChange = async (fieldId: string, file: File | null, field: FormField) => {
    if (!file) return;

    // Validate file type
    if (field.validation?.fileTypes) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!field.validation.fileTypes.includes(ext || '')) {
        setErrors(prev => ({
          ...prev,
          [fieldId]: `Jenis fail tidak dibenarkan. Hanya ${field.validation?.fileTypes?.join(', ')} sahaja.`
        }));
        return;
      }
    }

    // Validate file size
    const maxSize = (field.validation?.maxFileSize || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: `Saiz fail melebihi had ${field.validation?.maxFileSize || 5}MB`
      }));
      return;
    }

    setFiles(prev => ({ ...prev, [fieldId]: file }));
    handleChange(fieldId, file.name);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      // Skip validation for display-only fields
      if (field.type === 'heading' || field.type === 'paragraph') {
        return;
      }

      const value = formData[field.id];

      // Required check
      if (field.required) {
        if (value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'Ruangan ini wajib diisi';
          return;
        }
      }

      // Skip other validations if empty and not required
      if (!value || (Array.isArray(value) && value.length === 0)) return;

      // String length validation
      if (field.validation?.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
        newErrors[field.id] = `Minimum ${field.validation.minLength} aksara`;
      }
      if (field.validation?.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
        newErrors[field.id] = `Maximum ${field.validation.maxLength} aksara`;
      }

      // Number validation
      if (field.type === 'number' && value) {
        const num = parseFloat(value);
        if (field.validation?.min !== undefined && num < field.validation.min) {
          newErrors[field.id] = `Nilai minimum adalah ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          newErrors[field.id] = `Nilai maksimum adalah ${field.validation.max}`;
        }
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.id] = 'Format email tidak sah';
        }
      }

      // Phone validation
      if (field.type === 'phone' && value) {
        const phoneRegex = /^[\d\s\-+()]{8,15}$/;
        if (!phoneRegex.test(value)) {
          newErrors[field.id] = 'Format nombor telefon tidak sah';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // Upload files first if any
      const fileUrls: Record<string, string> = {};

      for (const [fieldId, file] of Object.entries(files)) {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('formId', formId.toString());

        const uploadRes = await fetch('/api/custom-forms/upload', {
          method: 'POST',
          body: uploadData
        });

        if (!uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          throw new Error(uploadResult.error || 'Ralat muat naik fail');
        }

        const uploadResult = await uploadRes.json();
        fileUrls[fieldId] = uploadResult.url;
      }

      // Submit form data
      const submitData = { ...formData };

      // Replace file field values with URLs
      for (const [fieldId, url] of Object.entries(fileUrls)) {
        submitData[fieldId] = url;
      }

      const res = await fetch(`/api/custom-forms/${formId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: submitData,
          files: Object.keys(fileUrls).length > 0 ? fileUrls : null
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Ralat menghantar borang');
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-5">
        <div className="mb-4">
          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
        </div>
        <h3 className="mb-3">Pendaftaran Berjaya!</h3>
        <p className="text-muted mb-4">
          Terima kasih kerana mengisi borang ini. Maklumat anda telah direkodkan.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSubmitted(false);
            setFormData({});
            setFiles({});
          }}
        >
          <i className="bi bi-plus-circle me-1"></i>Isi Borang Baru
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h4 className="mb-2">{title}</h4>
      {description && <p className="text-muted mb-4">{description}</p>}

      {submitError && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {submitError}
        </div>
      )}

      {fields.map((field) => (
        <div key={field.id} className={field.type === 'heading' ? 'mb-2 mt-4' : 'mb-3'}>
          {field.type !== 'heading' && field.type !== 'paragraph' && (
            <label className="form-label">
              {field.label}
              {field.required && <span className="text-danger ms-1">*</span>}
            </label>
          )}

          {renderField(field, formData[field.id], (value) => handleChange(field.id, value), (option, checked) => handleCheckboxChange(field.id, option, checked), (file) => handleFileChange(field.id, file, field))}

          {errors[field.id] && (
            <div className="text-danger small mt-1">
              <i className="bi bi-exclamation-circle me-1"></i>
              {errors[field.id]}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        className="btn btn-primary w-100 py-2 mt-3"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2"></span>
            Menghantar...
          </>
        ) : (
          <>
            <i className="bi bi-send me-2"></i>Hantar
          </>
        )}
      </button>
    </form>
  );
}

function renderField(
  field: FormField,
  value: any,
  onChange: (value: any) => void,
  onCheckboxChange: (option: string, checked: boolean) => void,
  onFileChange: (file: File | null) => void
) {
  switch (field.type) {
    case 'heading':
      return (
        <div className="border-bottom pb-2">
          <h5 className="mb-0 text-primary">{field.placeholder || field.label}</h5>
        </div>
      );

    case 'paragraph':
      return (
        <div className="text-muted">
          {field.placeholder || field.label}
        </div>
      );

    case 'text':
      return (
        <input
          type="text"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          minLength={field.validation?.minLength}
          maxLength={field.validation?.maxLength}
        />
      );

    case 'email':
      return (
        <input
          type="email"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'contoh@email.com'}
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '012-3456789'}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case 'textarea':
      return (
        <textarea
          className="form-control"
          rows={4}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          minLength={field.validation?.minLength}
          maxLength={field.validation?.maxLength}
        ></textarea>
      );

    case 'dropdown':
      return (
        <select
          className="form-select"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Pilih...</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div>
          {field.options?.map((opt, i) => (
            <div className="form-check" key={i}>
              <input
                type="radio"
                className="form-check-input"
                name={field.id}
                id={`${field.id}_${i}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              <label className="form-check-label" htmlFor={`${field.id}_${i}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          {field.options?.map((opt, i) => (
            <div className="form-check" key={i}>
              <input
                type="checkbox"
                className="form-check-input"
                id={`${field.id}_${i}`}
                checked={(value || []).includes(opt)}
                onChange={(e) => onCheckboxChange(opt, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={`${field.id}_${i}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>
      );

    case 'multiselect':
      return (
        <select
          className="form-select"
          multiple
          style={{ height: '120px' }}
          value={value || []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, opt => opt.value);
            onChange(selected);
          }}
        >
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'date':
      return (
        <input
          type="date"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'time':
      return (
        <input
          type="time"
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'file':
      return (
        <>
          <input
            type="file"
            className="form-control"
            accept={field.validation?.fileTypes?.map(t => `.${t}`).join(',')}
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          {field.validation?.fileTypes && (
            <small className="text-muted d-block mt-1">
              Jenis fail: {field.validation.fileTypes.join(', ')}. Max {field.validation.maxFileSize || 5}MB
            </small>
          )}
          {value && <small className="text-success d-block mt-1"><i className="bi bi-check-circle me-1"></i>{value}</small>}
        </>
      );

    default:
      return null;
  }
}
