// src/pages/JanaanJadual.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';

// ── Ikon SVG ──────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const TaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const UserCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ── Helper: badge warna mengikut task_type ──
function getTypeBadge(type = '') {
  const map = {
    'Design':   { bg: '#EDE9FE', color: '#7C3AED' },
    'Printing': { bg: '#DBEAFE', color: '#1D4ED8' },
    'Packing':  { bg: '#FEF3C7', color: '#B45309' },
    'Delivery': { bg: '#DCFCE7', color: '#15803D' },
  };
  return map[type] || { bg: '#F1F5F9', color: '#475569' };
}

// ── Helper: badge warna mengikut status ──
function getStatusBadge(status = '') {
  const s = status.toLowerCase();
  if (s === 'completed') return { cls: 'badge badge-success', label: 'Selesai' };
  if (s === 'in progress') return { cls: 'badge badge-info',    label: 'Dalam Proses' };
  return { cls: 'badge badge-warning', label: 'Menunggu' };
}

// ── Helper: initials dari nama ──
function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

// ── Warna avatar kolum staf (kitaran) ──
const STAFF_COLORS = [
  'linear-gradient(135deg,#1E40AF,#3B82F6)',
  'linear-gradient(135deg,#065F46,#059669)',
  'linear-gradient(135deg,#7C2D12,#EA580C)',
  'linear-gradient(135deg,#6B21A8,#A855F7)',
  'linear-gradient(135deg,#0E7490,#06B6D4)',
];

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function JanaanJadual() {
  const [board, setBoard]           = useState([]); // array of tasks from API
  const [loading, setLoading]       = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]           = useState(null);
  const [toast, setToast]           = useState(null); // { type, text }

  // ── Ambil papan agihan ──
  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:5000/api/tasks/board');
      setBoard(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Ralat fetchBoard:', err);
      setError('Gagal memuat papan agihan. Semak sambungan backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // ── Fungsi Jana Agihan (AI) ──
  const handleJanaAgihan = async () => {
    try {
      setIsGenerating(true);
      setToast(null);
      const res = await axios.post('http://localhost:5000/api/manager/auto-assign');
      const msg = res.data?.message || 'Agihan AI berjaya dilaksanakan!';
      alert(msg); // Paparkan notifikasi kejayaan
      setToast({ type: 'success', text: msg });
      await fetchBoard(); // refresh jadual
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal menjana agihan AI. Cuba semula.';
      alert(errMsg); // Paparkan mesej ralat
      setToast({ type: 'error', text: errMsg });
    } finally {
      setIsGenerating(false);
      // Auto-sembunyi toast selepas 5 saat
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ── Kumpulkan tugasan mengikut nama staf ──
  const grouped = board.reduce((acc, task) => {
    const key = task.staff_name || 'Tidak Ditetapkan';
    if (!acc[key]) acc[key] = { role: task.staff_role || '', tasks: [] };
    acc[key].tasks.push(task);
    return acc;
  }, {});
  const staffColumns = Object.entries(grouped);

  // ── Metrik ringkasan ──
  const totalPending   = board.filter(t => t.status?.toLowerCase() === 'pending').length;
  const totalCompleted = board.filter(t => t.status?.toLowerCase() === 'completed').length;
  const totalStaff     = staffColumns.length;

  const kpiCards = [
    { label: 'Tugasan Tertunggak',  value: totalPending,   cls: 'kpi-card kpi-card--blue', Icon: TaskIcon,       footer: 'Menunggu tindakan staf' },
    { label: 'Staf Tersedia',       value: totalStaff,     cls: 'kpi-card kpi-card--cyan', Icon: UserCheckIcon,  footer: 'Staf dengan tugasan aktif' },
    { label: 'Selesai Hari Ini',    value: totalCompleted, cls: 'kpi-card kpi-card--green',Icon: CheckCircleIcon, footer: 'Tugasan siap diselesaikan' },
  ];

  // ── JSON-LD Data ──
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Janaan Jadual & Agihan Tugas - SmartTask",
    "description": "Sistem agihan tugasan automatik berasaskan Load Balancing untuk mengagihkan kerja kepada pekerja/staf.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Administrators and Managers"
    },
    "about": {
      "@type": "Thing",
      "name": "Automated Task Scheduling"
    }
  };

  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />

      {/* ── Toast Notifikasi ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 2000,
          padding: '14px 20px', borderRadius: 12, maxWidth: 380,
          background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: toast.type === 'success' ? '#15803D' : '#B91C1C',
          fontWeight: 600, fontSize: 13,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.25s ease'
        }}>
          <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.text}
          <button onClick={() => setToast(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 18, cursor: 'pointer', color: 'inherit', lineHeight: 1
          }}>×</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Agihan Tugasan Pintar</h1>
          <p className="page-subtitle">Sistem pengagihan automatik berasaskan Round-Robin Load Balancing</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn--secondary"
            onClick={fetchBoard}
            disabled={loading || isGenerating}
            title="Muat semula"
            style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshIcon />
            Muat Semula
          </button>
          <button
            id="btn-jana-agihan"
            className="btn btn--primary"
            onClick={handleJanaAgihan}
            disabled={isGenerating || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, justifyContent: 'center', opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? (
              <>
                <span style={spinnerStyle} />
                AI Sedang Menganalisis...
              </>
            ) : (
              <>
                <SparkleIcon />
                Jana Agihan (Auto)
              </>
            )}
          </button>
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
        <div style={{
          padding: '12px 20px', background: '#FEF2F2', border: '1px solid #FCA5A5',
          borderRadius: 8, color: '#B91C1C', marginBottom: 20, fontSize: 13
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Papan Agihan ── */}
      <section className="section-card" aria-label="Papan Agihan Tugasan">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Papan Agihan Tugasan
            <span className="badge badge-gray" style={{ fontSize: 11, marginLeft: 4 }}>
              {board.length} tugasan diagihkan
            </span>
          </div>
          <span className="section-card-meta">Dikumpul mengikut staf</span>
        </header>

        {/* Loading */}
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ ...spinnerStyle, width: 32, height: 32, borderWidth: 3, margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 13 }}>Memuatkan papan agihan...</p>
          </div>
        ) : staffColumns.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#F1F5F9', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>
              Tiada tugasan diagihkan
            </p>
            <p style={{ margin: '6px 0 20px', fontSize: 13, color: '#94A3B8' }}>
              Tekan butang <strong>"Jana Agihan (Auto)"</strong> untuk mengagihkan tugasan kepada staf secara automatik.
            </p>
            <button className="btn btn--primary" onClick={handleJanaAgihan} disabled={isGenerating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: isGenerating ? 0.7 : 1 }}>
              {isGenerating ? (
                <>
                  <span style={spinnerStyle} /> AI Sedang Menganalisis...
                </>
              ) : (
                <>
                  <SparkleIcon /> Jana Agihan Sekarang
                </>
              )}
            </button>
          </div>
        ) : (
          /* Kanban Grid */
          <div style={{ padding: '20px 24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16
            }}>
              {staffColumns.map(([staffName, data], colIdx) => (
                <div key={staffName} style={columnStyles.wrapper}>
                  {/* Kolum Header — maklumat staf */}
                  <div style={columnStyles.header}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: STAFF_COLORS[colIdx % STAFF_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff'
                    }}>
                      {getInitials(staffName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', truncate: true }}>
                        {staffName}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {data.role || 'Staf'}
                      </div>
                    </div>
                    <span style={{
                      background: '#EFF6FF', color: '#1D4ED8', fontSize: 11,
                      fontWeight: 700, padding: '3px 9px', borderRadius: 20
                    }}>
                      {data.tasks.length} tugasan
                    </span>
                  </div>

                  {/* Senarai Tugasan */}
                  <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.tasks.map(task => {
                      const typeBadge   = getTypeBadge(task.task_type);
                      const { cls, label } = getStatusBadge(task.status);
                      return (
                        <div key={task.id} style={taskCardStyles.wrapper}>
                          {/* Jenis Tugasan */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                              background: typeBadge.bg, color: typeBadge.color,
                              letterSpacing: '0.3px', textTransform: 'uppercase'
                            }}>
                              {task.task_type}
                            </span>
                            <span className={cls} style={{ fontSize: 10 }}>{label}</span>
                          </div>

                          {/* Keterangan */}
                          <p style={{
                            margin: '8px 0 0', fontSize: 12, color: '#334155',
                            lineHeight: 1.5, display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                          }}>
                            {task.description || '—'}
                          </p>

                          {/* Maklumat Order */}
                          {task.order_number && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 11, color: '#64748B' }}>
                                📋 {task.order_number}
                                {task.client_name ? ` · ${task.client_name}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── CSS Animation ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// ── Gaya Inline ──────────────────────────────────────────────────
const spinnerStyle = {
  display: 'inline-block', width: 14, height: 14, flexShrink: 0,
  border: '2px solid rgba(255,255,255,0.4)',
  borderTopColor: '#fff', borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

const columnStyles = {
  wrapper: {
    background: '#F8FAFC', borderRadius: 12,
    border: '1px solid #E8EDF3', overflow: 'hidden',
  },
  header: {
    padding: '12px 14px', background: '#fff',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex', alignItems: 'center', gap: 10,
  },
};

const taskCardStyles = {
  wrapper: {
    background: '#fff', borderRadius: 8, padding: '10px 12px',
    border: '1px solid #E8EDF3',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.15s',
  },
};
