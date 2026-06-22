// src/pages/Dashboard.jsx
// ================================================================
// PANTANG LARANG: Semua useState, useEffect, dan axios DIKEKALKAN.
// Hanya bahagian JSX (return) dan CSS className yang diubah.
// ================================================================
import { useState, useEffect } from 'react';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';

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

  // ── State (DIKEKALKAN — sama seperti kod asal anda) ──
  const [stats, setStats] = useState({ pending: 0, completed: 0, activeStaff: 0, onLeave: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Data Fetching (DIKEKALKAN — logik axios tidak berubah) ──
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);

        // ── GANTIKAN URL dengan endpoint API anda yang sebenar ──
        const [statsRes, logsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/dashboard/stats'),
          axios.get('http://localhost:5000/api/dashboard/audit-logs'),
        ]);

        setStats(statsRes.data);
        setAuditLogs(logsRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Gagal memuatkan data. Sila cuba semula.');

        // ── Fallback data untuk development/demo ──
        setStats({ pending: 12, completed: 45, activeStaff: 8, onLeave: 2 });
        setAuditLogs([
          {
            id: 1,
            time: '10:05 AM',
            user: 'Staf Ali',
            activity: "Menukar status Order #102 kepada 'Siap'",
            status: 'Selesai',
          },
          {
            id: 2,
            time: '09:45 AM',
            user: 'Admin',
            activity: 'Meluluskan Cuti Staf Sarah',
            status: 'Log',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  // ── KPI Card data (dibina dari state) ──
  const kpiCards = [
    {
      label: 'Tempahan Pending',
      value: stats.pending,
      modifier: 'kpi-card--blue',
      footer: '↑ Menunggu tindakan',
      Icon: ClockIcon,
    },
    {
      label: 'Tugasan Siap',
      value: stats.completed,
      modifier: 'kpi-card--green',
      footer: '↑ Selesai minggu ini',
      Icon: CheckIcon,
    },
    {
      label: 'Staf Aktif',
      value: stats.activeStaff,
      modifier: 'kpi-card--cyan',
      footer: 'Bertugas hari ini',
      Icon: TeamIcon,
    },
    {
      label: 'Staf Cuti',
      value: stats.onLeave,
      modifier: 'kpi-card--red',
      footer: 'Perlu semakan',
      Icon: LeaveIcon,
    },
  ];

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
    "audience": {
      "@type": "Audience",
      "audienceType": "Administrators and Managers"
    },
    "about": {
      "@type": "SoftwareApplication",
      "name": "SmartTask System"
    }
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

      {/* ── KPI Cards ── */}
      <section className="kpi-grid" aria-label="Ringkasan KPI">
        {kpiCards.map((card) => (
          <article key={card.label} className={`kpi-card ${card.modifier}`}>
            <div className="kpi-top">
              <h3 className="kpi-label">{card.label}</h3>
              <div className="kpi-value">{card.value}</div>
            </div>
            <div className="kpi-bottom">
              <div className="kpi-footer">{card.footer}</div>
            </div>
            {/* Ikon latar belakang dekoratif */}
            <div className="kpi-bg-icon" aria-hidden="true">
              <card.Icon />
            </div>
          </article>
        ))}
      </section>

      {/* ── Audit Log Section ── */}
      <section className="section-card" aria-label="Log Audit">

        {/* Header */}
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

        {/* Error banner (jika ada) */}
        {error && (
          <div style={{
            padding: '10px 22px',
            background: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            fontSize: 12,
            color: '#92400E',
          }}>
            ⚠ {error} (Memaparkan data demo)
          </div>
        )}

        {/* Table */}
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
              auditLogs.map((log) => (
                <tr key={log.id ?? log.time + log.user}>
                  <td>
                    <span className="td-mono">{log.time}</span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-initials-circle">
                        {getInitials(log.user)}
                      </div>
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td>{log.activity}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${getBadgeClass(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </section>
      {/* ── Akhir Audit Log ── */}

    </div>
  );
}