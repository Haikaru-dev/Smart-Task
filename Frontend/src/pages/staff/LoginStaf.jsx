import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import '../../smarttask.css';
import { API_BASE_URL } from '../../config';

// ── Ikon ─────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="#2563EB" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IdCardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M8 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
    <path d="M6 18v-1a4 4 0 0 1 4-4h4" />
    <line x1="16" y1="11" x2="20" y2="11" />
    <line x1="16" y1="14" x2="18" y2="14" />
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = ({ show }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {show ? (
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

export default function LoginStaf() {
  const navigate = useNavigate();

  const [staffId, setStaffId]       = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [focusId, setFocusId]       = useState(false);
  const [focusPass, setFocusPass]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!staffId || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        username: staffId,
        password: password
      });

      const data = res.data;

      if (data.success) {
        // Pastikan hanya peranan Staff yang boleh masuk portal ini
        if (data.role !== 'Staff') {
          setError('Akses ditolak. Sila log masuk ke Portal Pengurus.');
          setLoading(false);
          return;
        }

        // Simpan JWT token untuk autentikasi API
        if (data.token) localStorage.setItem('authToken', data.token);

        // Simpan sesi staf menggunakan ID sebenar dari jadual staf dan jadual users
        localStorage.setItem('staffUser', JSON.stringify({
          id: data.staffId, // ID Staf untuk fetch tugasan, cuti & profil
          userId: data.userId, // ID Users untuk tukar kata laluan
          name: data.name,
          role: data.role
        }));
        
        // Simpan dalam 'user' untuk compatibility
        localStorage.setItem('user', JSON.stringify({
          id: data.userId,
          username: data.name,
          role: data.role
        }));

        navigate('/staf/tugasan');
      } else {
        setError(data.error || 'Log masuk gagal.');
      }
    } catch (err) {
      console.error('Ralat log masuk:', err);
      setError(err.response?.data?.error || 'Ralat pelayan. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── JSON-LD Data ──
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Log Masuk Staf - SmartTask",
    "description": "Portal khas untuk staf/pekerja log masuk dan melihat tugasan harian mereka.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Staff and Employees"
    },
    "about": {
      "@type": "SoftwareApplication",
      "name": "SmartTask System"
    }
  };

  return (
    <div style={S.bg}>
      <JsonLd data={jsonLdData} />
      {/* Bulatan dekoratif latar */}
      <div style={S.circle1} aria-hidden="true" />
      <div style={S.circle2} aria-hidden="true" />

      {/* Kad Login */}
      <article style={S.card}>
        {/* ── Header Kad ── */}
        <header style={S.cardHeader}>
          <figure style={S.iconWrap}>
            <UserIcon />
          </figure>
          <h1 style={S.title}>Portal Staf</h1>
          <p style={S.subtitle}>Sila log masuk dengan ID pekerja anda</p>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div style={S.errorBanner}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Borang ── */}
        <form onSubmit={handleLogin} style={S.form}>

          {/* ID Pekerja */}
          <div style={S.inputGroup}>
            <label style={S.label}>ID Pekerja</label>
            <div style={{ position: 'relative' }}>
              <span style={S.inputIcon}><IdCardIcon /></span>
              <input
                id="staff-id-input"
                type="text"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                onFocus={() => setFocusId(true)}
                onBlur={() => setFocusId(false)}
                style={{ ...S.input, ...(focusId ? S.inputFocus : {}) }}
                placeholder="Contoh: STF-001"
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Kata Laluan */}
          <div style={S.inputGroup}>
            <label style={S.label}>Kata Laluan</label>
            <div style={{ position: 'relative' }}>
              <span style={S.inputIcon}><LockIcon /></span>
              <input
                id="staff-password-input"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                style={{ ...S.input, ...(focusPass ? S.inputFocus : {}), paddingRight: 44 }}
                placeholder="Masukkan kata laluan"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={S.eyeBtn}
                tabIndex={-1}
              >
                <EyeIcon show={showPass} />
              </button>
            </div>
          </div>

          {/* Butang Log Masuk */}
          <button
            id="btn-login-staf"
            type="submit"
            disabled={loading}
            style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={spinnerStyle} /> Mengesahkan...
              </span>
            ) : 'Log Masuk'}
          </button>
        </form>

        {/* ── Footer Kad ── */}
        <footer style={S.footerNote}>
          Masalah log masuk? Hubungi <strong>Admin Sistem</strong>
        </footer>
      </article>

      {/* Nama sistem di bawah */}
      <p style={S.brandTag}>SmartTask · SH Design &amp; Print</p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Spinner inline ──
const spinnerStyle = {
  display: 'inline-block', width: 14, height: 14,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff', borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

// ── Gaya ─────────────────────────────────────────────────────────
const S = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px', position: 'relative', overflow: 'hidden',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
  },
  // Dekoratif
  circle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)', top: -120, right: -100,
    pointerEvents: 'none',
  },
  circle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)', bottom: -80, left: -80,
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
    backgroundColor: '#fff', borderRadius: 20,
    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
    padding: '40px 36px 32px',
  },
  cardHeader: {
    textAlign: 'center', marginBottom: 32,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
    background: '#EFF6FF', border: '2px solid #BFDBFE',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 26, fontWeight: 700, color: '#0F172A',
    margin: '0 0 6px', letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5,
  },
  errorBanner: {
    background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C',
    borderRadius: 8, padding: '10px 14px', fontSize: 13,
    marginBottom: 20, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  inputGroup: {
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  label: {
    fontSize: 13, fontWeight: 600, color: '#374151',
  },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '12px 14px 12px 40px',
    fontSize: 14, border: '1.5px solid #E2E8F0', borderRadius: 10,
    background: '#F8FAFC', color: '#0F172A', outline: 'none',
    transition: 'all 0.2s', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputFocus: {
    border: '1.5px solid #2563EB',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(37,99,235,0.12)',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 4, display: 'flex', alignItems: 'center',
  },
  submitBtn: {
    marginTop: 4, width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
    transition: 'all 0.2s', fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    background: '#94A3B8', cursor: 'not-allowed',
    boxShadow: 'none',
  },
  footerNote: {
    textAlign: 'center', marginTop: 24,
    fontSize: 12, color: '#94A3B8',
  },
  brandTag: {
    marginTop: 28, fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.5px', position: 'relative', zIndex: 1,
  },
};
