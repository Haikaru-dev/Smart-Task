// src/pages/DetailStaf.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export default function DetailStaf() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  useEffect(() => {
    async function fetchStaffDetail() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/staff/${id}`);
        const data = response.data.data || response.data;
        setStaff(data);
      } catch (err) {
        console.error('Ralat mengambil profil staf:', err);
        setError('Gagal memuat turun profil staf. Profil mungkin tidak wujud.');
      } finally {
        setLoading(false);
      }
    }

    async function fetchStaffTasks() {
      try {
        setTasksLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/staff/tasks/${id}`);
        setTasks(Array.isArray(res.data) ? res.data : []);
      } catch {
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    }

    fetchStaffDetail();
    fetchStaffTasks();
  }, [id]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await axios.delete(`${API_BASE_URL}/api/staff/${id}`);
      navigate('/staf');
    } catch (err) {
      console.error('Ralat memadam staf:', err);
      setDeleteError('Gagal memadam staf. Sila cuba semula.');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

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
          
          <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '16px', margin: 0, fontFamily: 'monospace' }}>
            {staff.username || staffIdCode}
          </p>

          <span className="badge badge--info" style={{ padding: '6px 14px', fontSize: '13px', marginBottom: '32px' }}>
            {staff.role || 'Tiada Peranan'}
          </span>

          <div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
            {deleteError && (
              <p style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', textAlign: 'center' }}>
                {deleteError}
              </p>
            )}
            {confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600', margin: '0 0 4px', textAlign: 'center' }}>
                  Anda pasti ingin memadam staf ini?
                </p>
                <button
                  className="btn btn--secondary"
                  style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Memadam...' : 'Ya, Padam Staf'}
                </button>
                <button
                  className="btn btn--secondary"
                  style={{ width: '100%' }}
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                className="btn btn--secondary"
                style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
                onClick={() => setConfirmDelete(true)}
              >
                Padam Staf
              </button>
            )}
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
                  <div style={styles.label}>Nama Pengguna (Login)</div>
                  <div style={{ ...styles.value, fontFamily: 'monospace' }}>{staff.username || '-'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Kad 2: Status Tugasan Semasa */}
          <section className="section-card" aria-label="Tugasan Semasa">
            <header className="section-card-header">
              <div className="section-card-title">Status Tugasan Semasa</div>
              {!tasksLoading && (
                <span className="badge badge--gray" style={{ fontSize: '11px' }}>
                  {tasks.length} tugasan
                </span>
              )}
            </header>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Order</th>
                    <th>Tugasan</th>
                    <th>Tarikh Hantar</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksLoading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                        Memuatkan tugasan...
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                        Tiada tugasan diagihkan kepada staf ini.
                      </td>
                    </tr>
                  ) : (
                    tasks.map(task => (
                      <tr key={task.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="td-id">{task.order_number || `#${task.order_id}`}</span>
                            <span style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              {task.client_name || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge--info">{task.task_type}</span>
                        </td>
                        <td className="td-mono">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <span className={
                            task.status === 'Completed'   ? 'badge badge--success' :
                            task.status === 'In Progress' ? 'badge badge--warning' :
                            'badge badge--gray'
                          }>
                            {task.status === 'Completed'   ? 'Selesai'      :
                             task.status === 'In Progress' ? 'Dalam Proses' : 'Menunggu'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
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
