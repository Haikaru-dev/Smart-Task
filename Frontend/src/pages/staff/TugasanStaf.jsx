// src/pages/staff/TugasanStaf.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';
import Pagination from '../../components/Pagination';

// ── Ikon SVG ──────────────────────────────────────────────────────
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={2.2} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ms-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function getTaskStatusBadge(status = '') {
  const s = status.toLowerCase().replace(' ', '');
  if (s === 'completed' || s === 'done') return { style: badge.success, label: 'Selesai' };
  if (s === 'inprogress')               return { style: badge.info,    label: 'Dalam Proses' };
  return { style: badge.warning, label: 'Menunggu' };
}

function getTaskTypeBadge(type = '') {
  const map = {
    'Design':   { bg: '#EDE9FE', color: '#6D28D9' },
    'Printing': { bg: '#DBEAFE', color: '#1D4ED8' },
    'Packing':  { bg: '#FEF3C7', color: '#B45309' },
    'Delivery': { bg: '#DCFCE7', color: '#15803D' },
  };
  return map[type] || { bg: '#F1F5F9', color: '#475569' };
}

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'ST';
}

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function TugasanStaf() {
  // ── Baca profil staf dari localStorage ──
  const raw = localStorage.getItem('staffUser') || localStorage.getItem('user');
  const staffUser  = raw ? JSON.parse(raw) : {};
  // users.id digunakan sebagai staff_id (kerana tasks.assigned_staff_id = staff.id dari jadual staff)
  // Nota: bergantung kepada bagaimana agihan dijana, kita cuba kedua-dua
  const staffId   = staffUser?.staffId || staffUser?.id || '';
  const staffName = staffUser?.name    || staffUser?.username || 'Staf';

  // ── State ──
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);

  // Modal kemaskini
  const [modalOpen, setModalOpen]   = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [form, setForm]             = useState({ status: '', notes: '', file: null });
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null);

  // ── Ambil tugasan staf ──
  const fetchTasks = useCallback(async () => {
    if (!staffId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/staff/tasks/${staffId}`);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Ralat fetchTasks:', err);
      setError('Gagal memuatkan tugasan. Semak sambungan backend.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Metrik dikira secara dinamik ──
  const countNew        = tasks.filter(t => t.status?.toLowerCase() === 'pending').length;
  const countInProgress = tasks.filter(t => t.status?.toLowerCase() === 'in progress').length;
  const countDone       = tasks.filter(t =>
    t.status?.toLowerCase() === 'completed' || t.status?.toLowerCase() === 'done'
  ).length;

  const PAGE_SIZE = 10;
  const paginatedTasks = tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpiCards = [
    { label: 'Tugasan Baru',    value: countNew,        cls: 'kpi-card kpi-card--blue',  Icon: FolderIcon,  footer: 'Menunggu tindakan anda' },
    { label: 'Sedang Proses',   value: countInProgress, cls: 'kpi-card kpi-card--amber', Icon: RefreshIcon, footer: 'Sedang dilaksanakan' },
    { label: 'Siap Hari Ini',   value: countDone,       cls: 'kpi-card kpi-card--green', Icon: CheckIcon,   footer: 'Tugasan diselesaikan' },
  ];

  // ── Buka modal kemaskini ──
  const openModal = (task) => {
    setActiveTask(task);
    setForm({ status: task.status || 'Pending', notes: task.staff_notes || '', file: null });
    setSaveMsg(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveTask(null);
    setSaveMsg(null);
  };

  // ── Hantar kemaskini status ke backend ──
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      await axios.patch(`${API_BASE_URL}/api/tasks/${activeTask.id}/status`, {
        status: form.status
      });

      setSaveMsg({ type: 'success', text: 'Status tugasan berjaya dikemaskini!' });
      setTasks(prev => prev.map(t =>
        t.id === activeTask.id ? { ...t, status: form.status } : t
      ));
      setTimeout(closeModal, 1200);
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan. Cuba semula.';
      setSaveMsg({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Jadual Sejarah Permohonan — data statik MVP ──
  const sejarah = [
    { tarikh: '2026-05-10', sebab: 'Cuti Sakit (MC) - Demam',         status: 'Lulus' },
    { tarikh: '2026-04-22', sebab: 'Urusan Keluarga - Balik kampung',  status: 'Lulus' },
    { tarikh: '2026-04-05', sebab: 'Cuti Tahunan - Percutian',         status: 'Ditolak' },
  ];

  // ── JSON-LD Data ──
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Tugasan Staf - SmartTask",
    "description": "Paparan senarai tugasan semasa dan akan datang untuk staf melaksanakan kerja.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Staff and Employees"
    },
    "about": {
      "@type": "Thing",
      "name": "Senarai Tugasan (To-Do List)"
    }
  };

  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />

      {/* ── Sapaan Staf ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Selamat Datang, {staffName} 👋</h1>
          <p className="page-subtitle">
            Berikut adalah tugasan dan status kerja anda hari ini
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1px solid #E8EDF3',
          borderRadius: 12, padding: '10px 16px',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1E40AF,#2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {getInitials(staffName)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{staffName}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>ID: {staffId || '—'}</div>
          </div>
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

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '12px 18px', background: '#FEF2F2',
          border: '1px solid #FCA5A5', borderRadius: 8,
          color: '#B91C1C', fontSize: 13, marginBottom: 20
        }}>⚠ {error}</div>
      )}

      {!staffId && (
        <div style={{
          padding: '16px 20px', background: '#FEF3C7',
          border: '1px solid #FDE68A', borderRadius: 8,
          color: '#92400E', fontSize: 13, marginBottom: 20
        }}>
          ⚠ ID staf tidak dijumpai dalam sesi. Sila <strong>log masuk semula</strong>.
        </div>
      )}

      {/* ── Jadual Tugasan Aktif ── */}
      <section className="section-card" style={{ marginBottom: 20 }} aria-label="Tugasan Aktif">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Senarai Tugasan Aktif
            <span className="badge badge--gray badge no-dot" style={{ fontSize: 11 }}>
              {tasks.length} tugasan
            </span>
          </div>
          <button
            onClick={fetchTasks}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: '#64748B', display: 'flex',
              alignItems: 'center', gap: 5,
            }}
          >
            ↻ Muat Semula
          </button>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Order / Projek</th>
                <th>Tugasan</th>
                <th>Tarikh Hantar</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Memuatkan tugasan...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Tiada tugasan diagihkan kepada anda.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(task => {
                  const typeBadge   = getTaskTypeBadge(task.task_type);
                  const { style: stBadge, label: stLabel } = getTaskStatusBadge(task.status);
                  return (
                    <tr key={task.id}>
                      {/* ID Order */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
                          {task.order_number || `#${task.order_id}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                          {task.client_name || '—'}
                        </div>
                      </td>

                      {/* Jenis Tugasan */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px',
                            borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: typeBadge.bg, color: typeBadge.color,
                            letterSpacing: '0.3px', width: 'fit-content'
                          }}>
                            {task.task_type}
                          </span>
                          {task.description && (
                            <span style={{
                              fontSize: 11.5, color: '#64748B', lineHeight: 1.4,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              maxWidth: 220
                            }}>
                              {task.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tarikh */}
                      <td>
                        <span className="td-mono">
                          {task.due_date ? formatDate(task.due_date) : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={stBadge}>{stLabel}</span>
                      </td>

                      {/* Tindakan */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => openModal(task)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          id={`btn-kemaskini-${task.id}`}
                        >
                          <EditIcon /> Kemaskini
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={tasks.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </section>

      {/* ── Jadual Sejarah Permohonan ── */}
      <section className="section-card" aria-label="Sejarah Cuti">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" style={{ background: '#8B5CF6' }} />
            Sejarah Permohonan Cuti
          </div>
          <span className="section-card-meta">3 rekod terkini</span>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarikh Mohon</th>
                <th>Sebab / Catatan</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sejarah.map((row, i) => (
                <tr key={i}>
                  <td><span className="td-mono">{formatDate(row.tarikh)}</span></td>
                  <td style={{ color: '#475569' }}>{row.sebab}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={row.status === 'Lulus' ? badge.success : badge.danger}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal Kemaskini Tugasan ── */}
      {modalOpen && activeTask && (
        <div style={modal.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={modal.box}>

            {/* Header Modal */}
            <div style={modal.header}>
              <div>
                <h2 style={modal.title}>Kemaskini Tugasan</h2>
                <p style={modal.subtitle}>
                  {activeTask.task_type} · {activeTask.order_number || `Order #${activeTask.order_id}`}
                </p>
              </div>
              <button style={modal.closeBtn} onClick={closeModal}><CloseIcon /></button>
            </div>

            {/* Body Modal */}
            <form onSubmit={handleSave}>
              <div style={modal.body}>

                {/* Dropdown Status */}
                <div style={modal.field}>
                  <label style={modal.label}>
                    Status Tugasan <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="modal-status-select"
                    style={modal.input}
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    required
                  >
                    <option value="Pending">Menunggu (Pending)</option>
                    <option value="In Progress">Sedang Proses (In Progress)</option>
                    <option value="Completed">Selesai (Completed)</option>
                  </select>
                </div>

                {/* Upload Fail */}
                <div style={modal.field}>
                  <label style={modal.label}>Muat Naik Hasil Kerja</label>
                  <div style={modal.fileWrap}>
                    <input
                      id="modal-file-input"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
                      accept="image/*,.pdf"
                    />
                    <label htmlFor="modal-file-input" style={modal.fileBtn}>
                      📎 Pilih Fail
                    </label>
                    <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 10 }}>
                      {form.file ? form.file.name : 'Tiada fail dipilih (JPG, PNG, PDF)'}
                    </span>
                  </div>
                </div>

                {/* Nota */}
                <div style={modal.field}>
                  <label style={modal.label}>Nota / Catatan</label>
                  <textarea
                    id="modal-notes-input"
                    style={{ ...modal.input, minHeight: 90, resize: 'vertical' }}
                    placeholder="Tambah nota atau catatan berkaitan tugasan ini..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* Mesej simpan */}
                {saveMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: saveMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2',
                    color: saveMsg.type === 'success' ? '#15803D' : '#B91C1C',
                    border: `1px solid ${saveMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
                  }}>
                    {saveMsg.type === 'success' ? '✓' : '⚠'} {saveMsg.text}
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div style={modal.footer}>
                <button type="button" className="btn btn--secondary" onClick={closeModal}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  id="btn-simpan-kemaskini"
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan Kemaskini'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// ── Badge Styles ──────────────────────────────────────────────────
const badge = {
  success: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 11.5, fontWeight: 600,
    background: '#DCFCE7', color: '#15803D',
  },
  warning: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 11.5, fontWeight: 600,
    background: '#FEF3C7', color: '#B45309',
  },
  info: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 11.5, fontWeight: 600,
    background: '#DBEAFE', color: '#1D4ED8',
  },
  danger: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 11.5, fontWeight: 600,
    background: '#FEE2E2', color: '#B91C1C',
  },
};

// ── Modal Styles ──────────────────────────────────────────────────
const modal = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  box: {
    background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500,
    boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    padding: '20px 24px', background: '#FAFBFD',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 },
  subtitle: { fontSize: 12, color: '#94A3B8', margin: '4px 0 0' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 4, display: 'flex', borderRadius: 6,
  },
  body: {
    padding: '22px 24px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#374151' },
  input: {
    width: '100%', padding: '10px 13px', fontSize: 13.5,
    border: '1.5px solid #E2E8F0', borderRadius: 9,
    background: '#F8FAFC', color: '#0F172A', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border 0.15s',
  },
  fileWrap: { display: 'flex', alignItems: 'center' },
  fileBtn: {
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    background: '#EFF6FF', color: '#2563EB', fontSize: 12.5,
    fontWeight: 600, border: '1px dashed #BFDBFE',
    whiteSpace: 'nowrap',
  },
  footer: {
    padding: '16px 24px', background: '#FAFBFD',
    borderTop: '1px solid #F1F5F9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
  },
};
