// src/pages/Cuti.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

// ── Helper: format tarikh DD/MM/YYYY ──
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Helper: initials dari nama ──
function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

// ── Helper: badge class ikut status ──
function getStatusBadge(status = '') {
  const s = status.toLowerCase();
  if (s === 'approved') return { cls: 'badge badge-success', label: 'Diluluskan' };
  if (s === 'rejected') return { cls: 'badge badge-danger',  label: 'Ditolak'    };
  return { cls: 'badge badge-warning', label: 'Menunggu' };
}

// ── Ikon Kad ──
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const UserOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" />
  </svg>
);

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function Cuti() {
  const [leaves, setLeaves]       = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]       = useState(null); // { type: 'success'|'error', text }
  const [formData, setFormData]         = useState({
    staff_id: '', start_date: '', end_date: '', reason: ''
  });

  // ── Ambil data cuti ──
  async function fetchLeaves() {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/leaves');
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Ralat mengambil rekod cuti:', err);
      setError('Gagal memuat turun rekod cuti.');
    } finally {
      setLoading(false);
    }
  }

  // ── Ambil senarai staf untuk dropdown ──
  async function fetchStaff() {
    try {
      const res = await axios.get('http://localhost:5000/api/staff');
      const data = res.data.data || res.data;
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ralat mengambil senarai staf:', err);
    }
  }

  useEffect(() => {
    fetchLeaves();
    fetchStaff();
  }, []);

  // ── Statistik kad ──
  const today = new Date().toISOString().slice(0, 10);
  const onLeaveToday = leaves.filter(l => {
    return l.status?.toLowerCase() === 'approved' &&
      l.start_date?.slice(0, 10) <= today &&
      l.end_date?.slice(0, 10) >= today;
  }).length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = leaves.filter(l => l.applied_at?.slice(0, 7) === thisMonth).length;
  const pendingCount   = leaves.filter(l => l.status?.toLowerCase() === 'pending').length;

  // ── Handle input borang ──
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Handle submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { staff_id, start_date, end_date, reason } = formData;
    if (!staff_id || !start_date || !end_date || !reason) return;

    try {
      setIsSubmitting(true);
      setSubmitMsg(null);
      await axios.post('http://localhost:5000/api/leaves', { staff_id, start_date, end_date, reason });
      setSubmitMsg({ type: 'success', text: 'Cuti berjaya direkodkan!' });
      setFormData({ staff_id: '', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
      setTimeout(() => { setIsModalOpen(false); setSubmitMsg(null); }, 1500);
    } catch (err) {
      console.error('Ralat merekod cuti:', err);
      setSubmitMsg({ type: 'error', text: 'Gagal merekod cuti. Semak sambungan backend.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitMsg(null);
    setFormData({ staff_id: '', start_date: '', end_date: '', reason: '' });
  };

  // ── KPI Cards ──
  const kpiCards = [
    { label: 'Staf Bercuti Hari Ini', value: onLeaveToday,    cls: 'kpi-card kpi-card--red',  Icon: UserOffIcon, footer: 'Berdasarkan rekod diluluskan' },
    { label: 'Permohonan Bulan Ini',  value: thisMonthCount,  cls: 'kpi-card kpi-card--blue', Icon: CalendarIcon, footer: 'Semua status termasuk' },
    { label: 'Menunggu Kelulusan',    value: pendingCount,    cls: 'kpi-card kpi-card--amber', Icon: ClockIcon,   footer: 'Perlu tindakan segera' },
  ];

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Pengurusan Cuti</h1>
          <p className="page-subtitle">Rekod dan pantau permohonan cuti staf</p>
        </div>
        <button className="btn btn--primary" id="btn-rekod-cuti" onClick={() => setIsModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Rekod Cuti
        </button>
      </header>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid kpi-grid--3">
        {kpiCards.map(card => (
          <div key={card.label} className={card.cls}>
            <div className="kpi-top">
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value">{card.value}</div>
            </div>
            <div className="kpi-bottom">
              <div className="kpi-footer">{card.footer}</div>
            </div>
            <div className="kpi-bg-icon"><card.Icon /></div>
          </div>
        ))}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '12px 20px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#B91C1C', marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Jadual Rekod Cuti ── */}
      <section className="section-card" aria-label="Rekod Cuti">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Rekod Cuti Staf
            <span className="badge badge-gray" style={{ fontSize: 11, marginLeft: 4 }}>
              {leaves.length} rekod
            </span>
          </div>
          <span className="section-card-meta">Disusun: terbaru dahulu</span>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Staf</th>
                <th>Tarikh Mula</th>
                <th>Tarikh Tamat</th>
                <th>Sebab / Nota</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Memuatkan data...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Tiada rekod cuti dijumpai.
                  </td>
                </tr>
              ) : (
                leaves.map((rec, idx) => {
                  const { cls, label } = getStatusBadge(rec.status);
                  return (
                    <tr key={rec.id ?? idx}>
                      <td>
                        <div className="user-cell">
                          <div className="user-initials-circle">
                            {getInitials(rec.staff_name || '??')}
                          </div>
                          <span style={{ fontWeight: 500, color: '#1E293B' }}>
                            {rec.staff_name || `Staf #${rec.staff_id}`}
                          </span>
                        </div>
                      </td>
                      <td><span className="td-mono">{formatDate(rec.start_date)}</span></td>
                      <td><span className="td-mono">{formatDate(rec.end_date)}</span></td>
                      <td style={{ maxWidth: 280, color: '#475569' }}>
                        <span title={rec.reason}>{rec.reason || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={cls}>{label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal Rekod Cuti ── */}
      {isModalOpen && (
        <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={modalStyles.modal}>

            {/* Header */}
            <div style={modalStyles.header}>
              <div>
                <h2 style={modalStyles.title}>Rekod Cuti Baharu</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  Lengkapkan maklumat di bawah
                </p>
              </div>
              <button style={modalStyles.closeBtn} onClick={closeModal} aria-label="Tutup">×</button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit}>
              <div style={modalStyles.body}>

                {/* Nama Staf */}
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>
                    Nama Staf <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    name="staff_id"
                    id="cuti-staff-id"
                    style={modalStyles.input}
                    value={formData.staff_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>— Pilih Staf —</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tarikh Mula & Tamat (2 kolum) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={modalStyles.label}>
                      Tarikh Mula <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="cuti-start-date"
                      style={modalStyles.input}
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label style={modalStyles.label}>
                      Tarikh Tamat <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="cuti-end-date"
                      style={modalStyles.input}
                      value={formData.end_date}
                      min={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Sebab */}
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>
                    Sebab / Nota <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    name="reason"
                    id="cuti-reason"
                    style={{ ...modalStyles.input, minHeight: 90, resize: 'vertical' }}
                    placeholder="Contoh: Cuti Sakit — demam selama 2 hari"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                  />
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    Sertakan jenis cuti dan sebab ringkas dalam ruangan ini.
                  </p>
                </div>

                {/* Mesej status submit */}
                {submitMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: submitMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2',
                    color: submitMsg.type === 'success' ? '#15803D' : '#B91C1C',
                    border: `1px solid ${submitMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`
                  }}>
                    {submitMsg.type === 'success' ? '✓' : '⚠'} {submitMsg.text}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={modalStyles.footer}>
                <button type="button" className="btn btn--secondary" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn--primary" disabled={isSubmitting} id="btn-submit-cuti">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Rekod'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// ── Gaya Modal Inline ──
const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    background: '#FAFBFD', borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 },
  closeBtn: {
    background: 'transparent', border: 'none', fontSize: 26,
    color: '#94A3B8', cursor: 'pointer', lineHeight: 1, padding: '0 4px',
  },
  body: { padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #D1D5DB',
    borderRadius: 8, background: '#F9FAFB', color: '#1E293B', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  footer: {
    padding: '16px 24px', borderTop: '1px solid #E2E8F0',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    background: '#FAFBFD', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
};
