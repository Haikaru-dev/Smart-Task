// src/pages/DetailStaf.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Mock Data untuk Tugasan Semasa
const MOCK_TASKS = [
  { id: 'ORD-20260428-1021', name: 'Banting Merdeka', type: 'Design', date: '28/04/2026 10:00 AM', status: 'In Progress' },
  { id: 'ORD-20260429-4432', name: 'Buku Nota Korporat', type: 'Printing', date: '29/04/2026 02:30 PM', status: 'Pending' },
  { id: 'ORD-20260430-8891', name: 'Flyer Promosi Raya', type: 'Finishing', date: '30/04/2026 09:15 AM', status: 'Pending' }
];

export default function DetailStaf() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStaffDetail() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/staff/${id}`);
        // Jika data dibungkus dalam 'data'
        const data = response.data.data || response.data;
        setStaff(data);
      } catch (err) {
        console.error('Ralat mengambil profil staf:', err);
        setError('Gagal memuat turun profil staf. Profil mungkin tidak wujud.');
      } finally {
        setLoading(false);
      }
    }
    fetchStaffDetail();
  }, [id]);

  if (loading) {
    return <div className="page-content"><div style={{ textAlign: 'center', padding: '50px', color: '#64748B' }}>Memuatkan profil staf...</div></div>;
  }

  if (error || !staff) {
    return (
      <div className="page-content">
        <button className="btn-back" onClick={() => navigate('/staf')} style={{ marginBottom: 20 }}>
          <BackIcon /> Kembali ke Senarai Staf
        </button>
        <div style={{ padding: '20px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C' }}>
          ⚠ {error || 'Staf tidak dijumpai.'}
        </div>
      </div>
    );
  }

  // Gunakan data dari pangkalan data atau nilai lalai
  const initial = staff.name ? staff.name.substring(0, 2).toUpperCase() : 'ST';
  const staffIdCode = staff.staff_id_code || `ST-${String(staff.id).padStart(3, '0')}`;
  
  return (
    <div className="page-content">
      {/* ── Butang Kembali ── */}
      <button className="btn-back" onClick={() => navigate('/staf')} style={{ marginBottom: 20 }}>
        <BackIcon /> Kembali ke Senarai Staf
      </button>

      {/* ── Page Header ── */}
      <header className="page-header">
        <h1 className="page-title">Profil Kakitangan</h1>
        <p className="page-subtitle">Maklumat terperinci dan log tugasan semasa</p>
      </header>

      {/* ── Layout Grid (1/3 Kiri, 2/3 Kanan) ── */}
      <div className="detail-staff-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* ── Lajur Kiri: Kad Profil ── */}
        <aside className="section-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 'bold', color: '#475569', marginBottom: '16px'
          }}>
            {initial}
          </div>
          
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px 0' }}>
            {staff.name}
          </h2>
          
          <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '16px', margin: 0 }}>
            ID: {staffIdCode}
          </p>

          <span className="badge badge--info" style={{ padding: '6px 14px', fontSize: '13px', marginBottom: '32px' }}>
            {staff.role || 'Tiada Peranan'}
          </span>

          <div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
            <button 
              className="btn btn--secondary" 
              style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
              onClick={() => alert('Fungsi padam belum diaktifkan.')}
            >
              Padam Staf
            </button>
          </div>
        </aside>

        {/* ── Lajur Kanan: Butiran & Tugasan ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Kad 1: Maklumat Peribadi */}
          <section className="section-card" aria-label="Maklumat Peribadi">
            <header className="section-card-header">
              <div className="section-card-title">Maklumat Peribadi</div>
            </header>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={styles.infoBox}>
                  <div style={styles.label}>Nama Penuh</div>
                  <div style={styles.value}>{staff.name}</div>
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.label}>Peranan / Jawatan</div>
                  <div style={styles.value}>{staff.role || '-'}</div>
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.label}>Emel Rasmi</div>
                  <div style={styles.value}>{staff.email || 'tiada_emel@smarttask.com'}</div>
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.label}>No. Telefon</div>
                  <div style={styles.value}>{staff.phone_number || '-'}</div>
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.label}>Status Pekerja</div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${staff.status === 'Aktif' ? 'badge--success' : 'badge--danger'}`}>
                      {staff.status}
                    </span>
                  </div>
                </div>
                <div style={styles.infoBox}>
                  <div style={styles.label}>User ID (Sistem)</div>
                  <div style={styles.value}>#{staff.id}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Kad 2: Status Tugasan Semasa */}
          <section className="section-card" aria-label="Tugasan Semasa">
            <header className="section-card-header">
              <div className="section-card-title">Status Tugasan Semasa</div>
              <span className="badge badge--warning" style={{ fontSize: '11px' }}>Mock Data</span>
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Order</th>
                    <th>Tugasan</th>
                    <th>Tarikh & Masa</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TASKS.map((task, index) => (
                    <tr key={index}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="td-id">{task.id}</span>
                          <span style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{task.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge--info">{task.type}</span>
                      </td>
                      <td className="td-mono">{task.date}</td>
                      <td>
                        <span className={`badge ${task.status === 'In Progress' ? 'badge--warning' : 'badge--gray'}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
      
      {/* Responsiveness style */}
      <style>{`
        @media (max-width: 768px) {
          .detail-staff-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Komponen Ikon ──
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: '6px' }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ── Gaya Inline ──
const styles = {
  infoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  value: {
    fontSize: '14px',
    color: '#1E293B',
    fontWeight: '500'
  }
};
