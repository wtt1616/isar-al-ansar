'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Sukarelawan {
  id: number;
  tahun: number;
  nama_penuh: string;
  no_telefon: string;
  zon_tempat_tinggal: string;
  size_baju: string;
  hari_bertugas: string;
  status: 'pending' | 'approved' | 'rejected';
  catatan: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface HariStat {
  hari_bertugas: string;
  count: number;
}

interface SizeStat {
  size_baju: string;
  count: number;
}

interface SettingsData {
  sukarelawan_tahun_aktif: number;
  sukarelawan_pendaftaran_aktif: boolean;
}

const HARI_OPTIONS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad', 'Setiap Hari'];

export default function SukarelawanRamadhanAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [data, setData] = useState<Sukarelawan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hariStats, setHariStats] = useState<HariStat[]>([]);
  const [sizeStats, setSizeStats] = useState<SizeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(currentYear.toString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [hariFilter, setHariFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Sukarelawan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SettingsData>({
    sukarelawan_tahun_aktif: currentYear,
    sukarelawan_pendaftaran_aktif: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchSettings();
      fetchData();
    }
  }, [session, tahun, statusFilter, hariFilter]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/sukarelawan');
      const data = await res.json();
      setSettings({
        sukarelawan_tahun_aktif: data.sukarelawan_tahun_aktif || currentYear,
        sukarelawan_pendaftaran_aktif: data.sukarelawan_pendaftaran_aktif !== false
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/settings/sukarelawan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun_aktif: settings.sukarelawan_tahun_aktif,
          pendaftaran_aktif: settings.sukarelawan_pendaftaran_aktif
        })
      });

      if (res.ok) {
        setShowSettingsModal(false);
        alert('Tetapan berjaya dikemaskini');
      } else {
        alert('Ralat kemaskini tetapan');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ralat kemaskini tetapan');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        tahun,
        status: statusFilter,
        hari: hariFilter
      });
      const res = await fetch(`/api/sukarelawan-ramadhan?${params}`);
      const result = await res.json();
      setData(result.data || []);
      setStats(result.stats || null);
      setHariStats(result.hariStats || []);
      setSizeStats(result.sizeStats || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string, catatan?: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/sukarelawan-ramadhan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, catatan })
      });

      if (res.ok) {
        fetchData();
        setShowModal(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Adakah anda pasti mahu memadam pendaftaran ini?')) return;

    try {
      const res = await fetch(`/api/sukarelawan-ramadhan?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      tahun,
      status: statusFilter
    });
    window.open(`/api/sukarelawan-ramadhan/export?${params}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="badge bg-success">Diluluskan</span>;
      case 'rejected':
        return <span className="badge bg-danger">Ditolak</span>;
      default:
        return <span className="badge bg-warning text-dark">Menunggu</span>;
    }
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
            <i className="bi bi-people-fill text-success me-2"></i>
            Sukarelawan Ramadhan {tahun}
          </h4>
          <p className="text-muted mb-0">Pengurusan pendaftaran sukarelawan</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setShowSettingsModal(true)}>
            <i className="bi bi-gear me-1"></i> Tetapan
          </button>
          <button className="btn btn-success" onClick={handleExport}>
            <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
          </button>
          <button className="btn btn-outline-secondary" onClick={() => router.back()}>
            <i className="bi bi-arrow-left me-1"></i> Kembali
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card bg-primary text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Jumlah</h6>
                    <h2 className="mb-0">{stats.total}</h2>
                  </div>
                  <i className="bi bi-people fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card bg-warning text-dark h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Menunggu</h6>
                    <h2 className="mb-0">{stats.pending}</h2>
                  </div>
                  <i className="bi bi-hourglass-split fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card bg-success text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Diluluskan</h6>
                    <h2 className="mb-0">{stats.approved}</h2>
                  </div>
                  <i className="bi bi-check-circle fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card bg-danger text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-subtitle mb-2 opacity-75">Ditolak</h6>
                    <h2 className="mb-0">{stats.rejected}</h2>
                  </div>
                  <i className="bi bi-x-circle fs-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Status Bar */}
      <div className="alert alert-light border mb-4 d-flex align-items-center justify-content-between">
        <div>
          <i className="bi bi-info-circle me-2"></i>
          <strong>Borang Awam:</strong>{' '}
          Tahun <strong>{settings.sukarelawan_tahun_aktif}</strong> |{' '}
          {settings.sukarelawan_pendaftaran_aktif ? (
            <span className="text-success">
              <i className="bi bi-check-circle me-1"></i>Dibuka
            </span>
          ) : (
            <span className="text-danger">
              <i className="bi bi-x-circle me-1"></i>Ditutup
            </span>
          )}
        </div>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowSettingsModal(true)}
        >
          <i className="bi bi-gear me-1"></i>Ubah
        </button>
      </div>

      {/* Stats by Hari and Size */}
      <div className="row g-3 mb-4">
        {/* Hari Stats */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <i className="bi bi-calendar-week me-1"></i> Statistik Hari Bertugas (Diluluskan)
            </div>
            <div className="card-body">
              <div className="row g-2">
                {HARI_OPTIONS.map(hari => {
                  const stat = hariStats.find(s => s.hari_bertugas === hari);
                  return (
                    <div key={hari} className="col-6 col-md-4 col-lg-3">
                      <div className="border rounded p-2 text-center">
                        <div className="small text-muted">{hari}</div>
                        <div className="fw-bold">{stat?.count || 0}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Size Stats */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <i className="bi bi-tag me-1"></i> Statistik Size Baju (Diluluskan)
            </div>
            <div className="card-body">
              <div className="row g-2">
                {sizeStats.map(stat => (
                  <div key={stat.size_baju} className="col-4 col-md-3">
                    <div className="border rounded p-2 text-center">
                      <div className="small text-muted">{stat.size_baju}</div>
                      <div className="fw-bold">{stat.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Tahun</label>
              <select
                className="form-select"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Diluluskan</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Hari Bertugas</label>
              <select
                className="form-select"
                value={hariFilter}
                onChange={(e) => setHariFilter(e.target.value)}
              >
                <option value="all">Semua Hari</option>
                {HARI_OPTIONS.map(hari => (
                  <option key={hari} value={hari}>{hari}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-primary w-100" onClick={fetchData}>
                <i className="bi bi-arrow-clockwise me-1"></i> Muat Semula
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Nama</th>
                  <th>No Telefon</th>
                  <th>Zon</th>
                  <th>Size</th>
                  <th>Hari</th>
                  <th>Status</th>
                  <th>Tarikh Daftar</th>
                  <th className="text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      Tiada pendaftaran dijumpai
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="fw-medium">{item.nama_penuh}</td>
                      <td>
                        <a href={`https://wa.me/6${item.no_telefon.replace(/^0/, '').replace(/-/g, '')}`} target="_blank" className="text-decoration-none">
                          <i className="bi bi-whatsapp text-success me-1"></i>
                          {item.no_telefon}
                        </a>
                      </td>
                      <td>{item.zon_tempat_tinggal}</td>
                      <td><span className="badge bg-secondary">{item.size_baju}</span></td>
                      <td>{item.hari_bertugas}</td>
                      <td>{getStatusBadge(item.status)}</td>
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
                          {item.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-success"
                                onClick={() => handleStatusChange(item.id, 'approved')}
                                title="Luluskan"
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowModal(true);
                                }}
                                title="Tolak"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          )}
                          {item.status !== 'pending' && (
                            <button
                              className="btn btn-warning"
                              onClick={() => handleStatusChange(item.id, 'pending')}
                              title="Set Menunggu"
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                          )}
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

      {/* Reject Modal */}
      {showModal && selectedItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tolak Pendaftaran</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleStatusChange(selectedItem.id, 'rejected', formData.get('catatan') as string);
              }}>
                <div className="modal-body">
                  <p>Adakah anda pasti mahu menolak pendaftaran <strong>{selectedItem.nama_penuh}</strong>?</p>
                  <div className="mb-3">
                    <label className="form-label">Catatan (pilihan)</label>
                    <textarea
                      name="catatan"
                      className="form-control"
                      rows={3}
                      placeholder="Sebab penolakan..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                    {actionLoading ? 'Memproses...' : 'Tolak Pendaftaran'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-gear me-2"></i>
                  Tetapan Pendaftaran Sukarelawan
                </h5>
                <button className="btn-close" onClick={() => setShowSettingsModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Tahun Aktif</label>
                  <select
                    className="form-select"
                    value={settings.sukarelawan_tahun_aktif}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      sukarelawan_tahun_aktif: parseInt(e.target.value, 10)
                    }))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <div className="form-text">
                    Tahun yang akan dipaparkan pada borang pendaftaran awam.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Status Pendaftaran</label>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="pendaftaranSwitch"
                      checked={settings.sukarelawan_pendaftaran_aktif}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        sukarelawan_pendaftaran_aktif: e.target.checked
                      }))}
                    />
                    <label className="form-check-label" htmlFor="pendaftaranSwitch">
                      {settings.sukarelawan_pendaftaran_aktif ? (
                        <span className="text-success fw-medium">
                          <i className="bi bi-check-circle me-1"></i>
                          Pendaftaran Dibuka
                        </span>
                      ) : (
                        <span className="text-danger fw-medium">
                          <i className="bi bi-x-circle me-1"></i>
                          Pendaftaran Ditutup
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="form-text">
                    Jika ditutup, borang pendaftaran awam akan memaparkan mesej pendaftaran ditutup.
                  </div>
                </div>

                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Link borang awam:</strong>
                  <br />
                  <code className="user-select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/sukarelawan-ramadhan</code>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveSettings}
                  disabled={settingsLoading}
                >
                  {settingsLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Simpan Tetapan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
