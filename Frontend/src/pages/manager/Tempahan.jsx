// src/pages/Tempahan.jsx
// ================================================================
// Halaman: Senarai Tempahan
// Logik: useEffect untuk ambil data (axios.get), paparkan di jadual, buka Modal
// ================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';
import Pagination from '../../components/Pagination';
import useAutoRefresh from '../../hooks/useAutoRefresh';

// Helper: tentukan badge class dari status
function getBadgeClass(status = '') {
  const s = status.toLowerCase();
  if (s === 'selesai' || s === 'siap' || s === 'completed') return 'badge--success';
  if (s === 'pending' || s === 'menunggu') return 'badge--warning';
  if (s === 'in progress' || s === 'sedang berjalan') return 'badge--info';
  if (s === 'ralat' || s === 'error' || s === 'batal' || s === 'cancelled') return 'badge--danger';
  return 'badge--gray';
}

// ── Aliran kerja berperingkat ──
const STAGE_ORDER = ['Design', 'Printing', 'Packing', 'Delivery'];

// Badge status tugasan per-peringkat
function getTaskStatusBadge(status = '') {
  switch (status) {
    case 'Completed':   return { cls: 'badge--success', label: 'Selesai' };
    case 'Submitted':   return { cls: 'badge--warning', label: 'Menunggu Kelulusan' };
    case 'In Progress': return { cls: 'badge--info',    label: 'Dalam Proses' };
    default:            return { cls: 'badge--gray',    label: 'Pending' };
  }
}

// Timeline visual status tempahan — status dikira AUTOMATIK oleh backend
const TIMELINE_STEPS = [
  { key: 'Pending',     label: 'Pending' },
  { key: 'In Progress', label: 'Dalam Proses' },
  { key: 'Completed',   label: 'Selesai' },
];

