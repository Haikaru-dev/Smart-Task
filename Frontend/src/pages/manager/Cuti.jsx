// src/pages/Cuti.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import Pagination from '../../components/Pagination';

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
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Approve / Reject state
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal]     = useState(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [actionToast, setActionToast]     = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  // ── Ambil data cuti ──
  async function fetchLeaves() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/leaves`);
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Ralat mengambil rekod cuti:', err);
      setError('Gagal memuat turun rekod cuti.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
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

  // ── Luluskan atau Tolak permohonan cuti ──
  const handleAction = async (id, status, reason = '') => {
    setActionLoading(id);
    try {
      await axios.put(`${API_BASE_URL}/api/manager/leaves/${id}`, {
        status,
        ...(status === 'Rejected' ? { rejection_reason: reason } : {})
      });
      setActionToast({
        type: 'success',
        text: status === 'Approved' ? '✓ Cuti berjaya diluluskan.' : '✕ Cuti berjaya ditolak.'
      });
      setRejectModal(null);
      setRejectReason('');
      fetchLeaves();
    } catch (err) {
      setActionToast({ type: 'error', text: err.response?.data?.error || 'Gagal mengemas kini status cuti.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionToast(null), 4000);
    }
  };

  const PAGE_SIZE = 10;
  const paginatedLeaves = leaves.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPI Cards ──
  const kpiCards = [
    { label: 'Staf Bercuti Hari Ini', value: onLeaveToday,    cls: 'kpi-card kpi-card--red',  Icon: UserOffIcon, footer: 'Berdasarkan rekod diluluskan' },
    { label: 'Permohonan Bulan Ini',  value: thisMonthCount,  cls: 'kpi-card kpi-card--blue', Icon: CalendarIcon, footer: 'Semua status termasuk' },
    { label: 'Menunggu Kelulusan',    value: pendingCount,    cls: 'kpi-card kpi-card--amber', Icon: ClockIcon,   footer: 'Perlu tindakan segera' },
  ];

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Pengurusan Cuti</h1>
          <p className="page-subtitle">Rekod dan pantau permohonan cuti staf</p>
        </div>
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

      {/* ── Action Toast ── */}
      {actionToast && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500,
          background: actionToast.type === 'success' ? '#DCFCE7' : '#FEF2F2',
          color:      actionToast.type === 'success' ? '#15803D'  : '#B91C1C',
          border:     `1px solid ${actionToast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {actionToast.text}
          <button onClick={() => setActionToast(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 18, color: 'inherit', lineHeight: 1,
          }}>×</button>
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
                <th style={{ textAlign: 'center' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Memuatkan data...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Tiada rekod cuti dijumpai.
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((rec, idx) => {
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
                      {/* Tindakan */}
                      <td style={{ textAlign: 'center' }}>
                        {rec.status?.toLowerCase() === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              onClick={() => handleAction(rec.id, 'Approved')}
                              disabled={actionLoading === rec.id}
                              style={{ padding: '5px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#15803D' }}>
                              ✓ Lulus
                            </button>
                            <button
                              onClick={() => { setRejectModal({ id: rec.id }); setRejectReason(''); }}
                              disabled={actionLoading === rec.id}
                              style={{ padding: '5px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#B91C1C' }}>
                              ✕ Tolak
                            </button>
                          </div>
                        ) : rec.status?.toLowerCase() === 'rejected' && rec.rejection_reason ? (
                          <div style={{ fontSize: 11.5, color: '#B91C1C', fontStyle: 'italic', maxWidth: 200, margin: '0 auto', textAlign: 'left' }}>
                            "{rec.rejection_reason}"
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={leaves.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </section>

      {/* ── Modal Tolak Cuti ── */}
      {rejectModal && (
        <div style={modalStyles.overlay} onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
          <div style={{ ...modalStyles.modal, maxWidth: 420 }}>
            <div style={modalStyles.header}>
              <div>
                <h2 style={modalStyles.title}>Tolak Permohonan Cuti</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                  Sila berikan sebab penolakan (pilihan)
                </p>
              </div>
              <button style={modalStyles.closeBtn} onClick={() => setRejectModal(null)}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ ...modalStyles.label, display: 'block', marginBottom: 8 }}>
                Sebab Penolakan
              </label>
              <textarea
                style={{ ...modalStyles.input, minHeight: 90, resize: 'vertical' }}
                placeholder="Contoh: Kurang staf pada tarikh berkenaan, sila mohon semula pada bulan hadapan."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div style={modalStyles.footer}>
              <button type="button" className="btn btn--secondary" onClick={() => setRejectModal(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ background: '#DC2626', border: '1px solid #DC2626' }}
                onClick={() => handleAction(rejectModal.id, 'Rejected', rejectReason)}
                disabled={actionLoading === rejectModal.id}
              >
                {actionLoading === rejectModal.id ? 'Menolak...' : '✕ Sahkan Tolak'}
              </button>
            </div>
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
