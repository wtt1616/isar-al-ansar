'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FormRenderer from '@/components/FormRenderer/FormRenderer';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: any;
}

interface PublicForm {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  settings: any;
  start_date: string | null;
  end_date: string | null;
}

export default function KhairatPage() {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; start_date?: string; end_date?: string } | null>(null);

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/custom-forms/public/khairat-kematian');
      const result = await res.json();

      if (!res.ok) {
        setError({
          message: result.error,
          start_date: result.start_date,
          end_date: result.end_date
        });
        return;
      }

      setForm(result.form);
    } catch (err: any) {
      setError({ message: 'Ralat memuatkan borang' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuatkan borang...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-circle text-warning" style={{ fontSize: '4rem' }}></i>
            <h4 className="mt-3 mb-2">{error.message}</h4>

            {error.start_date && (
              <p className="text-muted mb-0">
                Pendaftaran dibuka pada{' '}
                <strong>
                  {new Date(error.start_date).toLocaleDateString('ms-MY', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </strong>
              </p>
            )}

            {error.end_date && (
              <p className="text-muted mb-0">
                Pendaftaran telah ditutup pada{' '}
                <strong>
                  {new Date(error.end_date).toLocaleDateString('ms-MY', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </strong>
              </p>
            )}

            <div className="mt-4">
              <Link href="/" className="btn btn-success">
                <i className="bi bi-house me-1"></i>Kembali ke Halaman Utama
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            {/* Header */}
            <div className="text-center mb-4">
              <Link href="/" className="text-decoration-none">
                <div className="mb-2">
                  <i className="bi bi-people-fill text-success" style={{ fontSize: '3rem' }}></i>
                </div>
                <h5 className="text-success mb-0">Badan Khairat Kematian</h5>
                <small className="text-muted">Kariah Masjid BTHO</small>
              </Link>
            </div>

            {/* Form Card */}
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <FormRenderer
                  formId={form.id}
                  title={form.title}
                  description={form.description || undefined}
                  fields={form.fields}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <small className="text-muted">
                &copy; {new Date().getFullYear()} Masjid BTHO. Hak cipta terpelihara.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
