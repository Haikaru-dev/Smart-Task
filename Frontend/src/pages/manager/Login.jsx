// src/pages/Login.jsx
// ================================================================
// Halaman Log Masuk Berpusat — Role-Based Access Control
// Role 'Manager' → /dashboard | Role 'Staff' → /staf/tugasan
// ================================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';

// ── Ikon SVG ─────────────────────────────────────────────────────
const UserIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="#2563EB" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="M6 18v-.5a3 3 0 0 1 6 0V18" />
    <line x1="16" y1="10" x2="20" y2="10" />
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

// ── Komponen Utama ────────────────────────────────────────────────
function Login() {
  const navigate = useNavigate();

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [focusUser, setFocusUser] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password,
      });

      const { role, userId, name, user, token } = response.data;

      // Simpan JWT token untuk autentikasi API
      if (token) localStorage.setItem('authToken', token);

      // Simpan sesi pengguna dalam localStorage
      const sessionData = {
        id:       userId   || user?.id,
        username: name     || user?.username || username,
        role:     role     || user?.role,
      };
      localStorage.setItem('user', JSON.stringify(sessionData));

      // ── Penghalaan berdasarkan peranan (Role-Based Routing) ──
      // Nota: Nilai role dari DB ialah 'Manager' atau 'Staff' (huruf besar pertama)
      const userRole = (role || user?.role || '').toLowerCase();

      if (userRole === 'manager' || userRole === 'admin') {
        navigate('/dashboard');
      } else if (userRole === 'staff') {
        // Simpan juga sebagai sesi staf
        localStorage.setItem('staffUser', JSON.stringify({
          id:   sessionData.id,
          name: sessionData.username,
          role: sessionData.role,
        }));
        navigate('/staf/tugasan');
      } else {
        // Peranan tidak diketahui — hantarkan ke dashboard sebagai lalai
        navigate('/dashboard');
      }

    } catch (err) {
      // Tangkap mesej ralat dari backend
      const msg = err.response?.data?.error
        || err.response?.data?.message
        || 'Ralat sambungan. Pastikan pelayan backend sedang berjalan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Log Masuk Admin - SmartTask",
    "description": "Halaman log masuk berpusat untuk pengurus dan pentadbir sistem SmartTask. Platform pengurusan operasi.",
    "audience": {
      "@type": "Audience",
      "audienceType": "Administrators and Managers"
    },
    "about": {
      "@type": "SoftwareApplication",
      "name": "SmartTask System"
    },
    "significantLink": "http://localhost:5173/staf/login"
  };

  return (
    <main style={S.bg}>
      <JsonLd data={jsonLdData} />
      {/* Bulatan dekoratif latar */}
      <div style={S.circle1} aria-hidden="true" />
      <div style={S.circle2} aria-hidden="true" />
      <div style={S.circle3} aria-hidden="true" />

      {/* ── Kad Log Masuk ── */}
      <article style={S.card}>

        {/* Header Kad */}
        <header style={S.cardHeader}>
          <figure style={S.avatarWrap}>
            <UserIcon />
          </figure>
          <h1 style={S.title}>Log Masuk SmartTask</h1>
          <p style={S.subtitle}>
            Masukkan ID pengguna dan kata laluan anda
          </p>
        </header>

        {/* ── Mesej Ralat ── */}
        {error && (
          <div style={S.errorBox} role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Borang ── */}
        <form onSubmit={handleLogin} style={S.form}>

          {/* Input: ID Pengguna */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-username" style={S.label}>ID Pengguna</label>
            <div style={{ position: 'relative' }}>
              <span style={S.inputIconLeft}><IdIcon /></span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusUser(true)}
                onBlur={() => setFocusUser(false)}
                style={{ ...S.input, ...(focusUser ? S.inputFocus : {}) }}
                placeholder="Contoh: admin01"
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* Input: Kata Laluan */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-password" style={S.label}>Kata Laluan</label>
            <div style={{ position: 'relative' }}>
              <span style={S.inputIconLeft}><LockIcon /></span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                style={{ ...S.input, ...(focusPass ? S.inputFocus : {}), paddingRight: 44 }}
                placeholder="Masukkan kata laluan"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={S.eyeBtn}
                tabIndex={-1}
                aria-label={showPass ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {/* Butang Log Masuk */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            style={{ ...S.submitBtn, ...(loading ? S.submitBtnLoading : {}) }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={spinnerStyle} />
                Mengesahkan identiti...
              </span>
            ) : 'Log Masuk'}
          </button>
        </form>

        {/* ── Footer ── */}
        <footer style={S.cardFooter}>
          <div style={S.roleHintRow}>
            <span style={S.roleHint}>
              <span style={{ ...S.roleDot, background: '#2563EB' }} />
              Manager → Papan Pemuka
            </span>
            <span style={S.roleHint}>
              <span style={{ ...S.roleDot, background: '#059669' }} />
              Staf → Portal Staf
            </span>
          </div>
          <p style={S.footerNote}>
            Masalah log masuk? Hubungi <strong>Admin Sistem</strong>
          </p>
        </footer>
      </article>

      {/* Tag nama sistem */}
      <p style={S.brandTag}>SmartTask · SH Design &amp; Print Sdn. Bhd.</p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #btn-login-submit:not(:disabled):hover {
          background: linear-gradient(135deg, #1E3A8A, #1D4ED8) !important;
          box-shadow: 0 6px 20px rgba(37,99,235,0.45) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </main>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
const spinnerStyle = {
  display: 'inline-block', width: 15, height: 15,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff', borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

// ── Gaya ─────────────────────────────────────────────────────────
const S = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #1E3A8A 0%, #1D4ED8 50%, #3B82F6 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative', overflow: 'hidden',
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  circle1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)', top: -180, right: -140,
    pointerEvents: 'none',
  },
  circle2: {
    position: 'absolute', width: 350, height: 350, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)', bottom: -100, left: -100,
    pointerEvents: 'none',
  },
  circle3: {
    position: 'absolute', width: 200, height: 200, borderRadius: '50%',
    background: 'rgba(255,255,255,0.03)', top: '40%', left: '10%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
    backgroundColor: '#fff', borderRadius: 22,
    boxShadow: '0 30px 70px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    textAlign: 'center',
    padding: '36px 36px 28px',
    background: 'linear-gradient(180deg, #F8FAFF 0%, #fff 100%)',
    borderBottom: '1px solid #F1F5F9',
  },
  avatarWrap: {
    width: 68, height: 68, borderRadius: '50%',
    background: 'linear-gradient(145deg, #EFF6FF, #DBEAFE)',
    border: '2px solid #BFDBFE',
    margin: '0 auto 18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(37,99,235,0.12)',
  },
  title: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 22, fontWeight: 700, color: '#0F172A',
    margin: '0 0 8px', letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5,
  },
  errorBox: {
    margin: '0 36px 4px',
    padding: '11px 14px',
    background: '#FEF2F2', border: '1px solid #FECACA',
    borderRadius: 10, color: '#B91C1C',
    fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 8,
    animation: 'fadeSlideIn 0.2s ease',
  },
  form: {
    padding: '24px 36px 0',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  fieldGroup: {
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  label: {
    fontSize: 13, fontWeight: 600, color: '#374151',
  },
  inputIconLeft: {
    position: 'absolute', left: 13, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', padding: '12px 14px 12px 42px',
    fontSize: 14, border: '1.5px solid #E2E8F0',
    borderRadius: 10, background: '#F8FAFC', color: '#0F172A',
    outline: 'none', transition: 'all 0.2s',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  inputFocus: {
    border: '1.5px solid #2563EB',
    background: '#fff',
    boxShadow: '0 0 0 3px rgba(37,99,235,0.1)',
  },
  eyeBtn: {
    position: 'absolute', right: 13, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center',
  },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
    transition: 'all 0.2s', fontFamily: 'inherit',
    marginTop: 4,
  },
  submitBtnLoading: {
    background: '#94A3B8',
    cursor: 'not-allowed', boxShadow: 'none',
  },
  cardFooter: {
    padding: '20px 36px 28px',
    borderTop: '1px solid #F1F5F9',
    marginTop: 24,
    background: '#FAFBFD',
  },
  roleHintRow: {
    display: 'flex', justifyContent: 'center',
    gap: 20, marginBottom: 14,
  },
  roleHint: {
    fontSize: 11.5, color: '#64748B', fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  roleDot: {
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
  },
  footerNote: {
    textAlign: 'center', fontSize: 12, color: '#94A3B8', margin: 0,
  },
  brandTag: {
    marginTop: 28, fontSize: 12, letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.4)', position: 'relative', zIndex: 1,
  },
};

export default Login;
