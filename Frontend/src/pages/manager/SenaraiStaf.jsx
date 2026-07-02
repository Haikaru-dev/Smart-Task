// src/pages/SenaraiStaf.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';
import Pagination from '../../components/Pagination';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function SenaraiStaf() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // State untuk Modal Tambah Staf
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccountInfo, setNewAccountInfo] = useState(null); // { name, username }

  // State untuk Panel Detail Staf
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Ambil Data Staf (silent = tiada spinner, untuk auto-refresh senyap)
  async function fetchStaff(silent = false) {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/staff`);
      const data = response.data.data || response.data;
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ralat mengambil data staf:', err);
      if (!silent) setError('Gagal memuat turun data staf.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchStaff();
  }, []);

  // ── Auto-refresh: senarai staf kekal terkini tanpa reload ──
  useAutoRefresh(() => fetchStaff(true));

  // Buka panel detail staf
  const handleUserCellClick = async (staffId) => {
    setDetailLoading(true);
    setSelectedStaff(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff/${staffId}`);
      setSelectedStaff(res.data.data || res.data);
    } catch (err) {
      console.error('Ralat mengambil profil staf:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Uruskan perubahan input borang
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Hantar borang Tambah Staf
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post(`${API_BASE_URL}/api/staff`, formData);
      setNewAccountInfo({ name: formData.name, username: response.data.username });
      setFormData({ name: '', role: '' });
      fetchStaff();
    } catch (err) {
      console.error('Ralat simpan staf:', err);
      alert('Gagal menambah staf. Sila pastikan backend sedang berjalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewAccountInfo(null);
  };

  // ── JSON-LD Data ──
  const PAGE_SIZE = 10;
  const paginatedStaff = staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Senarai Staf - SmartTask",
    "description": "Senarai lengkap staf dan peranan mereka di dalam sistem SmartTask.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Administrators and Managers"
    },
    "about": {
      "@type": "Thing",
      "name": "Senarai Pekerja dan Tenaga Kerja"
    }
  };

  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />
      {/* ── Page Header ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Senarai Staf</h1>
          <p className="page-subtitle">Urus tenaga kerja dan peranan staf</p>
        </div>
        <button 
          className="btn btn--primary" 
          onClick={() => setIsModalOpen(true)}
        >
          + Tambah Staf Baharu
        </button>
      </header>

      {error && (
        <div style={{ padding: '12px 20px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Jadual Staf ── */}
      <section className="section-card" aria-label="Jadual Staf">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Maklumat Staf
          </div>
        </header>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Staf</th>
                <th>Peranan / Fokus</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Memuatkan data...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Tiada staf direkodkan.</td>
                </tr>
              ) : (
                paginatedStaff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleUserCellClick(s.id)}
                    style={{ cursor: 'pointer' }}
                    title="Lihat detail staf"
                  >
                    <td>
                      <div className="user-cell">
                        <div className="user-initials-circle">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: '#1E293B' }}>{s.name}</span>
                          {s.username && (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{s.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{s.role}</td>
                    <td>
                      <span className={`badge ${s.status === 'Aktif' ? 'badge--success' : 'badge--danger'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={staff.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </section>

      {/* ── Panel Detail Staf ── */}
      {(detailLoading || selectedStaff) && (
        <div style={modalStyles.overlay} onClick={() => setSelectedStaff(null)}>
          <div style={detailPanelStyles.panel} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Profil Kakitangan</h2>
              <button style={modalStyles.closeBtn} onClick={() => setSelectedStaff(null)}>×</button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Memuatkan profil...</div>
            ) : selectedStaff && (
              <div style={modalStyles.body}>
                {/* Avatar + nama */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={detailPanelStyles.avatar}>
                    {selectedStaff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h3 style={{ margin: '12px 0 4px', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                    {selectedStaff.name}
                  </h3>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                    ID: ST-{String(selectedStaff.id).padStart(3, '0')}
                  </p>
                  <span className="badge badge--info" style={{ padding: '5px 14px', fontSize: '12px' }}>
                    {selectedStaff.role || 'Tiada Peranan'}
                  </span>
                </div>

                {/* Info grid */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Nama Penuh',       value: selectedStaff.name },
                    { label: 'Peranan / Jawatan', value: selectedStaff.role || '-' },
                    { label: 'Emel Rasmi',        value: selectedStaff.email || '-' },
                    { label: 'No. Telefon',       value: selectedStaff.phone_number || '-' },
                    { label: 'Status Pekerja',      value: null, badge: selectedStaff.status },
                    { label: 'Nama Pengguna (Login)', value: selectedStaff.username || '-' },
                  ].map(({ label, value, badge }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={detailPanelStyles.infoLabel}>{label}</span>
                      {badge ? (
                        <span className={`badge ${badge === 'Aktif' ? 'badge--success' : 'badge--danger'}`} style={{ width: 'fit-content' }}>{badge}</span>
                      ) : (
                        <span style={detailPanelStyles.infoValue}>{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Tambah Staf ── */}
      {isModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Tambah Staf Baharu</h2>
              <button style={modalStyles.closeBtn} onClick={handleCloseModal}>×</button>
            </div>

            {newAccountInfo ? (
              <>
                <div style={modalStyles.body}>
                  <p style={{ marginBottom: '12px', color: '#1E293B' }}>
                    Staf <strong>{newAccountInfo.name}</strong> berjaya didaftarkan.
                  </p>
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '14px' }}>Nama Pengguna: <code>{newAccountInfo.username}</code></p>
                    <p style={{ margin: 0, fontSize: '14px' }}>Kata Laluan Lalai: <code>123</code></p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    Sila maklumkan maklumat log masuk ini kepada staf berkenaan.
                  </p>
                </div>
                <div style={modalStyles.footer}>
                  <button type="button" className="btn btn--primary" onClick={handleCloseModal}>
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={modalStyles.body}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Nama Penuh <span className="required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="Contoh: Ahmad Ali"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Peranan / Fokus <span className="required">*</span></label>
                    <select
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>Pilih Peranan...</option>
                      <option value="Designer">Designer</option>
                      <option value="Operator Mesin (Banner/Bunting)">Operator Mesin (Banner/Bunting)</option>
                      <option value="Operator Digital">Operator Digital</option>
                      <option value="Finishing">Finishing</option>
                      <option value="Pengurusan / Admin">Pengurusan / Admin</option>
                    </select>
                  </div>
                </div>

                <div style={modalStyles.footer}>
                  <button type="button" className="btn btn--secondary" onClick={handleCloseModal}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gaya Panel Detail Staf ──
const detailPanelStyles = {
  panel: {
    backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflowY: 'auto'
  },
  avatar: {
    width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#E2E8F0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '26px', fontWeight: 'bold', color: '#475569'
  },
  infoLabel: {
    fontSize: '11px', fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  infoValue: { fontSize: '14px', color: '#1E293B', fontWeight: '500' }
};

// ── Gaya Modal (Inline) ──
const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
  },
  modal: {
    backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '450px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column'
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFD',
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
  },
  title: { fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', fontSize: '24px', color: '#94A3B8', cursor: 'pointer' },
  body: { padding: '24px' },
  footer: {
    padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex',
    justifyContent: 'flex-end', gap: '10px', background: '#FAFBFD',
    borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px'
  }
};
