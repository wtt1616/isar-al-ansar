'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface FormField {
  id: string;
  type: string;
  label: string;
}

interface Submission {
  id: number;
  data: Record<string, any>;
  files: Record<string, string> | null;
  ip_address: string;
  created_at: string;
}

interface FormInfo {
  id: number;
  title: string;
  fields: FormField[];
}

export default function SubmissionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter submissions based on search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;

    const query = searchQuery.toLowerCase().trim();
    return submissions.filter(sub => {
      // Search in all field values
      const dataValues = Object.values(sub.data || {});
      for (const value of dataValues) {
        if (value === null || value === undefined) continue;

        if (Array.isArray(value)) {
          if (value.some(v => String(v).toLowerCase().includes(query))) {
            return true;
          }
        } else if (String(value).toLowerCase().includes(query)) {
          return true;
        }
      }
      return false;
    });
  }, [submissions, searchQuery]);

  useEffect(() => {
    if (session?.user?.role === 'admin' && formId) {
      fetchSubmissions();
    }
  }, [session, formId, pagination.page]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-forms/${formId}/submissions?page=${pagination.page}&limit=${pagination.limit}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error);
      }

      setForm(result.form);
      setSubmissions(result.submissions);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId: number) => {
    if (!confirm('Adakah anda pasti mahu memadam submission ini?')) return;

    try {
      const res = await fetch(`/api/custom-forms/${formId}/submissions?submissionId=${submissionId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchSubmissions();
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/custom-forms/${formId}/export`);

      if (!res.ok) {
        const result = await res.json();
        alert(result.error || 'Ralat eksport');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions_${formId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Ralat eksport data');
    } finally {
      setExporting(false);
    }
  };

  const formatValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (fieldType === 'file' && typeof value === 'string') {
      return (
        <a href={value} target="_blank" className="btn btn-sm btn-outline-primary">
          <i className="bi bi-file-earmark me-1"></i>Lihat Fail
        </a>
      );
    }
    return String(value);
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
            <i className="bi bi-list-check text-primary me-2"></i>
            Submissions
          </h4>
          <p className="text-muted mb-0">{form?.title} - {pagination.total} pendaftaran</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={handleExport}
            disabled={exporting || submissions.length === 0}
          >
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Exporting...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-excel me-1"></i>Export CSV
              </>
            )}
          </button>
          <Link href={`/admin/forms/${formId}/edit`} className="btn btn-outline-primary">
            <i className="bi bi-pencil me-1"></i>Edit Borang
          </Link>
          <button className="btn btn-outline-secondary" onClick={() => router.push('/admin/forms')}>
            <i className="bi bi-arrow-left me-1"></i>Kembali
          </button>
        </div>
      </div>

      <div className="row">
        {/* Submissions Table */}
        <div className={selectedSubmission ? 'col-md-7' : 'col-12'}>
          <div className="card">
            {/* Search Filter */}
            <div className="card-header bg-white py-2">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Cari dalam semua field..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setSearchQuery('')}
                        title="Clear search"
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-md-6 text-md-end mt-2 mt-md-0">
                  <small className="text-muted">
                    {searchQuery ? (
                      <>Menunjukkan {filteredSubmissions.length} daripada {submissions.length} rekod</>
                    ) : (
                      <>{submissions.length} rekod</>
                    )}
                  </small>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '50px' }}>No</th>
                      {/* Show first 5 fields as columns */}
                      {form?.fields.slice(0, 5).map((field) => (
                        <th key={field.id} style={{ minWidth: '120px' }}>
                          {field.label}
                        </th>
                      ))}
                      <th style={{ width: '150px' }}>Tarikh</th>
                      <th style={{ width: '90px' }} className="text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={(form?.fields.slice(0, 5).length || 0) + 3} className="text-center py-4 text-muted">
                          <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                          {searchQuery ? 'Tiada rekod dijumpai' : 'Tiada submissions lagi'}
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub, index) => {
                        return (
                          <tr
                            key={sub.id}
                            className={selectedSubmission?.id === sub.id ? 'table-active' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedSubmission(sub)}
                          >
                            <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                            {/* Show first 5 field values */}
                            {form?.fields.slice(0, 5).map((field) => {
                              const value = sub.data[field.id];
                              let displayValue = '-';

                              if (value !== null && value !== undefined && value !== '') {
                                if (Array.isArray(value)) {
                                  displayValue = value.join(', ');
                                } else if (field.type === 'file' && typeof value === 'string') {
                                  return (
                                    <td key={field.id}>
                                      <a href={value} target="_blank" className="btn btn-sm btn-outline-primary py-0 px-1">
                                        <i className="bi bi-file-earmark"></i>
                                      </a>
                                    </td>
                                  );
                                } else {
                                  displayValue = String(value);
                                }
                              }

                              return (
                                <td key={field.id}>
                                  <span style={{
                                    display: 'block',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }} title={displayValue}>
                                    {displayValue}
                                  </span>
                                </td>
                              );
                            })}
                            <td>
                              <small>
                                {new Date(sub.created_at).toLocaleString('ms-MY', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); }}
                                  title="Lihat"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                                  title="Padam"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <small className="text-muted">
                    Memaparkan {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} daripada {pagination.total}
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
                        if (pageNum > pagination.totalPages) return null;
                        return (
                          <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submission Detail */}
        {selectedSubmission && (
          <div className="col-md-5">
            <div className="card sticky-top" style={{ top: '1rem' }}>
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h6 className="mb-0">
                  <i className="bi bi-file-text me-2"></i>
                  Detail Submission
                </h6>
                <button
                  className="btn btn-sm btn-link text-muted p-0"
                  onClick={() => setSelectedSubmission(null)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="mb-3 pb-3 border-bottom">
                  <small className="text-muted d-block">Tarikh Hantar</small>
                  <strong>
                    {new Date(selectedSubmission.created_at).toLocaleString('ms-MY', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                </div>

                {form?.fields.map((field) => (
                  <div key={field.id} className="mb-3">
                    <small className="text-muted d-block">{field.label}</small>
                    <div className="fw-medium">
                      {formatValue(selectedSubmission.data[field.id], field.type)}
                    </div>
                  </div>
                ))}

                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted d-block">IP Address</small>
                  <code className="small">{selectedSubmission.ip_address}</code>
                </div>
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-danger btn-sm w-100"
                  onClick={() => handleDelete(selectedSubmission.id)}
                >
                  <i className="bi bi-trash me-1"></i>Padam Submission
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
