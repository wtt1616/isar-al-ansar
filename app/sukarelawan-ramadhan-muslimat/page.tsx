'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ZON_OPTIONS = ['Zon 2', 'Zon 3', 'Zon 4', 'AEE'];
const SIZE_BAJU_OPTIONS = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '5XL', '7XL'];
const ALL_HARI_OPTIONS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad', 'Setiap Hari'];

export default function SukarelawanRamadhanMuslimatPage() {
  const [tahunAktif, setTahunAktif] = useState<number>(new Date().getFullYear());
  const [pendaftaranAktif, setPendaftaranAktif] = useState<boolean>(true);
  const [hariOptions, setHariOptions] = useState<string[]>(ALL_HARI_OPTIONS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [formData, setFormData] = useState({
    nama_penuh: '',
    no_telefon: '',
    zon_tempat_tinggal: '',
    size_baju: '',
    hari_bertugas: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/sukarelawan-muslimat');
        const data = await res.json();
        setTahunAktif(data.sukarelawan_muslimat_tahun_aktif || new Date().getFullYear());
        setPendaftaranAktif(data.sukarelawan_muslimat_pendaftaran_aktif !== false);
        // Parse hari options from comma-separated string
        if (data.sukarelawan_muslimat_hari_options) {
          const enabledDays = data.sukarelawan_muslimat_hari_options.split(',').map((d: string) => d.trim()).filter((d: string) => d);
          setHariOptions(enabledDays.length > 0 ? enabledDays : ALL_HARI_OPTIONS);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.nama_penuh || !formData.no_telefon || !formData.zon_tempat_tinggal ||
        !formData.size_baju || formData.hari_bertugas.length === 0) {
      setError('Sila lengkapkan semua maklumat yang diperlukan');
      setLoading(false);
      return;
    }

    try {
      // Join multiple days with comma for storage
      const submitData = {
        ...formData,
        hari_bertugas: formData.hari_bertugas.join(', '),
        tahun: tahunAktif
      };
      const res = await fetch('/api/sukarelawan-ramadhan-muslimat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ralat semasa mendaftar');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Loading state
  if (settingsLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #6a1b5d 0%, #9c4d8b 100%)' }}>
        <div className="text-center text-white">
          <div className="spinner-border spinner-border-lg mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Memuatkan...</p>
        </div>
      </div>
    );
  }

  // Registration closed
  if (!pendaftaranAktif) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #6a1b5d 0%, #9c4d8b 100%)' }}>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-calendar-x-fill text-warning" style={{ fontSize: '5rem' }}></i>
                  </div>
                  <h3 className="text-warning mb-3">Pendaftaran Ditutup</h3>
                  <p className="text-muted mb-4">
                    Pendaftaran Sukarelawan Ramadhan Muslimat {tahunAktif} telah ditutup buat sementara waktu.
                    Sila hubungi pihak surau untuk maklumat lanjut.
                  </p>
                  <Link href="/" className="btn btn-lg mt-3" style={{ backgroundColor: '#9c4d8b', color: 'white' }}>
                    <i className="bi bi-house me-2"></i>Kembali ke Laman Utama
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #6a1b5d 0%, #9c4d8b 100%)' }}>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '5rem', color: '#9c4d8b' }}></i>
                  </div>
                  <h3 style={{ color: '#6a1b5d' }} className="mb-3">Pendaftaran Berjaya!</h3>
                  <p className="text-muted mb-4">
                    Terima kasih kerana mendaftar sebagai Sukarelawan Ramadhan Muslimat {tahunAktif}.
                    Pihak surau akan menghubungi anda untuk pengesahan.
                  </p>
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Sila tunggu panggilan atau mesej WhatsApp daripada pihak surau.
                  </div>
                  <Link href="/" className="btn btn-lg mt-3" style={{ backgroundColor: '#9c4d8b', color: 'white' }}>
                    <i className="bi bi-house me-2"></i>Kembali ke Laman Utama
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #6a1b5d 0%, #9c4d8b 100%)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            {/* Header */}
            <div className="text-center text-white mb-4">
              <div className="mb-3">
                <i className="bi bi-moon-stars-fill" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="fw-bold mb-2">PENDAFTARAN SUKARELAWAN RAMADHAN</h2>
              <h4 className="fw-normal mb-3">MUSLIMAT SURAU AL-ANSAR TAHUN {tahunAktif}</h4>
              <p className="opacity-75">
                <i className="bi bi-geo-alt me-1"></i>
                Surau Al-Ansar, Bandar Tun Hussein Onn
              </p>
            </div>

            {/* Info Card */}
            <div className="card shadow-lg border-0 mb-4">
              <div className="card-body p-4" style={{ fontSize: '0.85rem' }}>
                <p className="mb-3">
                  Sebagai persediaan menghadapi ketibaan bulan Ramadhan yang mulia, seperti tahun-tahun sebelum ini pihak Surau Al-Ansar akan membuka peluang kepada para ahli kariah untuk menjadi <strong>SUKARELAWAN RAMADHAN</strong>. Iftar tahun {tahunAktif} akan disediakan secara buffet dan pek moreh dan berikut adalah antara bidang tugas SUKARELAWAN:
                </p>

                <div className="mb-3">
                  <p className="fw-bold mb-2" style={{ color: '#6a1b5d' }}>
                    A. SEBELUM BERBUKA (SUKARELAWAN MULA HADIR KE SAA PUKUL 6:00 PETANG)
                  </p>
                  <ol className="mb-0 ps-3">
                    <li>Menghampar tikar untuk Jemaah berbuka.</li>
                    <li>Menyusun bekas makanan dan minuman dan memastikan semua peralatan katerer tersedia di meja hidangan muslimin dan muslimat.</li>
                    <li>Memastikan plastik sampah telah disediakan dalam tong sampah di kawasan muslimin dan muslimat.</li>
                    <li>Jemaah boleh mula mengambil makanan setengah jam sebelum waktu berbuka dan sukarelawan akan mengendalikan agihan makanan.</li>
                    <li>Memastikan tiada aktiviti membungkus makanan sebelum waktu berbuka.</li>
                  </ol>
                </div>

                <div>
                  <p className="fw-bold mb-2" style={{ color: '#6a1b5d' }}>
                    B. SELEPAS BERBUKA
                  </p>
                  <ol className="mb-0 ps-3">
                    <li>Mengulung tikar dan membersihkan kawasan jemaah berbuka.</li>
                    <li>Membungkus makanan yang berlebihan (jika ada) untuk para Jemaah.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="card shadow-lg border-0">
              <div className="card-header py-3" style={{ backgroundColor: '#9c4d8b', color: 'white' }}>
                <h5 className="mb-0">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Borang Pendaftaran Muslimat
                </h5>
              </div>
              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Tahun */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-calendar me-1" style={{ color: '#9c4d8b' }}></i>
                      Tahun
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light"
                      value={tahunAktif}
                      readOnly
                      disabled
                    />
                  </div>

                  {/* Nama Penuh */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-person me-1" style={{ color: '#9c4d8b' }}></i>
                      Nama Penuh <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="nama_penuh"
                      value={formData.nama_penuh}
                      onChange={handleChange}
                      placeholder="Masukkan nama penuh seperti dalam IC"
                      required
                    />
                  </div>

                  {/* No Telefon */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-telephone me-1" style={{ color: '#9c4d8b' }}></i>
                      Nombor Telefon <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control form-control-lg"
                      name="no_telefon"
                      value={formData.no_telefon}
                      onChange={handleChange}
                      placeholder="Contoh: 012-3456789"
                      required
                    />
                  </div>

                  {/* Zon Tempat Tinggal */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-geo-alt me-1" style={{ color: '#9c4d8b' }}></i>
                      Zon Tempat Tinggal <span className="text-danger">*</span>
                    </label>
                    <div className="row g-2">
                      {ZON_OPTIONS.map((zon) => (
                        <div key={zon} className="col-6 col-md-3">
                          <input
                            type="radio"
                            className="btn-check"
                            name="zon_tempat_tinggal"
                            id={`zon-${zon}`}
                            value={zon}
                            checked={formData.zon_tempat_tinggal === zon}
                            onChange={handleChange}
                            required
                          />
                          <label className="btn btn-outline-secondary w-100" htmlFor={`zon-${zon}`} style={formData.zon_tempat_tinggal === zon ? { backgroundColor: '#9c4d8b', color: 'white', borderColor: '#9c4d8b' } : {}}>
                            {zon}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Size Baju */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-tag me-1" style={{ color: '#9c4d8b' }}></i>
                      Size Baju <span className="text-danger">*</span>
                    </label>
                    <div className="row g-2">
                      {SIZE_BAJU_OPTIONS.map((size) => (
                        <div key={size} className="col-4 col-md-3 col-lg-2">
                          <input
                            type="radio"
                            className="btn-check"
                            name="size_baju"
                            id={`size-${size}`}
                            value={size}
                            checked={formData.size_baju === size}
                            onChange={handleChange}
                            required
                          />
                          <label className="btn btn-outline-secondary w-100" htmlFor={`size-${size}`} style={formData.size_baju === size ? { backgroundColor: '#9c4d8b', color: 'white', borderColor: '#9c4d8b' } : {}}>
                            {size}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hari Bertugas */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-calendar-week me-1" style={{ color: '#9c4d8b' }}></i>
                      Hari Bertugas <span className="text-danger">*</span>
                    </label>
                    <p className="text-muted small mb-2">
                      <i className="bi bi-info-circle me-1"></i>
                      Boleh pilih lebih dari satu hari. Pihak surau tidak menjamin hari yang dipilih dan mungkin akan menukarnya mengikut keperluan.
                    </p>
                    <div className="row g-2">
                      {hariOptions.map((hari) => {
                        const isSelected = formData.hari_bertugas.includes(hari);
                        return (
                          <div key={hari} className="col-6 col-md-3">
                            <input
                              type="checkbox"
                              className="btn-check"
                              id={`hari-${hari}`}
                              value={hari}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add to array
                                  setFormData(prev => ({
                                    ...prev,
                                    hari_bertugas: [...prev.hari_bertugas, hari]
                                  }));
                                } else {
                                  // Remove from array
                                  setFormData(prev => ({
                                    ...prev,
                                    hari_bertugas: prev.hari_bertugas.filter(h => h !== hari)
                                  }));
                                }
                              }}
                            />
                            <label
                              className="btn w-100"
                              htmlFor={`hari-${hari}`}
                              style={isSelected ?
                                (hari === 'Setiap Hari' ? { backgroundColor: '#6a1b5d', color: 'white', borderColor: '#6a1b5d' } : { backgroundColor: '#9c4d8b', color: 'white', borderColor: '#9c4d8b' }) :
                                (hari === 'Setiap Hari' ? { borderColor: '#6a1b5d', color: '#6a1b5d' } : { borderColor: '#9c4d8b', color: '#9c4d8b' })
                              }
                            >
                              {isSelected && <i className="bi bi-check-lg me-1"></i>}
                              {hari}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {formData.hari_bertugas.length > 0 && (
                      <div className="mt-2">
                        <small style={{ color: '#9c4d8b' }}>
                          <i className="bi bi-check-circle me-1"></i>
                          Dipilih: {formData.hari_bertugas.join(', ')}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid gap-2 mt-5">
                    <button
                      type="submit"
                      className="btn btn-lg py-3"
                      style={{ backgroundColor: '#9c4d8b', color: 'white' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Menghantar...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-2"></i>
                          Hantar Pendaftaran
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-white mt-4">
              <p className="small opacity-75">
                <i className="bi bi-envelope me-1"></i>
                Sebarang pertanyaan sila hubungi pihak surau
              </p>
              <Link href="/" className="btn btn-outline-light btn-sm">
                <i className="bi bi-arrow-left me-1"></i>
                Kembali
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
