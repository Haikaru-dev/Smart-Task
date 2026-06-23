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
  const [proposals, setProposals]   = useState(null);
  const [proposalTasks, setProposalTasks] = useState([]);
  const [staffList, setStaffList]   = useState([]);
  const [savingProposal, setSavingProposal] = useState(false);

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

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await axios.get('http://localhost:5000/api/staff');
        setStaffList(res.data);
      } catch (err) {
        console.error('Ralat fetchStaff:', err);
      }
    }
    fetchStaff();
    fetchBoard();
  }, [fetchBoard]);

  // ── Fungsi Jana Agihan (AI) ──
  const handleJanaAgihan = async () => {
    try {
      setIsGenerating(true);
      setToast(null);
      setProposals(null);
      const res = await axios.post('http://localhost:5000/api/manager/auto-assign');
      if (res.data?.success && res.data?.data) {
        if (res.data.data.length === 0) {
          const msg = res.data.message || 'Tiada tugasan baharu untuk diagihkan.';
          alert(msg);
          setToast({ type: 'success', text: msg });
        } else {
          setProposals(res.data.data);
          setProposalTasks(res.data.tasks || []);
          setToast({ type: 'success', text: 'Cadangan agihan tugas berjaya dijana oleh AI!' });
        }
      } else {
        const msg = res.data?.message || 'Tiada tugasan untuk diagihkan.';
        alert(msg);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Gagal menjana agihan AI. Cuba semula.';
      alert(errMsg); // Paparkan mesej ralat
      setToast({ type: 'error', text: errMsg });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleProposalFieldChange = (taskId, field, value) => {
    setProposals(prev => prev.map(p => {
      if (p.task_id === taskId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSaveSchedule = async () => {
    try {
      setSavingProposal(true);
      const res = await axios.post('http://localhost:5000/api/tasks/save-assignments', {
        assignments: proposals
      });
      alert(res.data?.message || 'Jadual tugasan berjaya disimpan!');
      setToast({ type: 'success', text: res.data?.message || 'Jadual tugasan berjaya disimpan!' });
      setProposals(null);
      setProposalTasks([]);
      await fetchBoard(); // refresh papan Kanban
    } catch (err) {
      console.error('Ralat menyimpan jadual:', err);
      const errMsg = err.response?.data?.error || 'Gagal menyimpan jadual. Cuba semula.';
      alert(errMsg);
      setToast({ type: 'error', text: errMsg });
    } finally {
      setSavingProposal(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleCancelProposals = () => {
    if (window.confirm('Adakah anda pasti mahu membatalkan cadangan agihan AI ini?')) {
      setProposals(null);
      setProposalTasks([]);
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

      {/* ── Bahagian Cadangan Agihan AI (Proposals) ── */}
      {proposals && proposals.length > 0 && (
        <section className="section-card" style={{ border: '2px dashed #3B82F6', marginBottom: 24 }} aria-label="Cadangan Agihan AI">
          <header className="section-card-header" style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
            <div className="section-card-title" style={{ color: '#1E40AF' }}>
              <div className="title-accent-dot" style={{ background: '#3B82F6' }} />
              Cadangan Agihan Tugasan AI (Belum Disimpan)
              <span className="badge" style={{ fontSize: 11, marginLeft: 8, background: '#DBEAFE', color: '#1E40AF', padding: '3px 9px', borderRadius: 20 }}>
                {proposals.length} Cadangan
              </span>
            </div>
            <span className="section-card-meta" style={{ color: '#60A5FA' }}>Sila semak atau ubah suai agihan di bawah sebelum disimpan</span>
          </header>
          
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {proposals.map((proposal, index) => {
                const taskInfo = proposalTasks.find(t => t.task_id === proposal.task_id) || {};
                
                // Format helper for datetime-local (expects YYYY-MM-DDTHH:mm)
                const toLocalDatetime = (isoStr) => {
                  if (!isoStr) return "";
                  const date = new Date(isoStr);
                  const pad = (n) => String(n).padStart(2, '0');
                  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                };

                const typeBadge = getTypeBadge(taskInfo.task_type);

                return (
                  <div key={proposal.task_id} style={{ 
                    background: '#fff', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: 12, 
                    padding: 16,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    {/* Header bar of the proposal card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                          background: typeBadge.bg, color: typeBadge.color,
                          letterSpacing: '0.3px', textTransform: 'uppercase'
                        }}>
                          {taskInfo.task_type || 'Tugasan'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                          📋 {taskInfo.order_number || 'ORD-??'} · {taskInfo.client_name || 'Pelanggan'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>
                        Due: {taskInfo.due_date ? new Date(taskInfo.due_date).toLocaleDateString('ms-MY') : '—'}
                      </div>
                    </div>

                    {/* Task description */}
                    <p style={{ margin: 0, fontSize: 13, color: '#1E293B', fontWeight: 500 }}>
                      {taskInfo.description || 'Tiada penerangan disediakan.'}
                    </p>

                    {/* Specifications if any */}
                    {taskInfo.specifications && (
                      <div style={{ fontSize: 11, color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #CBD5E1' }}>
                        <strong>Spesifikasi:</strong> {taskInfo.specifications}
                      </div>
                    )}

                    {/* Leave conflicts warning/info */}
                    {taskInfo.available_staff && taskInfo.available_staff.find(s => s.id === proposal.staff_id)?.compressed_window && (
                      <div style={{ 
                        fontSize: 11, 
                        color: '#B91C1C', 
                        background: '#FEF2F2', 
                        padding: '8px 12px', 
                        borderRadius: 8, 
                        border: '1px solid #FCA5A5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>⚠️</span>
                        <span>{taskInfo.available_staff.find(s => s.id === proposal.staff_id).compressed_window}</span>
                      </div>
                    )}

                    {/* Interactive override controls */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: 12,
                      marginTop: 4,
                      paddingTop: 12,
                      borderTop: '1px solid #F1F5F9'
                    }}>
                      {/* Staff dropdown selection */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Tugaskan Kepada:</label>
                        <select 
                          value={proposal.staff_id || ""}
                          onChange={(e) => handleProposalFieldChange(proposal.task_id, 'staff_id', parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            color: '#1E293B',
                            background: '#fff'
                          }}
                        >
                          <option value="">-- Pilih Staf --</option>
                          {staffList.map(s => {
                            const availContext = taskInfo.available_staff?.find(as => as.id === s.id);
                            const workload = availContext ? availContext.workload : 0;
                            const isExcluded = !availContext;
                            
                            return (
                              <option key={s.id} value={s.id} disabled={isExcluded}>
                                {s.name} ({s.role}) {workload > 0 ? `· ${workload} tugasan aktif` : ""} {isExcluded ? "· (Cuti Penuh)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Start Time input */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Masa Mula:</label>
                        <input 
                          type="datetime-local"
                          value={toLocalDatetime(proposal.start_time)}
                          onChange={(e) => handleProposalFieldChange(proposal.task_id, 'start_time', new Date(e.target.value).toISOString())}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            color: '#1E293B'
                          }}
                        />
                      </div>

                      {/* End Time input */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Masa Tamat:</label>
                        <input 
                          type="datetime-local"
                          value={toLocalDatetime(proposal.end_time)}
                          onChange={(e) => handleProposalFieldChange(proposal.task_id, 'end_time', new Date(e.target.value).toISOString())}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            color: '#1E293B'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons for saving or cancelling proposals */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #BFDBFE' }}>
              <button 
                className="btn btn--secondary" 
                onClick={handleCancelProposals}
                disabled={savingProposal}
                style={{ padding: '10px 20px' }}
              >
                Batal
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleSaveSchedule}
                disabled={savingProposal}
                style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'center' }}
              >
                {savingProposal ? (
                  <>
                    <span style={spinnerStyle} />
                    Menyimpan Jadual...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Simpan Jadual
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
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
