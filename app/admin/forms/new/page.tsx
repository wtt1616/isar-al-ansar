'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FormBuilder } from '@/components/FormBuilder';
import { FormField } from '@/components/FormBuilder/FieldTypes';

export default function NewFormPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Sila masukkan tajuk borang');
      return;
    }

    if (fields.length === 0) {
      setError('Sila tambah sekurang-kurangnya satu field');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/custom-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          fields,
          is_active: isActive,
          start_date: startDate || null,
          end_date: endDate || null
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Ralat menyimpan borang');
      }

      router.push('/admin/forms');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">Anda tidak mempunyai akses ke halaman ini.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <i className="bi bi-plus-circle text-primary me-2"></i>
            Buat Borang Baru
          </h4>
          <p className="text-muted mb-0">Bina borang pendaftaran untuk public</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-info"
            onClick={() => setShowPreview(!showPreview)}
          >
            <i className={`bi ${showPreview ? 'bi-pencil' : 'bi-eye'} me-1`}></i>
            {showPreview ? 'Editor' : 'Preview'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Menyimpan...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1"></i>Simpan
              </>
            )}
          </button>
          <button className="btn btn-outline-secondary" onClick={() => router.back()}>
            <i className="bi bi-x me-1"></i>Batal
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Form Settings */}
      <div className="card mb-4">
        <div className="card-header py-2">
          <h6 className="mb-0">
            <i className="bi bi-gear me-2"></i>
            Tetapan Borang
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Tajuk Borang <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pendaftaran Program Tadarus"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Keterangan</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan ringkas tentang borang"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Tarikh Mula</label>
              <input
                type="datetime-local"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <small className="text-muted">Bila pendaftaran dibuka</small>
            </div>
            <div className="col-md-3">
              <label className="form-label">Tarikh Tamat</label>
              <input
                type="datetime-local"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <small className="text-muted">Bila pendaftaran ditutup</small>
            </div>
            <div className="col-md-3 d-flex align-items-center">
              <div className="form-check form-switch mt-4">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isActive">
                  Aktifkan Borang
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Builder or Preview */}
      {showPreview ? (
        <div className="card">
          <div className="card-header py-2">
            <h6 className="mb-0">
              <i className="bi bi-eye me-2"></i>
              Preview Borang
            </h6>
          </div>
          <div className="card-body">
            <div className="mx-auto" style={{ maxWidth: '600px' }}>
              <h4 className="mb-2">{title || 'Tajuk Borang'}</h4>
              {description && <p className="text-muted">{description}</p>}
              <hr />
              {fields.length === 0 ? (
                <p className="text-muted text-center py-4">Tiada field untuk dipaparkan</p>
              ) : (
                <form>
                  {fields.map((field) => (
                    <div key={field.id} className="mb-3">
                      <label className="form-label">
                        {field.label}
                        {field.required && <span className="text-danger ms-1">*</span>}
                      </label>
                      {renderFormField(field)}
                    </div>
                  ))}
                  <button type="button" className="btn btn-primary w-100">
                    <i className="bi bi-send me-1"></i>Hantar
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        <FormBuilder fields={fields} onChange={setFields} />
      )}
    </div>
  );
}

function renderFormField(field: FormField) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return <input type={field.type === 'phone' ? 'tel' : field.type} className="form-control" placeholder={field.placeholder} />;
    case 'number':
      return <input type="number" className="form-control" placeholder={field.placeholder} min={field.validation?.min} max={field.validation?.max} />;
    case 'textarea':
      return <textarea className="form-control" rows={3} placeholder={field.placeholder}></textarea>;
    case 'dropdown':
      return (
        <select className="form-select">
          <option value="">Pilih...</option>
          {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div>
          {field.options?.map((opt, i) => (
            <div className="form-check" key={i}>
              <input type="radio" className="form-check-input" name={field.id} id={`${field.id}_${i}`} />
              <label className="form-check-label" htmlFor={`${field.id}_${i}`}>{opt}</label>
            </div>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div>
          {field.options?.map((opt, i) => (
            <div className="form-check" key={i}>
              <input type="checkbox" className="form-check-input" id={`${field.id}_${i}`} />
              <label className="form-check-label" htmlFor={`${field.id}_${i}`}>{opt}</label>
            </div>
          ))}
        </div>
      );
    case 'multiselect':
      return (
        <select className="form-select" multiple style={{ height: '100px' }}>
          {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      );
    case 'date':
      return <input type="date" className="form-control" />;
    case 'time':
      return <input type="time" className="form-control" />;
    case 'file':
      return (
        <>
          <input type="file" className="form-control" accept={field.validation?.fileTypes?.map(t => `.${t}`).join(',')} />
          {field.validation?.fileTypes && (
            <small className="text-muted">Jenis fail: {field.validation.fileTypes.join(', ')}</small>
          )}
        </>
      );
    default:
      return null;
  }
}
