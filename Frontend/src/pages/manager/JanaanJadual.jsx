// src/pages/manager/JanaanJadual.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';

// ── Ikon SVG ──────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const TaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);
const WarningIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const KanbanIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

// ── Helper functions ──────────────────────────────────────────────
function getTypeBadge(type = '') {
  const map = {
    'Design':   { bg: '#EDE9FE', color: '#7C3AED' },
    'Printing': { bg: '#DBEAFE', color: '#1D4ED8' },
    'Packing':  { bg: '#FEF3C7', color: '#B45309' },
    'Delivery': { bg: '#DCFCE7', color: '#15803D' },
  };
  return map[type] || { bg: '#F1F5F9', color: '#475569' };
}

function getStatusBadge(status = '') {
  const s = status.toLowerCase();
  if (s === 'completed')   return { cls: 'badge badge-success', label: 'Selesai' };
  if (s === 'in progress') return { cls: 'badge badge-info',    label: 'Dalam Proses' };
  return { cls: 'badge badge-warning', label: 'Menunggu' };
}

function getApprovalBadge(val) {
  if (val === 'Draft') return { label: 'Draf', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' };
  return { label: 'Disahkan', bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
}

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

function toLocalDatetime(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatDisplayDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAFF_COLORS = [
  'linear-gradient(135deg,#1E40AF,#3B82F6)',
  'linear-gradient(135deg,#065F46,#059669)',
  'linear-gradient(135deg,#7C2D12,#EA580C)',
  'linear-gradient(135deg,#6B21A8,#A855F7)',
  'linear-gradient(135deg,#0E7490,#06B6D4)',
];
const TASK_TYPES = ['Design', 'Printing', 'Packing', 'Delivery'];

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function JanaanJadual() {
  // ── State: papan agihan (DB) ──
  const [board, setBoard]               = useState([]);
  const [viewMode, setViewMode]         = useState('staf'); // 'staf' | 'kanban'
  const [loading, setLoading]           = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError]               = useState(null);
  const [toast, setToast]               = useState(null);
  const [staffList, setStaffList]       = useState([]);
  const [orderCount, setOrderCount]     = useState(null); // null = belum selesai muatkan

  // ── State: cadangan AI (in-memory, belum disimpan ke DB) ──
  const [proposals, setProposals]           = useState(null);
  const [savingProposal, setSavingProposal] = useState(false);

  // ── State: modal pengesahan padam cadangan AI ──
  const [pendingDelete, setPendingDelete] = useState(null);
  const cancelDeleteRef                   = useRef(null);

  // ── State: modal pengesahan generik (buang semua / padam draf papan) ──
  const [confirmDlg, setConfirmDlg] = useState(null);
  const cancelConfirmRef            = useRef(null);

  // ── State: modal edit tugasan pada papan ──
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [isSaving, setIsSaving]       = useState(false);

  // ── Toast helper ──
  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Ambil papan agihan dari DB ──
  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/tasks/board`);
      setBoard(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Gagal memuat papan agihan. Semak sambungan backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [staffRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/staff`),
          axios.get(`${API_BASE_URL}/api/orders`),
        ]);
        setStaffList(Array.isArray(staffRes.data) ? staffRes.data : []);
        setOrderCount(Array.isArray(ordersRes.data) ? ordersRes.data.length : 0);
      } catch {
        setOrderCount(0);
      }
    }
    fetchInitialData();
    fetchBoard();
  }, [fetchBoard]);

  // ── Esc: tutup mana-mana modal aktif ──
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (pendingDelete !== null) setPendingDelete(null);
      else if (confirmDlg !== null) setConfirmDlg(null);
      else if (editingTask !== null) setEditingTask(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [pendingDelete, confirmDlg, editingTask]);

  // ── Fokus "Batal" apabila modal dibuka (aksesibiliti) ──
  useEffect(() => {
    if (pendingDelete !== null) setTimeout(() => cancelDeleteRef.current?.focus(), 20);
  }, [pendingDelete]);

  useEffect(() => {
    if (confirmDlg !== null) setTimeout(() => cancelConfirmRef.current?.focus(), 20);
  }, [confirmDlg]);

  // ────────────────────────────────────────────────────────────────
  // HANDLERS: CADANGAN AI
  // ────────────────────────────────────────────────────────────────

  // Jana cadangan AI — simpan dalam state, BUKAN ke DB
  const handleJanaAgihan = async () => {
    try {
      setIsGenerating(true);
      const res = await axios.post(`${API_BASE_URL}/api/manager/auto-assign`);
      if (!res.data?.success) return;

      const aiAssignments = res.data.data  || [];
      const aiTasks       = res.data.tasks || [];

      if (aiAssignments.length === 0) {
        showToast('info', res.data.message || 'Tiada tugasan baharu untuk diagihkan.');
        return;
      }

      // Gabungkan assignments + task details menjadi satu array yang boleh diedit
      const merged = aiAssignments.map(assign => {
        const detail = aiTasks.find(t => t.task_id === assign.task_id) || {};
        return {
          task_id:          assign.task_id,
          // Medan read-only (info tempahan):
          order_number:      detail.order_number      || '',
          client_name:       detail.client_name       || '',
          item_type:         detail.item_type         || '',
          quantity:          detail.quantity          || 0,
          due_date:          detail.due_date          || '',
          delivery_location: detail.delivery_location || '',
          specifications:    detail.specifications    || '',
          available_staff:   detail.available_staff   || [],
          // Medan boleh diedit oleh admin:
          staff_id:    assign.staff_id    || '',
          task_type:   detail.task_type   || '',
          description: detail.description || '',
          start_time:  assign.start_time ? toLocalDatetime(assign.start_time) : '',
          end_time:    assign.end_time   ? toLocalDatetime(assign.end_time)   : '',
          // Validasi masa:
          timeError: null
        };
      });

      setProposals(merged);
      showToast('success', res.data.message);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Gagal menjana cadangan AI. Cuba semula.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Kemaskini satu medan pada satu cadangan (dengan validasi masa)
  const handleProposalChange = (taskId, field, value) => {
    setProposals(prev => prev.map(p => {
      if (p.task_id !== taskId) return p;

      // Tolak end_time tidak sah — kekalkan nilai lama, hanya tunjuk ralat
      if (field === 'end_time' && p.start_time && value) {
        if (new Date(value) <= new Date(p.start_time)) {
          return { ...p, timeError: 'Masa tamat tidak boleh sebelum atau sama dengan masa mula.' };
        }
      }

      const updated = { ...p, [field]: value };

      // Semak semula kesahihan kombinasi masa
      const s = field === 'start_time' ? value : p.start_time;
      const e = field === 'end_time'   ? value : p.end_time;
      if (s && e) {
        updated.timeError = new Date(e) <= new Date(s)
          ? 'Masa tamat tidak boleh sebelum atau sama dengan masa mula.'
          : null;
      } else {
        updated.timeError = null;
      }

      return updated;
    }));
  };

  // Buka modal pengesahan padam
  const handleDeleteProposalClick = (taskId) => setPendingDelete(taskId);

  // Sahkan padam (operasi state sahaja, tiada panggilan API)
  const confirmDeleteProposal = () => {
    setProposals(prev => prev.filter(p => p.task_id !== pendingDelete));
    setPendingDelete(null);
  };

  // Sahkan semua cadangan → simpan batch ke DB
  const handleSahkanSemua = async () => {
    if (!proposals || proposals.length === 0) return;

    if (proposals.some(p => p.timeError)) {
      showToast('error', 'Sila betulkan semua ralat masa sebelum mengesahkan.');
      return;
    }

    const assignments = proposals.map(p => ({
      task_id:     p.task_id,
      staff_id:    p.staff_id,
      task_type:   p.task_type,
      description: p.description,
      start_time:  p.start_time ? new Date(p.start_time).toISOString() : null,
      end_time:    p.end_time   ? new Date(p.end_time).toISOString()   : null,
    }));

    try {
      setSavingProposal(true);
      const res = await axios.post(`${API_BASE_URL}/api/tasks/save-assignments`, { assignments });
      showToast('success', res.data?.message || 'Jadual tugasan berjaya disimpan!');
      setProposals(null);
      await fetchBoard();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Gagal menyimpan jadual. Cuba semula.');
    } finally {
      setSavingProposal(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // HANDLERS: PAPAN AGIHAN (DB)
  // ────────────────────────────────────────────────────────────────

  const handleConfirmAll = async () => {
    try {
      setIsConfirming(true);
      const res = await axios.post(`${API_BASE_URL}/api/tasks/confirm`, {});
      showToast('success', res.data?.message || 'Semua tugasan draf berjaya disahkan!');
      await fetchBoard();
    } catch {
      showToast('error', 'Gagal mengesahkan tugasan. Cuba semula.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setEditForm({
      assigned_staff_id: task.assigned_staff_id || '',
      task_type:         task.task_type || '',
      description:       task.description || '',
      start_time:        toLocalDatetime(task.start_time),
      end_time:          toLocalDatetime(task.end_time),
    });
  };

  const handleEditSave = async () => {
    try {
      setIsSaving(true);
      await axios.put(`${API_BASE_URL}/api/tasks/${editingTask.id}`, {
        assigned_staff_id: Number(editForm.assigned_staff_id) || null,
        task_type:   editForm.task_type,
        description: editForm.description,
        start_time:  editForm.start_time ? new Date(editForm.start_time).toISOString() : null,
        end_time:    editForm.end_time   ? new Date(editForm.end_time).toISOString()   : null,
      });
      showToast('success', 'Tugasan berjaya dikemaskini!');
      setEditingTask(null);
      await fetchBoard();
    } catch {
      showToast('error', 'Gagal mengemaskini tugasan. Cuba semula.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDraft = (taskId, e) => {
    e.stopPropagation();
    setConfirmDlg({
      title:  'Padam Draf Tugasan?',
      body:   'Tugasan draf ini akan dikembalikan ke senarai belum diagihkan. Staf tidak akan menerima tugasan ini.',
      danger: true,
      label:  'Padam Draf',
      onConfirm: async () => {
        setConfirmDlg(null);
        try {
          await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`);
          showToast('success', 'Draf tugasan berjaya dipadam.');
          await fetchBoard();
        } catch (err) {
          showToast('error', err.response?.data?.error || 'Gagal memadam draf tugasan.');
        }
      }
    });
  };

  // ── Nilai terbitan ──
  const hasProposals   = proposals !== null && proposals.length > 0;
  const hasTimeError   = proposals?.some(p => p.timeError) ?? false;
  const draftCount     = board.filter(t => t.approval_status === 'Draft').length;
  const hasDrafts      = draftCount > 0;
  const totalPending   = board.filter(t => t.status?.toLowerCase() === 'pending' && t.approval_status === 'Confirmed').length;
  const totalCompleted = board.filter(t => t.status?.toLowerCase() === 'completed').length;

  const grouped = board.reduce((acc, task) => {
    const key = task.staff_name || 'Tidak Ditetapkan';
    if (!acc[key]) acc[key] = { role: task.staff_role || '', tasks: [] };
    acc[key].tasks.push(task);
    return acc;
  }, {});
  const staffColumns = Object.entries(grouped);

  const STATUS_COLUMNS = [
    { key: 'Pending',     label: 'Menunggu',     accent: '#D97706', badgeBg: '#FEF3C7', badgeColor: '#92400E' },
    { key: 'In Progress', label: 'Dalam Proses', accent: '#2563EB', badgeBg: '#DBEAFE', badgeColor: '#1D4ED8' },
    { key: 'Completed',   label: 'Selesai',      accent: '#16A34A', badgeBg: '#DCFCE7', badgeColor: '#15803D' },
  ];
  const kanbanGrouped = STATUS_COLUMNS.map(col => ({
    ...col,
    tasks: board.filter(t => (t.status || 'Pending') === col.key),
  }));

  const kpiCards = [
    {
      label: 'Cadangan AI Aktif', value: proposals?.length ?? 0,
      cls: 'kpi-card kpi-card--amber',
      Icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
      footer: proposals ? 'Menunggu pengesahan admin' : 'Jana cadangan AI baharu'
    },
    { label: 'Tugasan Aktif', value: totalPending,   cls: 'kpi-card kpi-card--blue',  Icon: TaskIcon,        footer: 'Tugasan diagihkan, menunggu staf' },
    { label: 'Selesai',       value: totalCompleted, cls: 'kpi-card kpi-card--green', Icon: CheckCircleIcon, footer: 'Tugasan siap diselesaikan' },
  ];

  const jsonLdData = {
    "@context": "https://schema.org", "@type": "WebPage",
    "name": "Janaan Jadual & Agihan Tugas - SmartTask",
    "description": "Sistem agihan tugasan automatik berasaskan AI untuk staf SH Design & Print."
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />

      {/* ── Toast notifikasi ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 3000,
          padding: '14px 20px', borderRadius: 12, maxWidth: 420,
          background: toast.type === 'success' ? '#DCFCE7' : toast.type === 'info' ? '#EFF6FF' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : toast.type === 'info' ? '#BFDBFE' : '#FCA5A5'}`,
          color: toast.type === 'success' ? '#15803D' : toast.type === 'info' ? '#1E40AF' : '#B91C1C',
          fontWeight: 600, fontSize: 13, boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.25s ease'
        }}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : '⚠'}</span>
          <span style={{ flex: 1 }}>{toast.text}</span>
          <button onClick={() => setToast(null)} style={{
            background: 'none', border: 'none', fontSize: 18,
            cursor: 'pointer', color: 'inherit', lineHeight: 1, padding: '0 0 0 6px'
          }}>×</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Agihan Tugasan Pintar</h1>
          <p className="page-subtitle">Jana cadangan AI → Semak &amp; Edit → Sahkan untuk staf</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--secondary" onClick={fetchBoard}
            disabled={loading || isGenerating}
            style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshIcon /> Muat Semula
          </button>
          <button className="btn btn--primary" onClick={handleJanaAgihan}
            disabled={isGenerating || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 205,
              justifyContent: 'center', opacity: isGenerating ? 0.75 : 1 }}>
            {isGenerating
              ? <><span style={spinSty} /> AI Sedang Menganalisis...</>
              : <><SparkleIcon /> Jana Cadangan AI</>}
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

      {/* ══════════════════════════════════════════════════════════
          BAHAGIAN 1 — CADANGAN AI (IN-MEMORY, BELUM KE DB)
      ══════════════════════════════════════════════════════════ */}
      {hasProposals && (
        <section className="section-card" aria-label="Cadangan Agihan AI">
          {/* Header seksyen cadangan */}
          <header className="section-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#F59E0B' }} />
              Cadangan Agihan AI
              <span style={{
                fontSize: 11, marginLeft: 6, padding: '2px 10px', borderRadius: 20,
                background: '#FEF3C7', color: '#92400E', fontWeight: 700
              }}>
                {proposals.length} cadangan belum disimpan
              </span>
              {hasTimeError && (
                <span style={{
                  fontSize: 11, marginLeft: 6, padding: '2px 10px', borderRadius: 20,
                  background: '#FEF2F2', color: '#B91C1C', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <WarningIcon /> Ada ralat masa
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary"
                onClick={() => setConfirmDlg({
                  title:  'Buang Semua Cadangan?',
                  body:   'Kesemua cadangan AI akan dibuang. Anda perlu jana semula untuk mendapatkan cadangan baharu.',
                  danger: true,
                  label:  'Buang Semua',
                  onConfirm: () => { setProposals(null); setConfirmDlg(null); }
                })}
                disabled={savingProposal}
                style={{ fontSize: 12, padding: '7px 14px' }}>
                × Buang Semua
              </button>
              <button className="btn btn--primary" onClick={handleSahkanSemua}
                disabled={savingProposal || hasTimeError}
                title={hasTimeError ? 'Betulkan semua ralat masa dahulu' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, minWidth: 195,
                  justifyContent: 'center', opacity: hasTimeError ? 0.55 : 1,
                  background: '#16A34A', borderColor: '#16A34A'
                }}>
                {savingProposal
                  ? <><span style={spinSty} /> Menyimpan...</>
                  : <><span>✓</span> Sahkan Semua ({proposals.length})</>}
              </button>
            </div>
          </header>

          {/* Banner ralat masa */}
          {hasTimeError && (
            <div style={{
              margin: '0 24px 4px', padding: '10px 16px', borderRadius: 8,
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              fontSize: 12, color: '#B91C1C',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <WarningIcon />
              Terdapat ralat validasi masa pada beberapa kad. Betulkan dahulu sebelum
              butang "Sahkan Semua" boleh digunakan.
            </div>
          )}

          {/* Grid kad cadangan */}
          <div style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {proposals.map((p, idx) => {
              const tb         = getTypeBadge(p.task_type);
              const assignedCtx = p.available_staff.find(s => String(s.id) === String(p.staff_id));
              const hasCompress = !!assignedCtx?.compressed_window;

              return (
                <div key={p.task_id} style={{
                  background: '#fff', borderRadius: 14,
                  border: p.timeError ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
                  boxShadow: p.timeError
                    ? '0 2px 8px rgba(185,28,28,0.08)'
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}>

                  {/* ── Kad Header (read-only metadata) ── */}
                  <div style={{
                    padding: '12px 18px', background: '#F8FAFC',
                    borderBottom: '1px solid #EEF2F7',
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                        background: tb.bg, color: tb.color,
                        letterSpacing: '0.4px', textTransform: 'uppercase'
                      }}>
                        {p.task_type || 'Tidak Ditentukan'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                        Cadangan #{idx + 1}
                      </span>
                    </div>
                    {/* Nombor tempahan — STATIK, tidak boleh ditukar */}
                    <div style={{
                      fontSize: 11, color: '#475569', fontWeight: 600,
                      background: '#EEF2F7', padding: '4px 10px', borderRadius: 8,
                      whiteSpace: 'nowrap', userSelect: 'none'
                    }}>
                      📋 Tempahan: {p.order_number || '—'}
                    </div>
                  </div>

                  {/* ── Maklumat Tempahan (read-only) ── */}
                  <div style={{ padding: '10px 18px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {p.client_name && (
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        👤 <strong>{p.client_name}</strong>
                      </span>
                    )}
                    {p.item_type && (
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        📦 {p.item_type}{p.quantity ? ` (${p.quantity} unit)` : ''}
                      </span>
                    )}
                    {p.due_date && (
                      <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                        🗓 Tarikh Akhir: {formatDisplayDate(p.due_date)}
                      </span>
                    )}
                  </div>

                  {p.specifications && (
                    <div style={{ padding: '4px 18px 0' }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
                        Spesifikasi: {p.specifications}
                      </p>
                    </div>
                  )}

                  {/* ── Amaran cuti separa ── */}
                  {hasCompress && (
                    <div style={{
                      margin: '10px 18px 0', padding: '8px 12px', borderRadius: 8,
                      background: '#FFFBEB', border: '1px solid #FCD34D',
                      fontSize: 11, color: '#92400E',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <WarningIcon />
                      {assignedCtx.compressed_window}
                    </div>
                  )}

                  {/* ── Medan boleh diedit ── */}
                  <div style={{
                    padding: '14px 18px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px'
                  }}>
                    {/* Tugaskan kepada (full-width) */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: 11 }}>
                        Tugaskan Kepada <span className="required">*</span>
                      </label>
                      <select className="form-select" value={p.staff_id} style={{ fontSize: 13 }}
                        onChange={e => handleProposalChange(p.task_id, 'staff_id', e.target.value)}>
                        <option value="">-- Pilih Staf --</option>
                        {staffList.map(s => {
                          const ctx     = p.available_staff.find(a => String(a.id) === String(s.id));
                          const onLeave = !ctx;
                          const wl      = ctx?.workload || 0;
                          return (
                            <option key={s.id} value={s.id} disabled={onLeave}>
                              {s.name || s.full_name} ({s.role || s.job_title})
                              {wl > 0 ? ` · ${wl} tugasan aktif` : ''}
                              {onLeave ? ' · (Cuti)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Jenis Tugasan */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>
                        Jenis Tugasan <span className="required">*</span>
                      </label>
                      <select className="form-select" value={p.task_type} style={{ fontSize: 13 }}
                        onChange={e => handleProposalChange(p.task_id, 'task_type', e.target.value)}>
                        <option value="">-- Pilih --</option>
                        {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Deskripsi (full-width) */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Deskripsi / Arahan</label>
                      <textarea className="form-input" rows={2}
                        value={p.description} placeholder="Penerangan tugasan kepada staf..."
                        style={{ fontSize: 13, resize: 'vertical', minHeight: 56 }}
                        onChange={e => handleProposalChange(p.task_id, 'description', e.target.value)} />
                    </div>

                    {/* Masa Mula */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Masa Mula</label>
                      <input type="datetime-local" className="form-input"
                        value={p.start_time}
                        style={{ fontSize: 13, borderColor: p.timeError ? '#FCA5A5' : undefined }}
                        onChange={e => handleProposalChange(p.task_id, 'start_time', e.target.value)} />
                    </div>

                    {/* Masa Tamat (dengan atribut min untuk cegah nilai tidak sah di UI) */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Masa Tamat</label>
                      <input type="datetime-local" className="form-input"
                        value={p.end_time}
                        min={p.start_time || undefined}
                        style={{ fontSize: 13, borderColor: p.timeError ? '#FCA5A5' : undefined }}
                        onChange={e => handleProposalChange(p.task_id, 'end_time', e.target.value)} />
                    </div>

                    {/* Mesej ralat masa */}
                    {p.timeError && (
                      <div style={{
                        gridColumn: '1 / -1', marginTop: -6,
                        fontSize: 11, color: '#B91C1C', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 5
                      }}>
                        <WarningIcon /> {p.timeError}
                      </div>
                    )}
                  </div>

                  {/* ── Butang Padam Cadangan ── */}
                  <div style={{ padding: '0 18px 14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleDeleteProposalClick(p.task_id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 8,
                        border: '1px solid #FCA5A5', background: '#FFF1F2',
                        color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}>
                      <TrashIcon /> Padam Cadangan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer seksyen cadangan */}
          <div style={{
            borderTop: '1px solid #E8EDF3', padding: '14px 24px',
            background: '#F8FAFC'
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
              {proposals.length} cadangan menunggu pengesahan · Guna butang <strong>"Sahkan Semua"</strong> di atas untuk simpan ke pangkalan data.
            </p>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          BAHAGIAN 2 — PAPAN AGIHAN TUGASAN (DB-BACKED)
      ══════════════════════════════════════════════════════════ */}
      <section className="section-card" aria-label="Papan Agihan Tugasan">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Papan Agihan Tugasan
            <span className="badge badge-gray" style={{ fontSize: 11, marginLeft: 4 }}>
              {board.length} tugasan
            </span>
            {hasDrafts && (
              <span style={{ fontSize: 11, marginLeft: 6, padding: '2px 9px', borderRadius: 20,
                background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>
                {draftCount} Draf
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('staf')} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', gap: 5,
                background: viewMode === 'staf' ? '#EFF6FF' : '#fff',
                color: viewMode === 'staf' ? '#1D4ED8' : '#64748B',
                borderRight: '1px solid #E2E8F0',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Mengikut Staf
              </button>
              <button onClick={() => setViewMode('kanban')} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', gap: 5,
                background: viewMode === 'kanban' ? '#EFF6FF' : '#fff',
                color: viewMode === 'kanban' ? '#1D4ED8' : '#64748B',
              }}>
                <KanbanIcon /> Papan Kanban
              </button>
            </div>
            {hasDrafts && (
              <button className="btn btn--primary" onClick={handleConfirmAll}
                disabled={isConfirming}
                style={{ fontSize: 12, padding: '6px 14px',
                  background: '#D97706', borderColor: '#D97706',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                {isConfirming
                  ? <><span style={{ ...spinSty, width: 11, height: 11 }} /> Mengesahkan...</>
                  : <><span>✓</span> Sahkan Semua Agihan</>}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div style={{ margin: '0 24px 16px', padding: '10px 16px', background: '#FEF2F2',
            border: '1px solid #FCA5A5', borderRadius: 8, color: '#B91C1C', fontSize: 12 }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 13 }}>Memuatkan papan agihan...</p>
          </div>
        ) : staffColumns.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>

            {orderCount === 0 ? (
              /* Kes: tiada orders langsung — tunjuk panduan 2 langkah */
              <>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>Belum ada tempahan</p>
                <p style={{ margin: '6px 0 24px', fontSize: 13, color: '#94A3B8' }}>
                  Ikuti langkah di bawah untuk mula menggunakan agihan tugasan AI.
                </p>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 320 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px' }}>
                    <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                      background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>Tambah tempahan baharu</p>
                      <p style={{ margin: '3px 0 8px', fontSize: 12, color: '#3B82F6' }}>
                        Pergi ke halaman Tempahan dan buat tempahan pertama anda.
                      </p>
                      <Link to="/tempahan"
                        style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none',
                          background: '#DBEAFE', padding: '4px 10px', borderRadius: 6 }}>
                        Pergi ke Tempahan →
                      </Link>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px',
                    opacity: 0.6 }}>
                    <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                      background: '#94A3B8', color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748B' }}>Jana cadangan AI</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94A3B8' }}>
                        Kembali ke sini dan tekan "Jana Cadangan AI" setelah ada tempahan.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Kes: ada orders, papan kosong sebab belum generate */
              <>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>Tiada tugasan diagihkan</p>
                <p style={{ margin: '6px 0 20px', fontSize: 13, color: '#94A3B8' }}>
                  Tekan <strong>"Jana Cadangan AI"</strong> untuk menjana cadangan agihan tugasan.
                </p>
                <button className="btn btn--primary" onClick={handleJanaAgihan}
                  disabled={isGenerating}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: isGenerating ? 0.75 : 1 }}>
                  {isGenerating
                    ? <><span style={spinSty} /> AI Sedang Menganalisis...</>
                    : <><SparkleIcon /> Jana Cadangan AI</>}
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'staf' ? (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {staffColumns.map(([staffName, data], colIdx) => {
                const confirmedTasks  = data.tasks.filter(t => t.approval_status === 'Confirmed');
                const jumlahConfirmed = confirmedTasks.length;
                const siapCount       = confirmedTasks.filter(t => t.status === 'Completed').length;
                const peratusSiap     = jumlahConfirmed > 0 ? (siapCount / jumlahConfirmed) * 100 : null;

                const colBg     = peratusSiap === null ? '#F8FAFC'
                                : peratusSiap >= 90    ? '#DCFCE7'
                                : peratusSiap >= 50    ? '#FEF3C7'
                                : '#FEE2E2';
                const colBorder = peratusSiap === null ? '#E8EDF3'
                                : peratusSiap >= 90    ? '#86EFAC'
                                : peratusSiap >= 50    ? '#FDE68A'
                                : '#FCA5A5';
                const isRed = peratusSiap !== null && peratusSiap < 50;

                return (
                  <div key={staffName}
                    style={{
                      background: colBg, borderRadius: 12,
                      border: `1px solid ${colBorder}`, overflow: 'hidden',
                      ...(isRed ? { cursor: 'pointer' } : {}),
                    }}
                    title={isRed ? 'Klik untuk lihat papan kanban' : undefined}
                    onClick={isRed ? () => setViewMode('kanban') : undefined}
                  >
                    {/* Kolum header */}
                    <div style={{ padding: '12px 14px', background: '#fff',
                      borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: STAFF_COLORS[colIdx % STAFF_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff'
                      }}>{getInitials(staffName)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{staffName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{data.role || 'Staf'}</div>
                      </div>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11,
                        fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                        {data.tasks.length}
                      </span>
                      {peratusSiap !== null && (
                        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
                          {Math.round(peratusSiap)}% siap
                        </span>
                      )}
                    </div>
                  {/* Senarai kad */}
                  <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.tasks.map(task => {
                      const tb      = getTypeBadge(task.task_type);
                      const sb      = getStatusBadge(task.status);
                      const ab      = getApprovalBadge(task.approval_status);
                      const isDraft = task.approval_status === 'Draft';
                      return (
                        <div key={task.id} onClick={() => handleEditTask(task)}
                          style={{
                            borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                            border: isDraft ? '1px solid #FCD34D' : '1px solid #E8EDF3',
                            background: isDraft ? '#FFFDF0' : '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          title="Klik untuk edit">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px',
                              borderRadius: 20, background: tb.bg, color: tb.color,
                              textTransform: 'uppercase' }}>
                              {task.task_type}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 20, background: ab.bg, color: ab.color,
                              border: `1px solid ${ab.border}` }}>
                              {ab.label}
                            </span>
                          </div>
                          <div style={{ marginTop: 5 }}>
                            <span className={sb.cls} style={{ fontSize: 10 }}>{sb.label}</span>
                          </div>
                          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#334155', lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {task.description || '—'}
                          </p>
                          {task.order_number && (
                            <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 11, color: '#64748B' }}>
                                📋 {task.order_number}{task.client_name ? ` · ${task.client_name}` : ''}
                              </span>
                            </div>
                          )}
                          {isDraft && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}
                              onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleEditTask(task)} style={actBtn('#EFF6FF','#1E40AF')}>
                                <EditIcon /> Edit
                              </button>
                              <button onClick={e => handleDeleteDraft(task.id, e)} style={actBtn('#FEF2F2','#B91C1C')}>
                                <TrashIcon /> Padam
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ); })}

            </div>
          </div>
        ) : (
          /* ── Papan Kanban — 3 lajur status ── */
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {kanbanGrouped.map(col => (
                <div key={col.key} style={{ background: '#F8FAFC', borderRadius: 12,
                  border: '1px solid #E8EDF3', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', background: '#fff',
                    borderBottom: `3px solid ${col.accent}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{col.label}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: col.badgeBg, color: col.badgeColor }}>{col.tasks.length}</span>
                  </div>
                  <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                    {col.tasks.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: '#CBD5E1', fontSize: 12 }}>
                        Tiada tugasan
                      </div>
                    ) : col.tasks.map(task => {
                      const tb = getTypeBadge(task.task_type);
                      const ab = getApprovalBadge(task.approval_status);
                      return (
                        <div key={task.id} style={{ borderRadius: 8, padding: '10px 12px',
                          border: '1px solid #E8EDF3', background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                              background: tb.bg, color: tb.color, textTransform: 'uppercase' }}>{task.task_type}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: ab.bg, color: ab.color, border: `1px solid ${ab.border}` }}>{ab.label}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 3 }}>
                            {task.staff_name || '—'}
                          </div>
                          <p style={{ margin: '0 0 5px', fontSize: 11.5, color: '#64748B', lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {task.description || '—'}
                          </p>
                          {task.order_number && (
                            <div style={{ paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>
                                📋 {task.order_number}{task.client_name ? ` · ${task.client_name}` : ''}
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
            <p style={{ marginTop: 12, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
              Kemaskini status tugasan dibuat oleh staf melalui portal mereka.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          MODAL: PENGESAHAN PADAM CADANGAN (custom, bukan window.confirm)
      ══════════════════════════════════════════════════════════ */}
      {pendingDelete !== null && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="dlg-padam-title"
          style={overlaySty}
          onClick={() => setPendingDelete(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
            animation: 'slideIn 0.2s ease'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal body */}
            <div style={{ padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: '#FEF2F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#B91C1C" strokeWidth={2} strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </div>
                <div>
                  <h2 id="dlg-padam-title" style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    Padam Cadangan Tugasan?
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    Cadangan tugasan ini akan dibuang daripada senarai draf.
                    Tindakan ini <strong>tidak boleh diundur</strong>.
                  </p>
                </div>
              </div>
            </div>
            {/* Modal footer */}
            <div style={{
              padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'flex-end', gap: 10
            }}>
              <button ref={cancelDeleteRef} className="btn btn--secondary"
                onClick={() => setPendingDelete(null)}>
                Batal
              </button>
              <button className="btn btn--primary" onClick={confirmDeleteProposal}
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}>
                Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: PENGESAHAN GENERIK (buang semua / padam draf papan)
      ══════════════════════════════════════════════════════════ */}
      {confirmDlg && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="dlg-confirm-title"
          style={overlaySty}
          onClick={() => setConfirmDlg(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
            animation: 'slideIn 0.2s ease'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: confirmDlg.danger ? '#FEF2F2' : '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {confirmDlg.danger ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#B91C1C" strokeWidth={2} strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#2563EB" strokeWidth={2} strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 id="dlg-confirm-title"
                    style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    {confirmDlg.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    {confirmDlg.body}
                  </p>
                </div>
              </div>
            </div>
            <div style={{
              padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'flex-end', gap: 10
            }}>
              <button ref={cancelConfirmRef} className="btn btn--secondary"
                onClick={() => setConfirmDlg(null)}>
                Batal
              </button>
              <button className="btn btn--primary" onClick={confirmDlg.onConfirm}
                style={confirmDlg.danger
                  ? { background: '#B91C1C', borderColor: '#B91C1C' }
                  : {}}>
                {confirmDlg.label || 'Sahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: EDIT TUGASAN PADA PAPAN (DB)
      ══════════════════════════════════════════════════════════ */}
      {editingTask && (
        <div style={overlaySty} onClick={() => setEditingTask(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              background: '#FAFBFD', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Edit Tugasan</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>
                  📋 {editingTask.order_number || '—'} · {editingTask.client_name || '—'}
                  {editingTask.approval_status === 'Draft' && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700,
                      background: '#FEF3C7', color: '#92400E', padding: '1px 8px', borderRadius: 10 }}>
                      Draf
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setEditingTask(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, color: '#94A3B8', cursor: 'pointer' }}>
                ×
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Tugaskan Kepada <span className="required">*</span></label>
                <select className="form-select" value={editForm.assigned_staff_id}
                  onChange={e => setEditForm(f => ({ ...f, assigned_staff_id: e.target.value }))}>
                  <option value="">-- Pilih Staf --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.full_name} ({s.role || s.job_title})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Jenis Tugasan <span className="required">*</span></label>
                <select className="form-select" value={editForm.task_type}
                  onChange={e => setEditForm(f => ({ ...f, task_type: e.target.value }))}>
                  <option value="">-- Pilih Jenis --</option>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Deskripsi</label>
                <textarea className="form-input" rows={3} value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Penerangan tugasan..." style={{ resize: 'vertical', minHeight: 72 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Masa Mula</label>
                  <input type="datetime-local" className="form-input" value={editForm.start_time}
                    onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Masa Tamat</label>
                  <input type="datetime-local" className="form-input" value={editForm.end_time}
                    min={editForm.start_time || undefined}
                    onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              background: '#FAFBFD', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <button className="btn btn--secondary" onClick={() => setEditingTask(null)} disabled={isSaving}>
                Batal
              </button>
              <button className="btn btn--primary" onClick={handleEditSave} disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150, justifyContent: 'center' }}>
                {isSaving ? <><span style={spinSty} /> Menyimpan...</> : <><span>✓</span> Simpan Perubahan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .kpi-card--amber { background: linear-gradient(145deg,#78350F 0%,#D97706 55%,#F59E0B 100%); }
        .kpi-card--amber .kpi-label,
        .kpi-card--amber .kpi-footer { color: rgba(255,255,255,0.85); }
      `}</style>
    </div>
  );
}

// ── Gaya pembolehubah ─────────────────────────────────────────────
const actBtn = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 6, border: 'none',
  background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer'
});

const spinSty = {
  display: 'inline-block', width: 14, height: 14, flexShrink: 0,
  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};

const overlaySty = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 20
};
