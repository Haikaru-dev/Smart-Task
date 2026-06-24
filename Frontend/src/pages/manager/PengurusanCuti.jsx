import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

// --- Ikon ---
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function PengurusanCuti() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ambil senarai cuti dari backend
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/manager/leaves`);
      setLeaves(res.data);
    } catch (err) {
      console.error('Ralat mengambil senarai cuti:', err);
      alert('Gagal memuat turun senarai cuti. Sila semak pelayan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Kemas kini status (Lulus / Ditolak)
  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Adakah anda pasti untuk menukar status cuti ini kepada '${status}'?`)) return;
    
    try {
      // Menggunakan status Lulus atau Ditolak seperti yang diminta
      // Nota: Dalam sesetengah backend, 'Lulus' mungkin 'Approved'. Kita tetapkan sebagai 'Approved' jika Lulus untuk keserasian
      const dbStatus = status === 'Lulus' ? 'Approved' : 'Ditolak';
      
      await axios.put(`${API_BASE_URL}/api/manager/leaves/${id}`, { status: dbStatus });
      alert(`Kejayaan: Permohonan cuti telah dikemas kini kepada ${status}!`);
      fetchLeaves(); // Muat semula jadual
    } catch (err) {
      console.error('Ralat kemas kini cuti:', err);
      alert('Gagal memproses permohonan cuti.');
    }
  };

  // Helper format tarikh
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  };

  // Helper lencana (badge) warna
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'lulus' || s === 'approved') {
      return { bg: '#DCFCE7', color: '#166534', label: 'Lulus' };
    }
    if (s === 'ditolak' || s === 'rejected') {
      return { bg: '#FEE2E2', color: '#991B1B', label: 'Ditolak' };
    }
    return { bg: '#FEF3C7', color: '#92400E', label: 'Pending' };
  };

  return (
    <div className="page-content" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Pengurusan Cuti Staf</h1>
        <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '14px' }}>Urus permohonan cuti dan selaraskan ketersediaan staf</p>
      </header>

      {/* Kad Putih Berserta Bayang Halus */}
      <div style={{ 
        background: '#FFFFFF', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', 
        padding: '24px', 
        overflowX: 'auto' 
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Memuatkan senarai cuti...</div>
        ) : leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Tiada permohonan cuti direkodkan buat masa ini.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600, borderRadius: '8px 0 0 8px' }}>Nama Staf</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>Tarikh Mula</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>Tarikh Tamat</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>Sebab Cuti</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 600, borderRadius: '0 8px 8px 0' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => {
                const badge = getStatusBadge(leave.status);
                const isPending = (leave.status || '').toLowerCase() === 'pending';
                
                return (
                  <tr key={leave.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px', fontWeight: 500, color: '#1E293B' }}>{leave.staff_name || `ID Staf: ${leave.staff_id}`}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{formatDate(leave.start_date)}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{formatDate(leave.end_date)}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{leave.reason || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        backgroundColor: badge.bg, 
                        color: badge.color, 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: 600 
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleUpdateStatus(leave.id, 'Lulus')}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              background: '#16A34A', color: 'white', border: 'none', 
                              padding: '6px 12px', borderRadius: '6px', fontSize: '13px', 
                              cursor: 'pointer', fontWeight: 500, transition: '0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                            <CheckIcon /> Lulus
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(leave.id, 'Ditolak')}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              background: '#DC2626', color: 'white', border: 'none', 
                              padding: '6px 12px', borderRadius: '6px', fontSize: '13px', 
                              cursor: 'pointer', fontWeight: 500, transition: '0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                            <XIcon /> Tolak
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500, fontStyle: 'italic' }}>
                          Telah Diproses
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
