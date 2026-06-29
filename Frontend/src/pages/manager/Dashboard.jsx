// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';
import Pagination from '../../components/Pagination';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── Ikon SVG inline (tiada dependency) ──
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const TeamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LeaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <line x1="18" y1="11" x2="23" y2="16" />
    <line x1="23" y1="11" x2="18" y2="16" />
  </svg>
);
const ProgressIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ── Helper: dapatkan initials dari nama ──
function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

// ── Helper: tentukan badge class dari status ──
function getBadgeClass(status = '') {
  const s = status.toLowerCase();
  if (s === 'selesai' || s === 'siap' || s === 'completed') return 'badge--success';
  if (s === 'log' || s === 'info') return 'badge--info';
  if (s === 'amaran' || s === 'warning') return 'badge--warning';
  if (s === 'ralat' || s === 'error') return 'badge--danger';
  return 'badge--gray';
}

// ================================================================
// KOMPONEN UTAMA: Dashboard
// ================================================================
export default function Dashboard() {

  // ── State ──
  const [stats, setStats] = useState({
    pending: 0, completed: 0, activeStaff: 0, onLeave: 0,
    inProgress: 0, pendingLeaves: 0, completionRate: 0
  });
  const [auditLogs,     setAuditLogs]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [logsPage,      setLogsPage]      = useState(1);
  const [orderTrends,   setOrderTrends]   = useState([]);
  const [staffPerf,     setStaffPerf]     = useState([]);
  const [leaveStats,    setLeaveStats]    = useState({ byStatus: [], pendingThisMonth: 0 });
  const [chartsLoading, setChartsLoading] = useState(true);

  const navigate = useNavigate();

  // ── Data Fetching ──
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);

        const [statsRes, logsRes, trendsRes, perfRes, leaveRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/dashboard/stats`),
          axios.get(`${API_BASE_URL}/api/dashboard/audit-logs`),
          axios.get(`${API_BASE_URL}/api/dashboard/order-trends`),
          axios.get(`${API_BASE_URL}/api/dashboard/staff-performance`),
          axios.get(`${API_BASE_URL}/api/dashboard/leave-stats`),
        ]);

        setStats(statsRes.data);
        setAuditLogs(logsRes.data);
        setOrderTrends(trendsRes.data);
        setStaffPerf(perfRes.data);
        setLeaveStats(leaveRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Gagal memuatkan data dashboard. Pastikan backend berjalan dan cuba semula.');
      } finally {
        setLoading(false);
        setChartsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const LOGS_PAGE_SIZE = 5;
  const paginatedLogs = auditLogs.slice((logsPage - 1) * LOGS_PAGE_SIZE, logsPage * LOGS_PAGE_SIZE);

  // ── KPI Card data ──
  const kpiCards = [
    { label: 'Tempahan Pending',  value: stats.pending,       modifier: 'kpi-card--blue',    footer: '↑ Menunggu tindakan',                  Icon: ClockIcon    },
    { label: 'Tugasan Siap',      value: stats.completed,     modifier: 'kpi-card--green',   footer: '↑ Selesai minggu ini',                 Icon: CheckIcon    },
    { label: 'Staf Aktif',        value: stats.activeStaff,   modifier: 'kpi-card--neutral', footer: 'Bertugas hari ini',                    Icon: TeamIcon     },
    { label: 'Dalam Proses',      value: stats.inProgress,    modifier: 'kpi-card--amber',   footer: '← Sedang diproses',                   Icon: ProgressIcon },
    { label: 'Staf Cuti',         value: stats.onLeave,       modifier: 'kpi-card--neutral', footer: 'Perlu semakan',                        Icon: LeaveIcon    },
    { label: 'Permohonan Cuti',   value: stats.pendingLeaves, modifier: 'kpi-card--purple',  footer: `${stats.completionRate}% tugasan siap`, Icon: CalendarIcon,
      navigateTo: '/cuti' },
  ];

  const completionDonutData = [
    { name: 'Tugasan Siap', value: stats.completionRate },
    { name: 'Baki', value: Math.max(0, 100 - stats.completionRate) },
  ];
  const donutColor = stats.completionRate >= 90 ? '#16A34A'
                   : stats.completionRate >= 50 ? '#D97706'
                   : '#DC2626';

  // ── Loading state ──
  if (loading) {
    return (
      <div className="page-content">
        <div style={{ color: '#94A3B8', fontSize: 14, padding: '40px 0' }}>
          Memuatkan data…
        </div>
      </div>
    );
  }

  // ── JSON-LD Data ──
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Admin Dashboard - SmartTask",
    "description": "Papan pemuka utama untuk pengurus memantau kpi, tempahan, staf aktif dan cuti staf.",
    "audience": { "@type": "Audience", "audienceType": "Administrators and Managers" },
    "about": { "@type": "SoftwareApplication", "name": "SmartTask System" }
  };

  // ── RENDER ──
  return (
    <div className="page-content">
      <JsonLd data={jsonLdData} />

      {/* ── Page Header ── */}
      <header className="page-header">
        <h1 className="page-title">Papan Pemuka Utama</h1>
        <p className="page-subtitle">
          Selamat datang semula — ringkasan operasi hari ini
        </p>
      </header>

      {/* ── KPI Cards (6 cards, 3 per row) ── */}
      <section className="kpi-grid" aria-label="Ringkasan KPI"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className={`kpi-card ${card.modifier}`}
            onClick={card.navigateTo ? () => navigate(card.navigateTo) : undefined}
            tabIndex={card.navigateTo ? 0 : undefined}
            onKeyDown={card.navigateTo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(card.navigateTo); } } : undefined}
            style={{ position: 'relative', ...(card.navigateTo ? { cursor: 'pointer' } : {}) }}
          >
            <div className="kpi-top">
              <h3 className="kpi-label">{card.label}</h3>
              <div className="kpi-value">{card.value}</div>
            </div>
            <div className="kpi-bottom">
              <div className="kpi-footer">{card.footer}</div>
            </div>
            <div className="kpi-bg-icon" aria-hidden="true">
              <card.Icon />
            </div>
            {card.navigateTo && stats.pendingLeaves > 0 && (
              <span style={{
                position: 'absolute', top: 10, right: 10,
                width: 10, height: 10, borderRadius: '50%',
                background: '#DC2626', border: '2px solid rgba(255,255,255,0.5)',
              }} />
            )}
          </article>
        ))}
      </section>

      {/* ── Analitik: Trend Tempahan + Statistik Cuti (2-lajur) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        {/* Trend Tempahan */}
        <section className="section-card" aria-label="Trend Tempahan">
          <header className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" />
              Trend Tempahan (6 Bulan)
            </div>
            <span className="section-card-meta">
              {orderTrends.reduce((s, r) => s + r.total, 0)} tempahan
            </span>
          </header>
          <div style={{ padding: '16px 20px' }}>
            {orderTrends.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '40px 0', margin: 0 }}>
                Tiada data tempahan 6 bulan lepas.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orderTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month_label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="completed"   name="Siap"         fill="#16A34A" radius={[3,3,0,0]} />
                  <Bar dataKey="in_progress" name="Dalam Proses" fill="#2563EB" radius={[3,3,0,0]} />
                  <Bar dataKey="pending"     name="Menunggu"     fill="#D97706" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Statistik Cuti */}
        <section className="section-card" aria-label="Statistik Cuti">
          <header className="section-card-header">
            <div className="section-card-title">
              <div className="title-accent-dot" style={{ background: '#7C3AED' }} />
              Statistik Cuti
            </div>
            <span className="section-card-meta">
              {leaveStats.pendingThisMonth} menunggu bulan ini
            </span>
          </header>
          <div style={{ padding: '16px 20px' }}>
            {leaveStats.byStatus.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '40px 0', margin: 0 }}>
                Tiada rekod cuti.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={leaveStats.byStatus} dataKey="count" nameKey="status"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {leaveStats.byStatus.map(entry => (
                      <Cell key={entry.status}
                        fill={entry.status === 'Approved' ? '#16A34A'
                            : entry.status === 'Pending'  ? '#D97706'
                            : '#DC2626'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* ── Progress Keseluruhan Tugasan ── */}
      <section className="section-card" aria-label="Progress Tugasan" style={{ marginBottom: 20 }}>
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" style={{ background: donutColor }} />
            Progress Keseluruhan Tugasan
          </div>
          <span className="section-card-meta">
            {stats.completionRate}% daripada tugasan Confirmed
          </span>
        </header>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={completionDonutData}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={65} outerRadius={100}
                paddingAngle={3}
                startAngle={90} endAngle={-270}
              >
                <Cell fill={donutColor} />
                <Cell fill="#E2E8F0" />
              </Pie>
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 28, fontWeight: 700, fill: donutColor }}>
                {stats.completionRate}%
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 11, fill: '#94A3B8' }}>
                Tugasan Siap
              </text>
              <Tooltip formatter={(val) => `${val}%`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Analitik: Prestasi Staf (lebar penuh) ── */}
      <section className="section-card" aria-label="Prestasi Staf" style={{ marginBottom: 20 }}>
        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" style={{ background: '#059669' }} />
            Prestasi Staf
          </div>
          <span className="section-card-meta">Tugasan per staf aktif</span>
        </header>
        <div style={{ padding: '16px 20px' }}>
          {staffPerf.length === 0 && !chartsLoading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '40px 0', margin: 0 }}>
              Tiada data prestasi staf.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, staffPerf.length * 44)}>
              <BarChart data={staffPerf} layout="vertical"
                margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed"   name="Siap"         fill="#16A34A" stackId="a" />
                <Bar dataKey="in_progress" name="Dalam Proses" fill="#2563EB" stackId="a" />
                <Bar dataKey="pending"     name="Menunggu"     fill="#D97706" stackId="a"
                  radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Audit Log Section ── */}
      <section className="section-card" aria-label="Log Audit">

        <header className="section-card-header">
          <div className="section-card-title">
            <div className="title-accent-dot" />
            Aktiviti Terkini
            <span className="badge badge--gray no-dot" style={{ fontSize: 11 }}>
              Jejak Audit
            </span>
          </div>
          <span className="section-card-meta">Dikemaskini: hari ini</span>
        </header>

        {error && (
          <div style={{
            padding: '10px 22px',
            background: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            fontSize: 12,
            color: '#92400E',
          }}>
            ⚠ {error}
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Masa</th>
              <th style={{ width: 160 }}>Pengguna</th>
              <th>Aktiviti</th>
              <th style={{ width: 110, textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: '30px 22px' }}>
                  Tiada aktiviti terkini
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id ?? log.time + log.user}>
                  <td><span className="td-mono">{log.time}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className="user-initials-circle">{getInitials(log.user)}</div>
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td>{log.activity}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${getBadgeClass(log.status)}`}>{log.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination total={auditLogs.length} page={logsPage} pageSize={LOGS_PAGE_SIZE} onChange={setLogsPage} />

      </section>

    </div>
  );
}