function OrderTimeline({ status }) {
  if (status === 'Cancelled') {
    return (
      <div style={{
        marginTop: 8, padding: '10px 14px', borderRadius: 10,
        background: '#FEF2F2', border: '1px solid #FCA5A5',
        color: '#B91C1C', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        ✕ Tempahan Dibatalkan — semua tugasan telah dipadam daripada sistem.
      </div>
    );
  }
  const activeIdx = Math.max(0, TIMELINE_STEPS.findIndex(s => s.key === status));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 10 }}>
      {TIMELINE_STEPS.map((step, i) => {
        const done   = i < activeIdx || status === 'Completed';
        const active = i === activeIdx && status !== 'Completed';
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < TIMELINE_STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 74 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: done ? '#16A34A' : active ? '#2563EB' : '#F1F5F9',
                color: done || active ? '#fff' : '#94A3B8',
                border: done || active ? 'none' : '1.5px solid #E2E8F0',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                marginTop: 5, fontSize: 11, fontWeight: 600,
                color: done ? '#15803D' : active ? '#1D4ED8' : '#94A3B8',
                textAlign: 'center'
              }}>
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 3, marginTop: 12, borderRadius: 2,
                background: (i < activeIdx || status === 'Completed') ? '#16A34A' : '#E2E8F0'
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Tempahan() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [orderTasks, setOrderTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // Aliran kerja berperingkat: kelulusan hantaran + batalkan tempahan
  const [reviewingTaskId, setReviewingTaskId] = useState(null);
  const [rejectTask, setRejectTask] = useState(null);   // { id, task_type } | null
  const [rejectReason, setRejectReason] = useState('');
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [terminating, setTerminating] = useState(false);

  // ── Ambil data tempahan (silent = tiada spinner, untuk auto-refresh senyap) ──
  async function fetchOrders(silent = false) {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/orders`);
      // Pangkalan data kadangkala menghantar dalam format response.data atau response.data.data
      const data = response.data.data || response.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ralat mengambil data tempahan:', err);
      if (!silent) setError('Gagal memuat turun data tempahan. Sila pastikan backend sedang berjalan.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // ── Auto-refresh: tempahan baharu terus dipaparkan tanpa reload ──
  useAutoRefresh(() => fetchOrders(true));

  // Fungsi mengawal Modal
  async function handleOpenModal(order) {
    setSelectedOrder(order);
    setIsModalOpen(true);
    setLoadingTasks(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/${order.id}/tasks`);
      setOrderTasks(res.data);
    } catch {
      setOrderTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }

  // ── Padam tugasan yang belum diagih terus dari modal ──
  async function handleDeleteTask(taskId) {
    setDeletingTaskId(taskId);
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`);
      setOrderTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memadam tugasan.');
    } finally {
      setDeletingTaskId(null);
    }
  }

  // ── Muat semula order + tugasan selepas tindakan aliran kerja (status kini automatik) ──
  async function refreshOrderContext(orderId) {
    try {
      const [ordersRes, tasksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/orders`),
        axios.get(`${API_BASE_URL}/api/orders/${orderId}/tasks`),
      ]);
      const data = ordersRes.data.data || ordersRes.data;
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      setOrderTasks(tasksRes.data);
      const fresh = list.find(o => o.id === orderId);
      if (fresh) setSelectedOrder(fresh);
    } catch { /* kekalkan paparan sedia ada jika gagal */ }
  }

  // ── Lulus / Tolak hantaran staf (carta alir: 'admin sahkan tugasan dihantar') ──
  async function handleReviewTask(taskId, decision, reason = '') {
    setReviewingTaskId(taskId);
    try {
      await axios.patch(`${API_BASE_URL}/api/tasks/${taskId}/review`, { decision, reason });
      setRejectTask(null);
      setRejectReason('');
      await refreshOrderContext(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyemak tugasan.');
    } finally {
      setReviewingTaskId(null);
    }
  }

  // ── Delivery External: admin sahkan sendiri tanpa assign staf ──
  async function handleCompleteDelivery(taskId) {
    setReviewingTaskId(taskId);
    try {
      await axios.patch(`${API_BASE_URL}/api/tasks/${taskId}/complete-delivery`);
      await refreshOrderContext(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengesahkan penghantaran.');
    } finally {
      setReviewingTaskId(null);
    }
  }

  // ── Batalkan tempahan (Terminate) — semua tugasan dipadam, status jadi Cancelled ──
  async function handleTerminate() {
    setTerminating(true);
    try {
      await axios.post(`${API_BASE_URL}/api/orders/${selectedOrder.id}/terminate`);
      setShowTerminateConfirm(false);
      await refreshOrderContext(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membatalkan tempahan.');
    } finally {
      setTerminating(false);
    }
  }

  // ── JSON-LD Data ──
  const PAGE_SIZE = 10;
  const paginatedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Senarai Tempahan - SmartTask",
    "description": "Paparan dan pengurusan senarai tempahan pelanggan secara menyeluruh.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Administrators and Managers"
    },
    "about": {
      "@type": "Thing",
      "name": "Senarai Tempahan Pelanggan (Orders List)"
    }
  };

  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />
      {/* ── Page Header ── */}
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Senarai Tempahan</h1>
          <p className="page-subtitle">Pantau dan urus semua tempahan pelanggan</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/tempahan/baru')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Tempahan
        </button>
      </header>

      {/* Paparan Ralat */}
      {error && (
        <div style={{
          padding: '12px 20px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          color: '#B91C1C',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Jadual Tempahan ── */}
      <section className="section-card" aria-label="Jadual Tempahan">
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Rekod Tempahan Semasa
            <span className="badge badge--gray no-dot" style={{ fontSize: 11 }}>
              {orders.length} Rekod
            </span>
          </div>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Tempahan</th>
                <th>Nama Klien</th>
                <th>Jenis Item</th>
                <th>Tarikh Siap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                    Memuatkan data...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                    Tiada rekod tempahan dijumpai.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleOpenModal(order)}
                    tabIndex={0}
                    aria-label={`Lihat perincian tempahan ${order.order_number ?? '-'}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenModal(order); } }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="td-id">{order.order_number}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1E293B' }}>{order.client_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {order.item_type ? order.item_type.replace(/_/g, ' ') : '-'}
                    </td>
                    <td>
                      <span className="td-mono">
                        {order.due_date ? new Date(order.due_date).toLocaleDateString('ms-MY') : '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(order.status)}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={orders.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </section>

      {/* ── Modal Dialog (Pop-up) ── */}
      {isModalOpen && selectedOrder && (
        <div style={modalStyles.overlay} onClick={handleCloseModal}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Perincian Tempahan</h2>
              <button style={modalStyles.closeBtn} onClick={handleCloseModal}>×</button>
            </div>
            
            {/* Kandungan Modal */}
            <div style={modalStyles.body}>
              <div style={modalStyles.infoGrid}>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>No. Tempahan</span>
                  <span style={modalStyles.infoValue}>{selectedOrder.order_number}</span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Nama Klien</span>
                  <span style={modalStyles.infoValue}>{selectedOrder.client_name}</span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Jenis Item</span>
                  <span style={{ ...modalStyles.infoValue, textTransform: 'capitalize' }}>
                    {selectedOrder.item_type ? selectedOrder.item_type.replace(/_/g, ' ') : '-'}
                  </span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Kuantiti</span>
                  <span style={modalStyles.infoValue}>{selectedOrder.quantity} unit</span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Harga</span>
                  <span style={modalStyles.infoValue}>RM {parseFloat(selectedOrder.price || 0).toFixed(2)}</span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Tarikh Siap</span>
                  <span style={modalStyles.infoValue}>
                    {selectedOrder.due_date ? new Date(selectedOrder.due_date).toLocaleDateString('ms-MY') : '-'}
                  </span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Jenis Tempahan</span>
                  <span style={modalStyles.infoValue}>{selectedOrder.order_type || 'Design & Product'}</span>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Jenis Penghantaran</span>
                  <span style={{ ...modalStyles.infoValue, textTransform: 'capitalize' }}>
                    {selectedOrder.delivery_type || '-'}
                  </span>
                </div>

                {/* Timeline status — automatik, menggantikan dropdown manual */}
                <div style={{ ...modalStyles.infoItem, gridColumn: '1 / -1' }}>
                  <span style={modalStyles.infoLabel}>Status Tempahan</span>
                  <OrderTimeline status={selectedOrder.status || 'Pending'} />
                </div>

                {selectedOrder.design_file_path && (
                  <div style={{ ...modalStyles.infoItem, gridColumn: '1 / -1' }}>
                    <span style={modalStyles.infoLabel}>Fail Design Pelanggan</span>
                    <a href={`${API_BASE_URL}${selectedOrder.design_file_path}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600, marginTop: 4 }}>
                      📎 Lihat / Muat Turun Fail Design
                    </a>
                  </div>
                )}
                
                {/* Elemen menggunakan ruangan penuh (full width) */}
                <div style={{ ...modalStyles.infoItem, gridColumn: '1 / -1' }}>
                  <span style={modalStyles.infoLabel}>Lokasi Penghantaran</span>
                  <span style={modalStyles.infoValue}>{selectedOrder.delivery_location || '-'}</span>
                </div>
                
                <div style={{ ...modalStyles.infoItem, gridColumn: '1 / -1' }}>
                  <span style={modalStyles.infoLabel}>Nota Tambahan / Spesifikasi</span>
                  <div style={modalStyles.notesBox}>
                    {selectedOrder.specifications || 'Tiada nota tambahan disertakan.'}
                  </div>
                </div>

                <div style={{ ...modalStyles.infoItem, gridColumn: '1 / -1' }}>
                  <span style={modalStyles.infoLabel}>Tugasan Mengikut Peringkat</span>
                  {loadingTasks ? (
                    <p style={{ fontSize: 13, color: '#64748B' }}>Memuatkan...</p>
                  ) : orderTasks.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#64748B' }}>
                      {selectedOrder.status === 'Cancelled' ? 'Tempahan dibatalkan — tiada tugasan.' : 'Tiada tugasan.'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                      {orderTasks.map(t => {
                        const badge = getTaskStatusBadge(t.status);
                        const isExternalDeliveryTask = t.task_type === 'Delivery'
                          && (selectedOrder.delivery_type || '').toLowerCase() === 'external';
                        const stageIdx = STAGE_ORDER.indexOf(t.task_type);
                        const earlierDone = orderTasks.every(o => {
                          const i = STAGE_ORDER.indexOf(o.task_type);
                          return o.id === t.id || i === -1 || i >= stageIdx || o.status === 'Completed';
                        });
                        const busy = reviewingTaskId === t.id;
                        return (
                          <div key={t.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                            padding: '8px 12px', borderRadius: 8, fontSize: 13,
                            background: t.status === 'Submitted' ? '#FFFBEB' : '#F8FAFC',
                            border: t.status === 'Submitted' ? '1px solid #FCD34D' : '1px solid #E2E8F0'
                          }}>
                            <span style={{ fontWeight: 700, minWidth: 62, color: '#0F172A' }}>{t.task_type}</span>
                            <span className={`badge ${badge.cls}`}>{badge.label}</span>
                            <span style={{ color: '#64748B', fontSize: 12 }}>
                              {isExternalDeliveryTask
                                ? 'Kurier external — disahkan sendiri oleh admin'
                                : t.staff_name || 'Belum diagih'}
                            </span>
                            {t.attachment_path && (
                              <a href={`${API_BASE_URL}${t.attachment_path}`} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>📎 Lampiran</a>
                            )}
                            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                              {t.status === 'Submitted' && (
                                <>
                                  <button className="btn btn--primary" disabled={busy}
                                    style={{ padding: '3px 12px', fontSize: 12 }}
                                    onClick={() => handleReviewTask(t.id, 'approve')}>
                                    {busy ? '…' : '✓ Lulus'}
                                  </button>
                                  <button disabled={busy}
                                    style={{
                                      padding: '3px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
                                      border: '1px solid #FCA5A5', background: '#FFF1F2', color: '#B91C1C', fontWeight: 600
                                    }}
                                    onClick={() => { setRejectTask(t); setRejectReason(''); }}>
                                    ✕ Tolak
                                  </button>
                                </>
                              )}
                              {isExternalDeliveryTask && t.status !== 'Completed' && earlierDone && (
                                <button className="btn btn--primary" disabled={busy}
                                  style={{ padding: '3px 12px', fontSize: 12 }}
                                  onClick={() => handleCompleteDelivery(t.id)}>
                                  {busy ? '…' : '✓ Tandakan Siap'}
                                </button>
                              )}
                              {!t.assigned_staff_id && t.status !== 'Completed' && !isExternalDeliveryTask && (
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  disabled={deletingTaskId === t.id}
                                  title="Padam tugasan ini"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 15, lineHeight: 1 }}
                                >×</button>
                              )}
                            </span>
                            {t.rejection_reason && t.status === 'In Progress' && (
                              <span style={{
                                flexBasis: '100%', fontSize: 12, color: '#B91C1C',
                                background: '#FEF2F2', border: '1px solid #FCA5A5',
                                borderRadius: 6, padding: '4px 8px'
                              }}>
                                Ditolak: {t.rejection_reason}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div style={modalStyles.footer}>
              {selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Completed' && (
                <button
                  onClick={() => setShowTerminateConfirm(true)}
                  style={{
                    marginRight: 'auto', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid #FCA5A5', background: '#FFF1F2', color: '#B91C1C',
                    fontSize: 13, fontWeight: 600
                  }}>
                  ✕ Batalkan Tempahan
                </button>
              )}
              <button className="btn btn--primary" onClick={handleCloseModal}>
                Tutup Tetingkap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog pengesahan Batalkan Tempahan ── */}
      {showTerminateConfirm && selectedOrder && (
        <div style={{ ...modalStyles.overlay, zIndex: 1100 }} onClick={() => setShowTerminateConfirm(false)}>
          <div style={{ ...modalStyles.modal, maxWidth: 430 }} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Batalkan Tempahan?</h2>
              <button style={modalStyles.closeBtn} onClick={() => setShowTerminateConfirm(false)}>×</button>
            </div>
            <div style={modalStyles.body}>
              <p style={{ fontSize: 14, color: '#1E293B', margin: 0 }}>
                Tempahan <strong>{selectedOrder.order_number}</strong> akan ditandakan sebagai
                <strong> Cancelled</strong> dan <strong>SEMUA tugasan</strong> tempahan ini
                (termasuk yang sudah diagih kepada staf) akan <strong>dipadam</strong> daripada sistem.
              </p>
              <p style={{ fontSize: 13, color: '#B91C1C', marginTop: 10, marginBottom: 0 }}>
                Tindakan ini tidak boleh diundurkan.
              </p>
            </div>
            <div style={modalStyles.footer}>
              <button className="btn btn--secondary" onClick={() => setShowTerminateConfirm(false)} disabled={terminating}>
                Batal
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminating}
                style={{
                  padding: '8px 18px', borderRadius: 8, cursor: 'pointer', border: 'none',
                  background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600
                }}>
                {terminating ? 'Membatalkan…' : 'Ya, Batalkan Tempahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal sebab penolakan hantaran ── */}
      {rejectTask && (
        <div style={{ ...modalStyles.overlay, zIndex: 1100 }} onClick={() => setRejectTask(null)}>
          <div style={{ ...modalStyles.modal, maxWidth: 430 }} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Tolak Hantaran — {rejectTask.task_type}</h2>
              <button style={modalStyles.closeBtn} onClick={() => setRejectTask(null)}>×</button>
            </div>
            <div style={modalStyles.body}>
              <label className="form-label" style={{ fontSize: 12 }}>
                Sebab Penolakan <span className="required">*</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nyatakan apa yang perlu dibaiki oleh staf..."
                style={{ resize: 'vertical', fontSize: 13 }}
              />
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 8, marginBottom: 0 }}>
                Tugasan akan dikembalikan kepada staf ('Dalam Proses') bersama sebab ini.
              </p>
            </div>
            <div style={modalStyles.footer}>
              <button className="btn btn--secondary" onClick={() => setRejectTask(null)}>Batal</button>
              <button
                className="btn btn--primary"
                disabled={!rejectReason.trim() || reviewingTaskId === rejectTask.id}
                onClick={() => handleReviewTask(rejectTask.id, 'reject', rejectReason.trim())}>
                {reviewingTaskId === rejectTask.id ? 'Menghantar…' : 'Tolak Hantaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gaya Inline Khusus untuk Modal Saja (Gaya lain guna index.css) ──
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#FAFBFD',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0F172A',
    margin: 0
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    lineHeight: 1,
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '0 4px'
  },
  body: {
    padding: '24px',
    overflowY: 'auto'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px 16px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '14px',
    color: '#1E293B',
    fontWeight: '500'
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13.5px',
    color: '#334155',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'flex-end',
    background: '#FAFBFD',
    borderBottomLeftRadius: '16px',
    borderBottomRightRadius: '16px'
  }
};
