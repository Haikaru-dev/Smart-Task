// src/components/Layout.jsx
// ================================================================
// PANTANG LARANG: Fail ini HANYA mengandungi struktur UI sahaja.
// Tiada logik axios, state, atau panggilan API di sini.
// ================================================================
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../smarttask.css'; // <-- pastikan path betul mengikut struktur projek anda

// ── Icon helpers (inline SVG supaya tiada dependency tambahan) ──
const Icon = ({ d, size = 16, stroke = true, fill = false }) => (
    <svg
        width={size} height={size}
        viewBox="0 0 24 24"
        fill={fill ? 'currentColor' : 'none'}
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
    >
        {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
    </svg>
);

// Ikon setiap menu (SVG path data)
const ICONS = {
    dashboard: [
        'M3 3h7v7H3z',
        'M14 3h7v7h-7z',
        'M3 14h7v7H3z',
        'M14 14h7v7h-7z',
    ],
    orders: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    schedule: 'M8 2v4 M16 2v4 M3 10h18 M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    staff: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    leave: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    chevron: 'M6 9l6 6 6-9',
};

// ── Helper: dapatkan label breadcrumb daripada pathname ──
function getBreadcrumb(pathname) {
    const map = {
        '/dashboard': { parent: 'Dashboard', current: 'Papan Pemuka' },
        '/tempahan': { parent: 'Tempahan', current: 'Senarai Tempahan' },
        '/tempahan/baru': { parent: 'Tempahan', current: 'Tempahan Baru' },
        '/jadual': { parent: 'Pengurusan', current: 'Janaan Jadual' },
        '/staf': { parent: 'Pengurusan', current: 'Senarai Staf' },
        '/cuti': { parent: 'Pengurusan', current: 'Pengurusan Cuti' },
        '/profil': { parent: 'Akaun', current: 'Profil Admin' },
    };
    // Match exact atau prefix (e.g. /staf/ST-001)
    const exact = map[pathname];
    if (exact) return exact;
    const prefix = Object.keys(map).find(k => pathname.startsWith(k + '/'));
    return prefix ? map[prefix] : { parent: 'SmartTask', current: 'Halaman' };
}

// ── Sidebar Navigation Items ──
const NAV_ITEMS = [
    {
        section: 'Utama',
        items: [
            { label: 'Dashboard', to: '/dashboard', icon: ICONS.dashboard },
            { label: 'Tempahan', to: '/tempahan', icon: ICONS.orders },
        ],
    },
    {
        section: 'Pengurusan',
        items: [
            { label: 'Janaan Jadual', to: '/jadual', icon: ICONS.schedule },
            { label: 'Senarai Staf', to: '/staf', icon: ICONS.staff },
            { label: 'Cuti', to: '/cuti', icon: ICONS.leave, badge: 1 },
        ],
    },
];

// ================================================================
// KOMPONEN: Sidebar
// ================================================================
function Sidebar({ onLogout }) {
    return (
        <aside className="sidebar">
            {/* ── Brand ── */}
            <div className="sidebar-brand">
                <div className="sidebar-logo-box">
                    {/* Checkmark icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <div className="sidebar-brand-text">
                    <span className="sidebar-brand-name">SmartTask</span>
                    <span className="sidebar-brand-sub">Admin Portal</span>
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((group) => (
                    <div key={group.section}>
                        <div className="sidebar-section-label">{group.section}</div>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                // NavLink akan auto tambah class 'active' apabila URL sepadan
                                className={({ isActive }) =>
                                    `nav-link${isActive ? ' active' : ''}`
                                }
                                // Elak /tempahan match /tempahan/baru sebagai active serentak
                                end={item.to === '/tempahan'}
                            >
                                {/* Render SVG icon */}
                                <svg width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth={1.8}
                                    strokeLinecap="round" strokeLinejoin="round"
                                    style={{ flexShrink: 0 }}>
                                    {(Array.isArray(item.icon) ? item.icon : [item.icon])
                                        .map((d, i) => <path key={i} d={d} />)}
                                </svg>
                                <span>{item.label}</span>
                                {item.badge ? (
                                    <span className="nav-badge">{item.badge}</span>
                                ) : null}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* ── User Footer ── */}
            <div className="sidebar-user-footer">
                <div className="sidebar-user-trigger">
                    <div className="sidebar-user-avatar">AD</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">Admin</div>
                        <div className="sidebar-user-role">Super Administrator</div>
                    </div>
                    <svg className="sidebar-user-chevron" width="12" height="12"
                        viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)"
                        strokeWidth={2} strokeLinecap="round">
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </div>
                <div className="sidebar-user-dropdown">
                    <Link to="/profil" className="sidebar-user-dropdown-item">
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
// KOMPONEN: Topbar
// ================================================================
function Topbar() {
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

            {/* Actions */}
            <div className="topbar-actions">
                {/* Bell icon */}
                <button className="topbar-icon-btn" title="Notifikasi">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#64748B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

// ================================================================
// KOMPONEN UTAMA: Layout
// Bungkus semua halaman dengan Sidebar + Topbar.
// <Outlet /> akan render halaman yang sepadan (Dashboard, Tempahan, dll.)
// ================================================================
export default function Layout() {
    const navigate = useNavigate();

    // ── Fungsi logout — ubah mengikut logik logout asal anda ──
    function handleLogout() {
        localStorage.removeItem('user');
        localStorage.removeItem('staffUser');
        localStorage.removeItem('token');
        navigate('/login');
    }

    return (
        <div className="app-shell">
            <Sidebar onLogout={handleLogout} />
            <main className="main-area">
                <Topbar />
                {/* Outlet = kandungan halaman aktif (Dashboard, Tempahan, dll.) */}
                <Outlet />
            </main>
        </div>
    );
}