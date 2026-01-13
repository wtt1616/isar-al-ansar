'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CustomForm {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  submission_count: number;
  created_by_name: string;
  created_at: string;
}

// Mapping of form slugs to their dashboard URLs
const FORM_DASHBOARDS: { [slug: string]: string } = {
  'iftar-al-ansar-2026': '/dashboard/iftar-ramadhan'
};

export default function FormsListPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchForms();
    }
  }, [session, filter]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/custom-forms${params}`);
      const result = await res.json();
      setForms(result.forms || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Adakah anda pasti mahu memadam form ini? Semua submissions juga akan dipadam.')) return;

    try {
      const res = await fetch(`/api/custom-forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchForms();
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const handleToggleActive = async (form: CustomForm) => {
    try {
      const res = await fetch(`/api/custom-forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !form.is_active })
      });

      if (res.ok) {
        fetchForms();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/forms/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link telah disalin!');
  };

  const isFormOpen = (form: CustomForm) => {
    if (!form.is_active) return false;
    const now = new Date();
    if (form.start_date && new Date(form.start_date) > now) return false;
    if (form.end_date && new Date(form.end_date) < now) return false;
    return true;
  };

  if (authStatus === 'loading' || loading) {
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
            <i className="bi bi-ui-checks-grid text-primary me-2"></i>
            Pengurusan Borang
          </h4>
          <p className="text-muted mb-0">Bina dan urus borang pendaftaran untuk public</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/forms/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i> Buat Borang Baru
          </Link>
          <Link href="/dashboard" className="btn btn-outline-secondary">
            <i className="bi bi-speedometer2 me-1"></i> Dashboard
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <ul className="nav nav-pills">
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Semua ({forms.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                <i className="bi bi-check-circle me-1"></i> Aktif
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'inactive' ? 'active' : ''}`}
                onClick={() => setFilter('inactive')}
              >
                <i className="bi bi-x-circle me-1"></i> Tidak Aktif
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Forms Grid */}
      {forms.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
            <h5 className="text-muted">Tiada borang dijumpai</h5>
            <p className="text-muted mb-3">Mulakan dengan mencipta borang pertama anda</p>
            <Link href="/admin/forms/new" className="btn btn-primary">
              <i className="bi bi-plus-lg me-1"></i> Buat Borang Baru
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {forms.map((form) => (
            <div key={form.id} className="col-md-6 col-lg-4">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    {isFormOpen(form) ? (
                      <span className="badge bg-success">
                        <i className="bi bi-broadcast me-1"></i>Terbuka
                      </span>
                    ) : form.is_active ? (
                      <span className="badge bg-info">Aktif (Belum/Tamat)</span>
                    ) : (
                      <span className="badge bg-secondary">Tidak Aktif</span>
                    )}
                  </div>
                  <div className="dropdown">
                    <button className="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <Link href={`/admin/forms/${form.id}/edit`} className="dropdown-item">
                          <i className="bi bi-pencil me-2"></i>Edit Borang
                        </Link>
                      </li>
                      <li>
                        <Link href={`/admin/forms/${form.id}/submissions`} className="dropdown-item">
                          <i className="bi bi-list-check me-2"></i>Lihat Submissions
                        </Link>
                      </li>
                      <li>
                        <button className="dropdown-item" onClick={() => copyPublicLink(form.slug)}>
                          <i className="bi bi-link-45deg me-2"></i>Salin Link
                        </button>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => handleToggleActive(form)}
                        >
                          {form.is_active ? (
                            <><i className="bi bi-pause me-2"></i>Nyahaktifkan</>
                          ) : (
                            <><i className="bi bi-play me-2"></i>Aktifkan</>
                          )}
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => handleDelete(form.id)}
                        >
                          <i className="bi bi-trash me-2"></i>Padam
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <h5 className="card-title mb-2">{form.title}</h5>
                  {form.description && (
                    <p className="card-text text-muted small mb-3" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {form.description}
                    </p>
                  )}

                  <div className="d-flex gap-3 text-muted small mb-3">
                    <span>
                      <i className="bi bi-people me-1"></i>
                      {form.submission_count} pendaftaran
                    </span>
                    <span>
                      <i className="bi bi-link-45deg me-1"></i>
                      /{form.slug}
                    </span>
                  </div>

                  {(form.start_date || form.end_date) && (
                    <div className="small text-muted">
                      <i className="bi bi-calendar-range me-1"></i>
                      {form.start_date && new Date(form.start_date).toLocaleDateString('ms-MY')}
                      {form.start_date && form.end_date && ' - '}
                      {form.end_date && new Date(form.end_date).toLocaleDateString('ms-MY')}
                    </div>
                  )}
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  <div className="d-flex gap-2">
                    {FORM_DASHBOARDS[form.slug] && (
                      <Link
                        href={FORM_DASHBOARDS[form.slug]}
                        className="btn btn-success btn-sm"
                        title="Dashboard"
                      >
                        <i className="bi bi-speedometer2"></i>
                      </Link>
                    )}
                    <Link
                      href={`/admin/forms/${form.id}/submissions`}
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                    >
                      <i className="bi bi-list-check me-1"></i>Submissions
                    </Link>
                    <Link
                      href={`/admin/forms/${form.id}/edit`}
                      className="btn btn-primary btn-sm flex-grow-1"
                    >
                      <i className="bi bi-pencil me-1"></i>Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
