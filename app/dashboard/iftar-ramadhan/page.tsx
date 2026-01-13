'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Submission {
  id: number;
  jumlah_tajaan: string[];
  nama_penaja: string;
  nama_pic: string;
  no_tel: string;
  alamat: string;
  created_at: string;
}

interface Stats {
  total: number;
  by_amount: {
    [key: string]: number;
  };
  total_value: number;
}

const AMOUNT_OPTIONS = [
  { label: 'RM130 (1 lot)', value: 130 },
  { label: 'RM650 (5 lot)', value: 650 },
  { label: 'RM1300 (10 lot)', value: 1300 },
  { label: 'RM 3900 (sehari)', value: 3900 }
];

export default function IftarDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Submission | null>(null);
  const [showModal, setShowModal] = useState(false);

  const themeColor = '#e67e22';
  const themeBgLight = '#fef5e7';

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/iftar-ramadhan');
      const result = await res.json();

      if (result.success) {
        setSubmissions(result.data || []);
        setStats(result.stats || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Adakah anda pasti mahu memadam rekod ini?')) return;

    try {
      const res = await fetch(`/api/dashboard/iftar-ramadhan?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
        alert('Rekod berjaya dipadam');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleExport = () => {
    window.open('/api/dashboard/iftar-ramadhan/export', '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getAmountValue = (label: string): number => {
    const option = AMOUNT_OPTIONS.find(opt => opt.label === label);
    return option?.value || 0;
  };

  const getTotalForSubmission = (jumlah: string[]): number => {
    return jumlah.reduce((sum, label) => sum + getAmountValue(label), 0);
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status" style={{ color: themeColor }}>
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
            <i className="bi bi-cup-hot-fill me-2" style={{ color: themeColor }}></i>
            Dashboard Iftar Al-Ansar 2026
          </h4>
          <p className="text-muted mb-0">Pengurusan penajaan iftar dan moreh</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => router.push('/admin/forms')}>
            <i className="bi bi-arrow-left me-1"></i> Kembali
          </button>
          <button className="btn btn-outline-primary" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Muat Semula
          </button>
          <button className="btn" style={{ backgroundColor: themeColor, color: 'white' }} onClick={handleExport}>
            <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card text-white h-100" style={{ backgroundColor: themeColor }}>
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Jumlah Penaja</h6>
                    <h2 className="mb-0">{stats.total}</h2>
                  </div>
                  <i className="bi bi-people fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card bg-success text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Jumlah Tajaan</h6>
                    <h2 className="mb-0">{formatCurrency(stats.total_value)}</h2>
                  </div>
                  <i className="bi bi-cash-stack fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-3 text-muted">Pecahan Tajaan</h6>
                <div className="row g-2">
                  {AMOUNT_OPTIONS.map(opt => (
                    <div key={opt.label} className="col-6">
                      <div className="d-flex justify-content-between align-items-center p-2 rounded" style={{ backgroundColor: themeBgLight }}>
                        <span className="small">{opt.label}</span>
                        <span className="badge" style={{ backgroundColor: themeColor }}>
                          {stats.by_amount[opt.label] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card">
        <div className="card-header" style={{ backgroundColor: themeBgLight }}>
          <i className="bi bi-table me-2" style={{ color: themeColor }}></i>
          Senarai Penaja ({submissions.length})
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Nama Penaja</th>
                  <th>PIC</th>
                  <th>No. Tel</th>
                  <th>Jumlah Tajaan</th>
                  <th>Nilai</th>
                  <th>Tarikh Daftar</th>
                  <th className="text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      Tiada penajaan dijumpai
                    </td>
                  </tr>
                ) : (
                  submissions.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="fw-medium">{item.nama_penaja}</td>
                      <td>{item.nama_pic || '-'}</td>
                      <td>
                        <a href={`https://wa.me/6${item.no_tel.replace(/^0/, '').replace(/-/g, '')}`} target="_blank" className="text-decoration-none">
                          <i className="bi bi-whatsapp text-success me-1"></i>
                          {item.no_tel}
                        </a>
                      </td>
                      <td>
                        {item.jumlah_tajaan.map((j, i) => (
                          <span key={i} className="badge me-1 mb-1" style={{ backgroundColor: themeColor }}>
                            {j}
                          </span>
                        ))}
                      </td>
                      <td className="fw-bold text-success">
                        {formatCurrency(getTotalForSubmission(item.jumlah_tajaan))}
                      </td>
                      <td className="small">
                        {new Date(item.created_at).toLocaleDateString('ms-MY', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowModal(true);
                            }}
                            title="Lihat Detail"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(item.id)}
                            title="Padam"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: themeBgLight }}>
                <h5 className="modal-title">
                  <i className="bi bi-person-badge me-2" style={{ color: themeColor }}></i>
                  Detail Penaja
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>Nama Penaja</td>
                      <td className="fw-medium">{selectedItem.nama_penaja}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Nama PIC</td>
                      <td>{selectedItem.nama_pic || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">No. Telefon</td>
                      <td>
                        <a href={`https://wa.me/6${selectedItem.no_tel.replace(/^0/, '').replace(/-/g, '')}`} target="_blank" className="text-decoration-none">
                          <i className="bi bi-whatsapp text-success me-1"></i>
                          {selectedItem.no_tel}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Alamat</td>
                      <td>{selectedItem.alamat}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Jumlah Tajaan</td>
                      <td>
                        {selectedItem.jumlah_tajaan.map((j, i) => (
                          <span key={i} className="badge me-1" style={{ backgroundColor: themeColor }}>
                            {j}
                          </span>
                        ))}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Nilai Tajaan</td>
                      <td className="fw-bold text-success fs-5">
                        {formatCurrency(getTotalForSubmission(selectedItem.jumlah_tajaan))}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Tarikh Daftar</td>
                      <td>
                        {new Date(selectedItem.created_at).toLocaleDateString('ms-MY', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
