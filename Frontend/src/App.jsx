import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout (Sidebar + Topbar)
import Layout from './components/Layout';
import StaffLayout from './components/StaffLayout';

// Pages — hanya import apa yang sudah ada
import Dashboard from './pages/manager/Dashboard';

// NOTA: Pastikan fail Login.jsx anda berada di dalam folder 'pages'. 
// Jika ia di luar folder (src/Login.jsx), tukar import di bawah kepada './Login'
import Login from './pages/manager/Login';

// Halaman-halaman ini dimatikan sementara sehingga anda mencipta failnya nanti
import Tempahan from './pages/manager/Tempahan';
import TempahanBaru from './pages/manager/TempahanBaru';
import JanaanJadual from './pages/manager/JanaanJadual';
import SenaraiStaf from './pages/manager/SenaraiStaf';
import DetailStaf from './pages/manager/DetailStaf';
import Cuti from './pages/manager/Cuti';
import PengurusanCuti from './pages/manager/PengurusanCuti';
import ProfilAdmin from './pages/manager/ProfilAdmin';

// Portal Staf
import LoginStaf from './pages/staff/LoginStaf';
import TugasanStaf from './pages/staff/TugasanStaf';
import CutiStaf from './pages/staff/CutiStaf';
import ProfilStaf from './pages/staff/ProfilStaf';

// ── Protected Route: Portal Pengurus ──────────────────────────────
function PrivateRoute({ children }) {
  const userLoggedIn = localStorage.getItem('authToken') || localStorage.getItem('user');
  return userLoggedIn ? children : <Navigate to="/login" replace />;
}

// ── Protected Route: Portal Staf ──────────────────────────────────
function StaffPrivateRoute({ children }) {
  const staffLoggedIn = localStorage.getItem('staffUser');
  return staffLoggedIn ? children : <Navigate to="/staf/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Halaman tanpa Layout (Login) ── */}
        <Route path="/login" element={<Login />} />

        {/* ── Semua halaman bersama Layout (Sidebar + Topbar) ── */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Redirect dari "/" ke "/dashboard" */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Ini halaman yang anda sudah ada */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tempahan/baru" element={<TempahanBaru />} />

          {/* Halaman-halaman di bawah ditutup sementara waktu */}
          <Route path="/tempahan" element={<Tempahan />} />
          <Route path="/jadual" element={<JanaanJadual />} />
          <Route path="/staf" element={<SenaraiStaf />} />
          <Route path="/staf/:id" element={<DetailStaf />} />
          <Route path="/cuti" element={<Cuti />} />
          <Route path="/pengurusan-cuti" element={<PengurusanCuti />} />
          <Route path="/profil" element={<ProfilAdmin />} />
        </Route>

        {/* ── Portal Staf (Layout berasingan) ── */}
        <Route path="/staf/login" element={<LoginStaf />} />
        <Route
          element={
            <StaffPrivateRoute>
              <StaffLayout />
            </StaffPrivateRoute>
          }
        >
          <Route path="/staf/tugasan" element={<TugasanStaf />} />
          <Route path="/staf/cuti" element={<CutiStaf />} />
          <Route path="/staf/profil" element={<ProfilStaf />} />
        </Route>

        {/* Catch-all — redirect ke dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
// Trigger HMR
