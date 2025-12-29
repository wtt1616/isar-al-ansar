'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Pengumuman {
  id: number;
  tajuk: string;
  keterangan: string | null;
  tarikh_mula: string;
  tarikh_akhir: string;
  status: 'aktif' | 'tidak_aktif';
  url: string | null;
  imej: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

const initialFormData = {
  id: null as number | null,
  tajuk: '',
  keterangan: '',
  tarikh_mula: '',
  tarikh_akhir: '',
  status: 'aktif' as 'aktif' | 'tidak_aktif',
  url: '',
  imej: null as File | null,
  removeImage: false
};

export default function PengumumanAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch('/api/pengumuman?admin=true');
      const result = await res.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: Pengumuman) => {
    if (item) {
      setFormData({
        id: item.id,
        tajuk: item.tajuk,
        keterangan: item.keterangan || '',
        tarikh_mula: item.tarikh_mula.split('T')[0],
        tarikh_akhir: item.tarikh_akhir.split('T')[0],
        status: item.status,
        url: item.url || '',
        imej: null,
        removeImage: false
      });
      setExistingImage(item.imej);
      setPreviewImage(null);
    } else {
      setFormData(initialFormData);
      setExistingImage(null);
      setPreviewImage(null);
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setPreviewImage(null);
    setExistingImage(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imej: file, removeImage: false }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imej: null, removeImage: true }));
    setPreviewImage(null);
    setExistingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      if (formData.id) submitData.append('id', formData.id.toString());
      submitData.append('tajuk', formData.tajuk);
      submitData.append('keterangan', formData.keterangan);
      submitData.append('tarikh_mula', formData.tarikh_mula);
      submitData.append('tarikh_akhir', formData.tarikh_akhir);
      submitData.append('status', formData.status);
      submitData.append('url', formData.url);
      if (formData.imej) submitData.append('imej', formData.imej);
      if (formData.removeImage) submitData.append('removeImage', 'true');

      const res = await fetch('/api/pengumuman', {
        method: formData.id ? 'PUT' : 'POST',
        body: submitData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Ralat semasa menyimpan');
      }

      handleCloseModal();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Adakah anda pasti mahu memadam pengumuman ini?')) return;

    try {
      const res = await fetch(`/api/pengumuman?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleToggleStatus = async (item: Pengumuman) => {
    try {
      const submitData = new FormData();
      submitData.append('id', item.id.toString());
      submitData.append('tajuk', item.tajuk);
      submitData.append('keterangan', item.keterangan || '');
      submitData.append('tarikh_mula', item.tarikh_mula.split('T')[0]);
      submitData.append('tarikh_akhir', item.tarikh_akhir.split('T')[0]);
      submitData.append('status', item.status === 'aktif' ? 'tidak_aktif' : 'aktif');
      submitData.append('url', item.url || '');

      const res = await fetch('/api/pengumuman', {
        method: 'PUT',
        body: submitData
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const isActive = (item: Pengumuman) => {
    const today = new Date().toISOString().split('T')[0];
    return item.status === 'aktif' &&
           item.tarikh_mula <= today &&
           item.tarikh_akhir >= today;
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
            <i className="bi bi-megaphone-fill text-primary me-2"></i>
            Pengurusan Pengumuman
          </h4>
          <p className="text-muted mb-0">Urus pengumuman yang dipaparkan di halaman login</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-lg me-1"></i> Tambah Pengumuman
          </button>
          <button className="btn btn-outline-secondary" onClick={() => router.back()}>
            <i className="bi bi-arrow-left me-1"></i> Kembali
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '80px' }}>Imej</th>
                  <th>Tajuk</th>
                  <th>Tempoh</th>
                  <th>Status</th>
                  <th>URL</th>
                  <th className="text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      Tiada pengumuman dijumpai
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.imej ? (
                          <img
                            src={`/uploads/pengumuman/${item.imej}`}
                            alt={item.tajuk}
                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '60px', height: '40px', borderRadius: '4px' }}>
                            <i className="bi bi-image text-muted"></i>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-medium">{item.tajuk}</div>
                        {item.keterangan && (
                          <small className="text-muted d-block" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.keterangan}
                          </small>
                        )}
                      </td>
                      <td>
                        <small>
                          {new Date(item.tarikh_mula).toLocaleDateString('ms-MY')} - {new Date(item.tarikh_akhir).toLocaleDateString('ms-MY')}
                        </small>
                      </td>
                      <td>
                        {isActive(item) ? (
                          <span className="badge bg-success">
                            <i className="bi bi-broadcast me-1"></i>Sedang Aktif
                          </span>
                        ) : item.status === 'aktif' ? (
                          <span className="badge bg-info">Aktif (Belum/Tamat)</span>
                        ) : (
                          <span className="badge bg-secondary">Tidak Aktif</span>
                        )}
                      </td>
                      <td>
                        {item.url ? (
                          <a href={item.url} target="_blank" className="btn btn-sm btn-outline-primary">
                            <i className="bi bi-link-45deg"></i>
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            className={`btn ${item.status === 'aktif' ? 'btn-warning' : 'btn-success'}`}
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === 'aktif' ? 'Nyahaktifkan' : 'Aktifkan'}
                          >
                            <i className={`bi ${item.status === 'aktif' ? 'bi-pause' : 'bi-play'}`}></i>
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleOpenModal(item)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-danger"
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

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-megaphone me-2"></i>
                  {formData.id ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
                </h5>
                <button className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Tajuk */}
                    <div className="col-12">
                      <label className="form-label">Tajuk Pengumuman <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="tajuk"
                        value={formData.tajuk}
                        onChange={handleInputChange}
                        required
                        placeholder="Contoh: Pendaftaran Tadarus Al-Quran"
                      />
                    </div>

                    {/* Keterangan */}
                    <div className="col-12">
                      <label className="form-label">Keterangan</label>
                      <textarea
                        className="form-control"
                        name="keterangan"
                        value={formData.keterangan}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Keterangan lanjut tentang pengumuman..."
                      ></textarea>
                    </div>

                    {/* Tarikh */}
                    <div className="col-md-6">
                      <label className="form-label">Tarikh Mula <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        name="tarikh_mula"
                        value={formData.tarikh_mula}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tarikh Akhir <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        name="tarikh_akhir"
                        value={formData.tarikh_akhir}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Status */}
                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="aktif">Aktif</option>
                        <option value="tidak_aktif">Tidak Aktif</option>
                      </select>
                    </div>

                    {/* URL */}
                    <div className="col-md-6">
                      <label className="form-label">URL (Pilihan)</label>
                      <input
                        type="url"
                        className="form-control"
                        name="url"
                        value={formData.url}
                        onChange={handleInputChange}
                        placeholder="https://..."
                      />
                    </div>

                    {/* Imej */}
                    <div className="col-12">
                      <label className="form-label">Imej (Pilihan)</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                      <small className="text-muted">Format: JPG, PNG, GIF. Saiz maksimum: 2MB</small>

                      {/* Image Preview */}
                      {(previewImage || existingImage) && (
                        <div className="mt-2 position-relative d-inline-block">
                          <img
                            src={previewImage || `/uploads/pengumuman/${existingImage}`}
                            alt="Preview"
                            style={{ maxHeight: '150px', borderRadius: '8px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={handleRemoveImage}
                            style={{ transform: 'translate(50%, -50%)' }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {formData.id ? 'Kemaskini' : 'Simpan'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
