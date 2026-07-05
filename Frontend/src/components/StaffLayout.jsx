// src/components/StaffLayout.jsx
import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../smarttask.css';

// ── Ikon SVG ─────────────────────────────────────────────────────
const ClipboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ChevronIcon = ({ collapsed }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {collapsed
      ? <polyline points="9 18 15 12 9 6" />
      : <polyline points="15 18 9 12 15 6" />}
  </svg>
);

// ── Nav items ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Tugasan Saya',      to: '/staf/tugasan',    Icon: ClipboardIcon },
  { label: 'Permohonan Cuti',   to: '/staf/cuti',       Icon: CalendarIcon  },
];

// ── Breadcrumb map ────────────────────────────────────────────────
function getBreadcrumb(pathname) {
  const map = {
    '/staf/tugasan': { parent: 'Portal Staf', current: 'Tugasan Saya'    },
    '/staf/cuti':    { parent: 'Portal Staf', current: 'Permohonan Cuti' },
    '/staf/profil':  { parent: 'Portal Staf', current: 'Profil Saya'     },
  };
  return map[pathname] || { parent: 'Portal Staf', current: 'Halaman' };
}

// ── Helper: initials ──────────────────────────────────────────────
function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'ST';
}

// ================================================================
// KOMPONEN: Staff Sidebar
// ================================================================
function StaffSidebar({ staffName, staffRole, onLogout, collapsed, onToggle }) {
  const W = collapsed ? 64 : 235;
  return (
    <aside style={{ ...sidebarStyles.aside, width: W, minWidth: W }}
      className={collapsed ? 'sidebar--collapsed' : undefined}>

      {/* ── Brand ── */}
      <div style={{ ...sidebarStyles.brand, ...(collapsed ? { justifyContent: 'center', padding: '18px 0 16px' } : {}) }}>
        <div style={sidebarStyles.logoBox}>
          {/* Grid icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={sidebarStyles.brandName}>MY STAFF PORTAL</div>
            <div style={sidebarStyles.brandSub}>SmartTask · SH Design</div>
          </div>
        )}
      </div>

      {/* ── Butang lipat/kembang sidebar ── */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggle}
        title={collapsed ? 'Kembangkan menu' : 'Kecilkan menu'}
      >
        <ChevronIcon collapsed={collapsed} />
      </button>

      {/* ── Divider ── */}
      <div style={sidebarStyles.divider} />

      {/* ── Nav ── */}
      <nav style={sidebarStyles.nav}>
        {!collapsed && <div style={sidebarStyles.sectionLabel}>MENU UTAMA</div>}
        {NAV_ITEMS.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ marginBottom: 2 }}
            title={collapsed ? label : undefined}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Staff Info Footer ── */}
      <div style={{ ...sidebarStyles.footer, position: 'relative' }} className="sidebar-user-footer">
        <div className="sidebar-user-trigger" style={{ flex: 1, minWidth: 0 }}>
          <div style={sidebarStyles.footerAvatar}>
            {getInitials(staffName)}
          </div>
          <div style={sidebarStyles.footerInfo}>
            <div style={sidebarStyles.footerName}>{staffName || 'Staf'}</div>
            <div style={sidebarStyles.footerRole}>{staffRole || 'Pekerja'}</div>
          </div>
          <svg className="sidebar-user-chevron" width="12" height="12"
            viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)"
            strokeWidth={2} strokeLinecap="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
        <div className="sidebar-user-dropdown">
          <Link to="/staf/profil" className="sidebar-user-dropdown-item">
            Kemaskini Profil
          </Link>
          <button className="sidebar-user-dropdown-item sidebar-user-dropdown-item--danger"
            onClick={onLogout}>
            Log Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}

// ================================================================
// KOMPONEN: Staff Topbar
// ================================================================
function StaffTopbar() {
  const location = useLocation();
  const { parent, current } = getBreadcrumb(location.pathname);

  return (
    <header className="topbar">
      {/* Breadcrumb */}
      <div className="topbar-breadcrumb">
        <span className="bc-item">{parent}</span>
        <span className="bc-separator">/</span>
        <span className="bc-item active">{current}</span>
      </div>

    </header>
  );
}

// ================================================================
// KOMPONEN UTAMA: StaffLayout
// ================================================================
export default function StaffLayout() {
  const navigate = useNavigate();

  // Baca maklumat staf dari localStorage (disimpan semasa login)
  const raw = localStorage.getItem('staffUser');
  const staffUser = raw ? JSON.parse(raw) : {};
  const staffName = staffUser.name || 'Staf Portal';
  const staffRole = staffUser.role || 'Pekerja';

  // ── Lipat/kembang sidebar — pilihan dikongsi dengan portal Admin ──
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === '1'
  );
  function toggleSidebar() {
    setCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', prev ? '0' : '1');
      return !prev;
    });
  }

  function handleLogout() {
    localStorage.removeItem('staffUser');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <StaffSidebar
        staffName={staffName}
        staffRole={staffRole}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />

      {/* Kawasan Utama */}
      <main className="main-area" style={{ background: '#F4F6F9', marginLeft: collapsed ? 64 : 235 }}>
        <StaffTopbar />
        {/* Halaman aktif dirender di sini */}
        <Outlet />
      </main>
    </div>
  );
}

// ── Gaya Sidebar Inline ───────────────────────────────────────────
const sidebarStyles = {
  aside: {
    width: 235, minWidth: 235,
    background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
    display: 'flex', flexDirection: 'column',
    position: 'fixed', top: 0, left: 0,
    height: '100vh', zIndex: 200, overflow: 'hidden',
  },
  brand: {
    padding: '18px 20px 16px',
    display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0,
  },
  logoBox: {
    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
    background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
  },
  brandName: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 11, fontWeight: 700, color: '#fff',
    letterSpacing: '1.2px',
  },
  brandSub: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    marginTop: 2, letterSpacing: '0.5px',
  },
  divider: {
    height: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0,
  },
  nav: {
    padding: '14px 0', flex: 1, overflowY: 'auto',
  },
  sectionLabel: {
    padding: '10px 20px 5px',
    fontSize: 10, fontWeight: 600,
    color: 'rgba(255,255,255,0.22)',
    textTransform: 'uppercase', letterSpacing: '1.2px',
  },
  footer: {
    padding: '14px 18px', flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  footerAvatar: {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff',
  },
  footerInfo: { flex: 1, minWidth: 0 },
  footerName: {
    fontSize: 13, fontWeight: 500, color: '#F8FAFC',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  footerRole: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1,
  },
  logoutBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: '6px', borderRadius: 7, color: 'rgba(239,68,68,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.15s',
  },
};
