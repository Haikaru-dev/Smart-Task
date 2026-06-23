// src/pages/ProfilAdmin.jsx
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
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'AD';
}

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function ProfilAdmin() {
  // ── Baca profil pengguna dari localStorage ──
  const rawUser = localStorage.getItem('user');
  const sysUser = rawUser ? JSON.parse(rawUser) : {};
  const userId = sysUser?.id;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ── Form State ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Ambil data profil ──
  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      
      const res = await axios.get(`${API_BASE_URL}/api/admin/profile/${userId}`);
      const data = res.data;
      setProfile(data);
      setName(data.name || data.username || '');
      setEmail(data.email || '');
      
    } catch (err) {
      console.error('Ralat fetchData:', err);
      setToast({ type: 'error', text: 'Gagal memuatkan data profil Admin.' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      await axios.put(`${API_BASE_URL}/api/admin/update/${userId}`, {
        name,
        email,
        password: newPassword || undefined
      });
      
      // Update local storage user data info (sekiranya nama diubah)
      if (sysUser) {
        sysUser.username = name;
        localStorage.setItem('user', JSON.stringify(sysUser));
      }

      setToast({ type: 'success', text: '✓ Profil berjaya dikemaskini!' });
      
      // Update local profile state
      setProfile(prev => ({ ...prev, name, email }));
      
      if (newPassword) {
        setNewPassword('');
        setConfirmPassword('');
      }
      
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan perubahan. Sila cuba lagi.';
      setToast({ type: 'error', text: msg });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const displayName = profile?.name || profile?.username || sysUser?.username || 'Admin';
  const displayRole = profile?.role || sysUser?.role || 'Administrator';
  const displayUsername = profile?.username || sysUser?.username || '-';

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <div style={{ color: '#94A3B8' }}>Memuatkan profil admin...</div>
      </div>
    );
  }

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <header className="page-header">
        <h1 className="page-title">Profil Admin</h1>
        <p className="page-subtitle">Urus maklumat akaun dan keselamatan</p>
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
        gridTemplateColumns: '30% 1fr',
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
              background: 'linear-gradient(135deg, #4F46E5, #3B82F6)',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: '#fff',
              boxShadow: '0 8px 24px rgba(59,130,246,0.3)', border: '4px solid #EEF2FF'
            }}>
              {getInitials(displayName)}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              {displayName}
            </h2>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              ID Pengguna: {displayUsername}
            </div>
            <span style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, background: '#EEF2FF', color: '#4F46E5',
            }}>
              {displayRole}
            </span>
          </div>

          <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
            <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>Nota Keselamatan</strong>
            Sila pastikan kata laluan anda disimpan dengan selamat. Admin mempunyai akses penuh ke atas sistem SmartTask.
          </div>
        </div>

        {/* ══════════════════════════════════════
            KOLUM KANAN: Tetapan & Borang
            ══════════════════════════════════════ */}
        <section className="section-card" style={{ marginBottom: 0 }}>
          <header className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#3B82F6' }} />
              Tetapan Akaun Admin
            </div>
          </header>

          <form onSubmit={handleSave} style={{ padding: '24px' }}>
            
            <h3 style={F.sectionTitle}>Maklumat Peribadi</h3>
            <div style={F.grid}>
              {/* Nama Penuh (Boleh Edit) */}
              <div style={F.group}>
                <label style={F.label}>Nama Penuh / Paparan</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><UserIcon /></span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama penuh anda"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* ID Pengguna (Read Only) */}
              <div style={F.group}>
                <label style={F.label}>ID Pengguna (Username)</label>
                <div style={{ position: 'relative' }}>
                  <span style={F.iconLeft}><UserIcon /></span>
                  <input
                    type="text"
                    value={displayUsername}
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
                    placeholder="Masukkan emel (pilihan)"
                    style={F.input}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: '#F1F5F9', margin: '28px 0' }} />

            <h3 style={F.sectionTitle}>Tukar Kata Laluan</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              Biarkan kosong jika anda tidak mahu menukar kata laluan semasa.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
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
                  <button type="button" style={F.eyeBtn} onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    <EyeIcon open={showPass} />
                  </button>
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
          background: linear-gradient(135deg,#4F46E5,#2563EB) !important;
          box-shadow: 0 6px 20px rgba(59,130,246,0.4) !important;
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
    background: 'linear-gradient(135deg,#4F46E5,#3B82F6)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
    transition: 'all 0.2s', fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    background: '#94A3B8', cursor: 'not-allowed', boxShadow: 'none',
  },
};
