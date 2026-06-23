// src/pages/staff/ProfilStaf.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ── Ikon SVG ──────────────────────────────────────────────────────
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const EyeIcon = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'ST';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ms-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function getStatusBadge(status = '') {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'lulus')
    return { bg: '#DCFCE7', color: '#15803D', label: 'Lulus' };
  if (s === 'rejected' || s === 'ditolak')
    return { bg: '#FEE2E2', color: '#B91C1C', label: 'Ditolak' };
  return { bg: '#FEF3C7', color: '#B45309', label: 'Pending' };
}

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function ProfilStaf() {
  // ── Baca profil staf dari localStorage ──
  const rawStaff = localStorage.getItem('staffUser');
  const rawUser = localStorage.getItem('user');
  
  const staffUser = rawStaff ? JSON.parse(rawStaff) : {};
  const sysUser = rawUser ? JSON.parse(rawUser) : {};
  
  const staffId = staffUser?.id || sysUser?.id;
  const userId = sysUser?.id || staffUser?.id; // ID users table for password change
  
  const [profile, setProfile] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ── Form State ──
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Ambil data profil & sejarah cuti ──
  const fetchData = useCallback(async () => {
    if (!staffId) { setLoading(false); return; }
    try {
      setLoading(true);
      
      // Ambil data staf
      const resStaff = await axios.get(`${API_BASE_URL}/api/staff/${staffId}`);
      const data = resStaff.data;
      setProfile(data);
      setEmail(data.email || '');
      setPhone(data.phone_number || '');
      
      // Ambil 3 sejarah cuti terkini untuk kad ringkasan
      const resLeaves = await axios.get(`${API_BASE_URL}/api/staff/leaves/${staffId}`);
      if (Array.isArray(resLeaves.data)) {
        setLeaves(resLeaves.data.slice(0, 3));
      }
      
    } catch (err) {
      console.error('Ralat fetchData:', err);
      setToast({ type: 'error', text: 'Gagal memuatkan data profil.' });
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Hantar kemaskini ──
  const handleSave = async (e) => {
    e.preventDefault();
    setToast(null);
    setSaving(true);
    
    // Validasi kata laluan (jika diisi)
    if (newPassword) {
      if (newPassword.length < 6) {
        setToast({ type: 'error', text: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.' });
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setToast({ type: 'error', text: 'Kata laluan dan pengesahan tidak sepadan.' });
        setSaving(false);
        return;
      }
    }

    try {
      // 1. Kemaskini Profil (Email & Phone)
      await axios.put(`${API_BASE_URL}/api/staff/update-profile/${staffId}`, {
        email, phone
      });
      
      // 2. Kemaskini Kata Laluan (jika diisi)
      if (newPassword) {
        await axios.put(`${API_BASE_URL}/api/staff/change-password/${userId}`, {
          currentPassword,
          newPassword
        });
        
        // Reset field password selepas berjaya
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      
      setToast({ type: 'success', text: '✓ Profil berjaya dikemaskini!' });
      
      // Update local profile state
      setProfile(prev => ({ ...prev, email, phone_number: phone }));
      
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan perubahan. Sila cuba lagi.';
      setToast({ type: 'error', text: msg });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const displayName = profile?.name || staffUser?.name || 'Staf';
  const displayRole = profile?.role || staffUser?.role || 'Pekerja';

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <div style={{ color: '#94A3B8' }}>Memuatkan profil...</div>
      </div>
    );
  }

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <header className="page-header">
        <h1 className="page-title">Profil Saya</h1>
        <p className="page-subtitle">Urus maklumat peribadi dan tetapan akaun anda</p>
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

      {/* ── Grid Dua Kolum ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '35% 1fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ══════════════════════════════════════
            KOLUM KIRI: Kad Ringkasan
            ══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Kad Profil Utama */}
          <div className="section-card" style={{ marginBottom: 0, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: '#fff',
              boxShadow: '0 8px 24px rgba(37,99,235,0.25)', border: '4px solid #EFF6FF'
            }}>
              {getInitials(displayName)}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              {displayName}
            </h2>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              ID Staf: {staffId}
            </div>
            <span style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#2563EB',
            }}>
              {displayRole}
            </span>
          </div>

          {/* Kad Sejarah Permohonan Ringkas */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <div className="section-card-title">
                <div className="title-accent-dot" style={{ background: '#8B5CF6' }} />
                Cuti Terkini
              </div>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              {leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: 12.5 }}>
                  Tiada rekod cuti
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                  {leaves.map((leave, i) => {
                    const badge = getStatusBadge(leave.status);
                    return (
                      <div key={leave.id || i} style={{
                        padding: '12px', border: '1px solid #F1F5F9', borderRadius: 8,
                        background: '#FAFBFD', display: 'flex', flexDirection: 'column', gap: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                            {formatDate(leave.start_date)}
                          </span>
                          <span style={{
                            fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: badge.bg, color: badge.color
                          }}>
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {leave.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            KOLUM KANAN: Tetapan & Borang
            ══════════════════════════════════════ */}
        <section className="section-card" style={{ marginBottom: 0 }}>
          <header className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#10B981' }} />
              Tetapan Profil
            </div>
          </header>

          <form onSubmit={handleSave} style={{ padding: '24px' }}>
            
            <h3 style={F.sectionTitle}>Maklumat Asas</h3>
            <div style={F.grid}>
              {/* Nama Penuh (Read Only) */}
              <div style={F.group}>
                <label style={F.label}>Nama Penuh</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><UserIcon /></span>
                  <input
                    type="text"
                    value={displayName}
                    readOnly
                    style={{ ...F.input, background: '#F1F5F9', color: '#64748B', borderColor: 'transparent' }}
                  />
                </div>
              </div>

              {/* ID Staf (Read Only) */}
              <div style={F.group}>
                <label style={F.label}>ID Staf</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><UserIcon /></span>
                  <input
                    type="text"
                    value={staffId || ''}
                    readOnly
                    style={{ ...F.input, background: '#F1F5F9', color: '#64748B', borderColor: 'transparent' }}
                  />
                </div>
              </div>
            </div>

            <div style={F.grid}>
              {/* Email (Boleh Edit) */}
              <div style={F.group}>
                <label style={F.label}>Alamat Emel</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><MailIcon /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan emel anda"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Telefon (Boleh Edit) */}
              <div style={F.group}>
                <label style={F.label}>No. Telefon</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><PhoneIcon /></span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 012-3456789"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: '#F1F5F9', margin: '28px 0' }} />

            <h3 style={F.sectionTitle}>Tukar Kata Laluan</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              Biarkan kosong jika anda tidak mahu menukar kata laluan.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              {/* Kata Laluan Semasa */}
              <div style={F.group}>
                <label style={F.label}>Kata Laluan Semasa</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><LockIcon /></span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Kunci keselamatan"
                    style={F.input}
                    disabled={saving}
                  />
                  <button type="button" style={F.eyeBtn} onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              {/* Kata Laluan Baru */}
              <div style={F.group}>
                <label style={F.label}>Kata Laluan Baru</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><LockIcon /></span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minima 6 aksara"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Sahkan Kata Laluan Baru */}
              <div style={F.group}>
                <label style={F.label}>Sahkan Kata Laluan Baru</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><LockIcon /></span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulang kata laluan baru"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button 
                type="submit" 
                disabled={saving}
                style={{
                  ...F.submitBtn,
                  ...(saving ? F.submitBtnDisabled : {})
                }}
              >
                {saving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={spinnerStyle} /> Menyimpan...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckIcon /> Simpan Perubahan
                  </span>
                )}
              </button>
            </div>
            
          </form>
        </section>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        button[type="submit"]:not(:disabled):hover {
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
  display: 'inline-block', width: 14, height: 14,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff', borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

// ── Form Styles ───────────────────────────────────────────────────
const F = {
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px',
    textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16
  },
  group: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#374151' },
  iconLeft: {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', padding: '11px 14px 11px 42px',
    fontSize: 13.5, border: '1.5px solid #E2E8F0',
    borderRadius: 10, background: '#F8FAFC', color: '#0F172A',
    outline: 'none', transition: 'all 0.18s',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%',
    transform: 'translateY(-50%)', background: 'none', border: 'none',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg,#1E40AF,#2563EB)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
    transition: 'all 0.2s', fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    background: '#94A3B8', cursor: 'not-allowed', boxShadow: 'none',
  },
};
