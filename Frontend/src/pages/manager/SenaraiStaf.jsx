// src/pages/SenaraiStaf.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';

export default function SenaraiStaf() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Modal Tambah Staf
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', status: 'Aktif' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil Data Staf
  async function fetchStaff() {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/staff');
      const data = response.data.data || response.data;
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ralat mengambil data staf:', err);
      setError('Gagal memuat turun data staf.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStaff();
  }, []);

  // Uruskan perubahan input borang
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Hantar borang Tambah Staf
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.status) return;

    try {
      setIsSubmitting(true);
      await axios.post('http://localhost:5000/api/staff', formData);
      setIsModalOpen(false);
      setFormData({ name: '', role: '', status: 'Aktif' }); // reset borang
      fetchStaff(); // muat semula jadual
    } catch (err) {
      console.error('Ralat simpan staf:', err);
      alert('Gagal menambah staf. Sila pastikan backend sedang berjalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── JSON-LD Data ──
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
                <th>ID Staf</th>
                <th>Nama Staf</th>
                <th>Peranan / Fokus</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Memuatkan data...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Tiada staf direkodkan.</td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id}>
                    <td><span className="td-id">#{s.id}</span></td>
                    <td>
                      <div className="user-cell">
                        <div className="user-initials-circle">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: '#1E293B' }}>{s.name}</span>
                      </div>
                    </td>
                    <td>{s.role}</td>
                    <td>
                      <span className={`badge ${s.status === 'Aktif' ? 'badge--success' : 'badge--danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/staf/${s.id}`)}
                        style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal Tambah Staf ── */}
      {isModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Tambah Staf Baharu</h2>
              <button style={modalStyles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
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
                
                <div className="form-group" style={{ marginBottom: '16px' }}>
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

                <div className="form-group">
                  <label className="form-label">Status <span className="required">*</span></label>
                  <select 
                    name="status" 
                    className="form-select" 
                    value={formData.status} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
              </div>
              
              <div style={modalStyles.footer}>
                <button type="button" className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
