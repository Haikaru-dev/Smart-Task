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

// Helper: tentukan badge class dari status
function getBadgeClass(status = '') {
  const s = status.toLowerCase();
  if (s === 'selesai' || s === 'siap' || s === 'completed') return 'badge--success';
  if (s === 'pending' || s === 'menunggu') return 'badge--warning';
  if (s === 'in progress' || s === 'sedang berjalan') return 'badge--info';
  if (s === 'ralat' || s === 'error' || s === 'batal') return 'badge--danger';
  return 'badge--gray';
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

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/orders`);
        // Pangkalan data kadangkala menghantar dalam format response.data atau response.data.data
        const data = response.data.data || response.data;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Ralat mengambil data tempahan:', err);
        setError('Gagal memuat turun data tempahan. Sila pastikan backend sedang berjalan.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // Fungsi mengawal Modal
  function handleOpenModal(order) {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedOrder(null);
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
                    aria-label={`Lihat perincian tempahan ${order.order_number}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenModal(order); } }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="td-id">{order.order_number}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1E293B' }}>{order.client_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {order.item_type ? order.item_type.replace('_', ' ') : '-'}
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
                    {selectedOrder.item_type ? selectedOrder.item_type.replace('_', ' ') : '-'}
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
                  <span style={modalStyles.infoLabel}>Status Semasa</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${getBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status || 'Pending'}
                    </span>
                  </div>
                </div>
                <div style={modalStyles.infoItem}>
                  <span style={modalStyles.infoLabel}>Jenis Penghantaran</span>
                  <span style={{ ...modalStyles.infoValue, textTransform: 'capitalize' }}>
                    {selectedOrder.delivery_type || '-'}
                  </span>
                </div>
                
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
              </div>
            </div>
            
            {/* Footer Modal */}
            <div style={modalStyles.footer}>
              <button className="btn btn--primary" onClick={handleCloseModal}>
                Tutup Tetingkap
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
