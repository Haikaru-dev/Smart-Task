// src/pages/staff/CutiStaf.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ── Ikon SVG ──────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ms-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end) - new Date(start);
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

function getStatusBadge(status = '') {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'lulus')
    return { bg: '#DCFCE7', color: '#15803D', dot: '#16A34A', label: 'Lulus' };
  if (s === 'rejected' || s === 'ditolak')
    return { bg: '#FEE2E2', color: '#B91C1C', dot: '#DC2626', label: 'Ditolak' };
  return { bg: '#FEF3C7', color: '#B45309', dot: '#D97706', label: 'Pending' };
}

// ── Hari ini sebagai minima tarikh ──
const TODAY = new Date().toISOString().slice(0, 10);

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function CutiStaf() {
  // ── Baca profil staf dari localStorage ──
  const raw = localStorage.getItem('staffUser') || localStorage.getItem('user');
  const staffUser = raw ? JSON.parse(raw) : {};
  const staffId   = staffUser?.staffId || staffUser?.id || '';
  const staffName = staffUser?.name    || staffUser?.username || 'Staf';

  // ── State: senarai cuti ──
  const [leaves, setLeaves]     = useState([]);
  const [loadLeaves, setLoadLeaves] = useState(true);
  const [leaveError, setLeaveError] = useState(null);

  // ── State: borang ──
  const [form, setForm]         = useState({
    start_date: '', end_date: '', reason: '', file: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState(null); // { type, text }
  const [focusField, setFocusField] = useState('');

  // ── Ambil sejarah cuti ──
  const fetchLeaves = useCallback(async () => {
    if (!staffId) { setLoadLeaves(false); return; }
    try {
      setLoadLeaves(true);
      setLeaveError(null);
      const res = await axios.get(`${API_BASE_URL}/api/staff/leaves/${staffId}`);
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Ralat fetchLeaves:', err);
      setLeaveError('Gagal memuatkan sejarah. Semak sambungan backend.');
    } finally {
      setLoadLeaves(false);
    }
  }, [staffId]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // ── Kemas kini form ──
  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // ── Hantar permohonan ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) {
      setToast({ type: 'error', text: 'ID staf tidak dijumpai. Sila log masuk semula.' });
      return;
    }
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setToast({ type: 'error', text: 'Tarikh tamat tidak boleh lebih awal dari tarikh mula.' });
      return;
    }

    try {
      setSubmitting(true);
      setToast(null);

      await axios.post(`${API_BASE_URL}/api/staff/leaves`, {
        staff_id:   staffId,
        start_date: form.start_date,
        end_date:   form.end_date,
        reason:     form.reason,
      });

      setToast({ type: 'success', text: '✓ Permohonan cuti berjaya dihantar! Menunggu kelulusan.' });
      setForm({ start_date: '', end_date: '', reason: '', file: null });
      // Reset file input
      const fileEl = document.getElementById('cuti-file-input');
      if (fileEl) fileEl.value = '';
      // Refresh senarai
      await fetchLeaves();

    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menghantar permohonan. Cuba semula.';
      setToast({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 6000);
    }
  };

  // ── Kira statistik ringkas ──
  const countPending  = leaves.filter(l => l.status?.toLowerCase() === 'pending').length;
  const countApproved = leaves.filter(l => l.status?.toLowerCase() === 'approved').length;

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <header className="page-header">
        <h1 className="page-title">Permohonan Cuti</h1>
        <p className="page-subtitle">
          Urus cuti anda — {staffName} ·
          <span style={{ marginLeft: 8, color: '#F59E0B', fontWeight: 600 }}>
            {countPending} Pending
          </span>
          <span style={{ marginLeft: 10, color: '#15803D', fontWeight: 600 }}>
            {countApproved} Diluluskan
          </span>
        </p>
      </header>

      {/* ── Toast Notifikasi ── */}
      {toast && (
        <div style={{
          marginBottom: 20, padding: '13px 18px', borderRadius: 10,
          background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: toast.type === 'success' ? '#15803D' : '#B91C1C',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.text}
          <button onClick={() => setToast(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 18, cursor: 'pointer', color: 'inherit', lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* ── Peringatan tiada staffId ── */}
      {!staffId && (
        <div style={{
          padding: '13px 18px', background: '#FEF3C7',
          border: '1px solid #FDE68A', borderRadius: 10,
          color: '#92400E', fontSize: 13, marginBottom: 20,
        }}>
          ⚠ ID staf tidak dijumpai dalam sesi. Sila <strong>log masuk semula</strong>.
        </div>
      )}

      {/* ── Grid Dua Kolum ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40% 1fr',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ══════════════════════════════════════
            KOLUM KIRI: Borang Permohonan
            ══════════════════════════════════════ */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          {/* Header kad */}
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#2563EB' }} />
              Mohon Cuti Baru
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '22px 22px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Tarikh Mula */}
              <div style={F.group}>
                <label style={F.label}>
                  Tarikh Mula <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><CalendarIcon /></span>
                  <input
                    id="cuti-start-date"
                    type="date"
                    min={TODAY}
                    value={form.start_date}
                    onChange={e => handleChange('start_date', e.target.value)}
                    onFocus={() => setFocusField('start')}
                    onBlur={() => setFocusField('')}
                    style={{
                      ...F.input,
                      ...(focusField === 'start' ? F.inputFocus : {}),
                    }}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Tarikh Tamat */}
              <div style={F.group}>
                <label style={F.label}>
                  Tarikh Tamat <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><CalendarIcon /></span>
                  <input
                    id="cuti-end-date"
                    type="date"
                    min={form.start_date || TODAY}
                    value={form.end_date}
                    onChange={e => handleChange('end_date', e.target.value)}
                    onFocus={() => setFocusField('end')}
                    onBlur={() => setFocusField('')}
                    style={{
                      ...F.input,
                      ...(focusField === 'end' ? F.inputFocus : {}),
                    }}
                    required
                    disabled={submitting}
                  />
                </div>
                {/* Info bilangan hari */}
                {form.start_date && form.end_date && (
                  <div style={{ fontSize: 11.5, color: '#2563EB', marginTop: 5, fontWeight: 500 }}>
                    <ClockIcon /> &nbsp;
                    {daysBetween(form.start_date, form.end_date)} hari cuti
                  </div>
                )}
              </div>

              {/* Sebab Cuti */}
              <div style={F.group}>
                <label style={F.label}>
                  Sebab Cuti <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...F.iconLeft, top: 14 }}><FileTextIcon /></span>
                  <textarea
                    id="cuti-reason"
                    style={{
                      ...F.input,
                      paddingTop: 10, paddingBottom: 10,
                      minHeight: 90, resize: 'vertical',
                      ...(focusField === 'reason' ? F.inputFocus : {}),
                    }}
                    placeholder="Contoh: Cuti Sakit (MC), Urusan Keluarga, Cuti Tahunan..."
                    value={form.reason}
                    onChange={e => handleChange('reason', e.target.value)}
                    onFocus={() => setFocusField('reason')}
                    onBlur={() => setFocusField('')}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Dokumen Sokongan */}
              <div style={F.group}>
                <label style={F.label}>Dokumen Sokongan</label>
                <div style={F.fileBox}>
                  <input
                    id="cuti-file-input"
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => handleChange('file', e.target.files[0])}
                    disabled={submitting}
                  />
                  <label htmlFor="cuti-file-input" style={F.fileBtn}>
                    <PaperclipIcon />
                    Pilih Fail
                  </label>
                  <div style={{ marginLeft: 10 }}>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                      {form.file ? form.file.name : 'Tiada fail dipilih'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      Format: PDF, JPG, PNG (Max 5MB)
                    </div>
                  </div>
                </div>
              </div>

              {/* Butang Hantar */}
              <button
                id="btn-hantar-cuti"
                type="submit"
                disabled={submitting || !staffId}
                style={{
                  ...F.submitBtn,
                  ...(submitting || !staffId ? F.submitBtnDisabled : {}),
                }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={spinnerStyle} /> Menghantar...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <SendIcon /> Hantar Permohonan
                  </span>
                )}
              </button>

            </div>
          </form>
        </div>

        {/* ══════════════════════════════════════
            KOLUM KANAN: Sejarah Permohonan
            ══════════════════════════════════════ */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#8B5CF6' }} />
              Sejarah Permohonan
              <span className="badge badge--gray no-dot" style={{ fontSize: 11 }}>
                {leaves.length} rekod
              </span>
            </div>
            <button
              onClick={fetchLeaves}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4,
              }}
              disabled={loadLeaves}
            >
              ↻ Muat Semula
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {/* Ralat */}
            {leaveError && (
              <div style={{ padding: '16px 22px', color: '#B91C1C', fontSize: 13 }}>
                ⚠ {leaveError}
              </div>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarikh Cuti</th>
                  <th>Sebab</th>
                  <th style={{ textAlign: 'center' }}>Tempoh</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadLeaves ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      Memuatkan sejarah...
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: '#F1F5F9', margin: '0 auto 12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>📋</div>
                        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                          Tiada rekod permohonan cuti.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave, i) => {
                    const badge  = getStatusBadge(leave.status);
                    const days   = daysBetween(leave.start_date, leave.end_date);
                    return (
                      <tr key={leave.id || i}>
                        {/* Tarikh */}
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                            {formatDate(leave.start_date)}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            hingga {formatDate(leave.end_date)}
                          </div>
                        </td>

                        {/* Sebab */}
                        <td style={{
                          fontSize: 12.5, color: '#475569', maxWidth: 180,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {leave.reason || '—'}
                        </td>

                        {/* Tempoh */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 600, color: '#334155',
                            background: '#F1F5F9', padding: '3px 10px', borderRadius: 20,
                          }}>
                            {days}h
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 12px', borderRadius: 20,
                            fontSize: 11.5, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: badge.dot, flexShrink: 0,
                            }} />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer ringkasan */}
          {leaves.length > 0 && (
            <div style={{
              padding: '12px 22px', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFD', display: 'flex', gap: 20,
            }}>
              {[
                { label: 'Pending', count: countPending, color: '#D97706' },
                { label: 'Diluluskan', count: countApproved, color: '#15803D' },
                { label: 'Ditolak', count: leaves.filter(l => l.status?.toLowerCase() === 'rejected').length, color: '#B91C1C' },
              ].map(s => (
                <div key={s.label} style={{ fontSize: 12, color: '#64748B' }}>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>{' '}
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        #btn-hantar-cuti:not(:disabled):hover {
          background: linear-gradient(135deg,#1E3A8A,#1D4ED8) !important;
          box-shadow: 0 6px 20px rgba(37,99,235,0.4) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
const spinnerStyle = {
  display: 'inline-block', width: 13, height: 13,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff', borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

// ── Form Styles ───────────────────────────────────────────────────
const F = {
  group: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#374151' },
  iconLeft: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', padding: '11px 13px 11px 40px',
    fontSize: 13.5, border: '1.5px solid #E2E8F0',
    borderRadius: 10, background: '#F8FAFC', color: '#0F172A',
    outline: 'none', transition: 'all 0.18s',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  inputFocus: {
    border: '1.5px solid #2563EB',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(37,99,235,0.09)',
  },
  fileBox: {
    display: 'flex', alignItems: 'center',
    padding: '12px 14px', borderRadius: 10,
    border: '1.5px dashed #CBD5E1', background: '#F8FAFC',
  },
  fileBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
    background: '#EFF6FF', color: '#2563EB',
    fontSize: 12.5, fontWeight: 600,
    border: '1px solid #BFDBFE', whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg,#1E40AF,#2563EB)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
    transition: 'all 0.2s', fontFamily: 'inherit', marginTop: 4,
  },
  submitBtnDisabled: {
    background: '#94A3B8', cursor: 'not-allowed', boxShadow: 'none',
  },
};
