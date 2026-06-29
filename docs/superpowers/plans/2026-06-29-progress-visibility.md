# Progress Visibility & UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-staff and overall task-completion progress indicators, make the leave KPI card a navigation shortcut, neutralise two colour-coded KPI cards, and remove the admin-facing "Rekod Cuti" form.

**Architecture:** Four sequential frontend edits across four files. No new components, no new API endpoints — all data already exists in API responses. Tasks 3 and 4 both edit `Dashboard.jsx`; Task 3 does the KPI card changes, Task 4 adds the donut chart section. A single git commit is issued at the end of Task 4 covering all four files.

**Tech Stack:** React 18, React Router DOM 7, recharts (already imported), Vite, smarttask.css BEM-style classes.

## Global Constraints

- All UI text in Bahasa Malaysia (labels, tooltips, placeholder text)
- Inline SVG only — no icon library imports
- Do NOT modify: `App.jsx`, `Layout.jsx`, `PengurusanCuti.jsx`, `CutiStaf.jsx`, `Backend/server.js`, or any other backend file
- `modalStyles` in `Cuti.jsx` must be preserved in full (used by the Tolak modal that stays)
- Single commit at the end of Task 4: `feat: tambah logic warna progress (per-staf + donut keseluruhan), notifikasi cuti boleh klik, buang rekod cuti admin`
- Build must pass with zero errors: run `npm run build` inside `Frontend/`

---

### Task 1: Staff Column Colour Logic

**Files:**
- Modify: `Frontend/src/pages/manager/JanaanJadual.jsx` (~lines 906–986)

**Interfaces:**
- Consumes: `data.tasks[]` — each task has `approval_status: 'Draft'|'Confirmed'` and `status: 'Completed'|'In Progress'|'Pending'`; `setViewMode` function already exists in component scope
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Read the file to locate the staffColumns.map block**

Open `Frontend/src/pages/manager/JanaanJadual.jsx`. Find the line that reads:

```jsx
{staffColumns.map(([staffName, data], colIdx) => (
```

This is around line 906. The arrow function currently uses expression syntax `=> (...)`. You must change it to block syntax `=> { ... return (...); }` to allow variable declarations inside.

- [ ] **Step 2: Replace the map opening and add colour computations**

Change:
```jsx
{staffColumns.map(([staffName, data], colIdx) => (
  <div key={staffName} style={{ background: '#F8FAFC', borderRadius: 12,
    border: '1px solid #E8EDF3', overflow: 'hidden' }}>
```

To:
```jsx
{staffColumns.map(([staffName, data], colIdx) => {
  const confirmedTasks  = data.tasks.filter(t => t.approval_status === 'Confirmed');
  const jumlahConfirmed = confirmedTasks.length;
  const siapCount       = confirmedTasks.filter(t => t.status === 'Completed').length;
  const peratusSiap     = jumlahConfirmed > 0 ? (siapCount / jumlahConfirmed) * 100 : null;

  const colBg     = peratusSiap === null ? '#F8FAFC'
                  : peratusSiap >= 90    ? '#DCFCE7'
                  : peratusSiap >= 50    ? '#FEF3C7'
                  : '#FEE2E2';
  const colBorder = peratusSiap === null ? '#E8EDF3'
                  : peratusSiap >= 90    ? '#86EFAC'
                  : peratusSiap >= 50    ? '#FDE68A'
                  : '#FCA5A5';
  const isRed = peratusSiap !== null && peratusSiap < 50;

  return (
    <div key={staffName}
      style={{
        background: colBg, borderRadius: 12,
        border: `1px solid ${colBorder}`, overflow: 'hidden',
        ...(isRed ? { cursor: 'pointer' } : {}),
      }}
      title={isRed ? 'Klik untuk lihat papan kanban' : undefined}
      onClick={isRed ? () => setViewMode('kanban') : undefined}
    >
```

- [ ] **Step 3: Close the map with return syntax**

Find the closing of the map. It currently reads `</div> ))}` (the outer div closes, then the expression closes). Change it to `</div> ); })}` — i.e., close the `return (...)` and the arrow function body.

Specifically find:
```jsx
                </div>
              ))}
```
(the two closing tags for the outer column wrapper and the map)

and change to:
```jsx
                </div>
              ); })}
```

- [ ] **Step 4: Add the percentage label in the column header**

Inside the column header div, find the existing task-count badge:
```jsx
<span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11,
  fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
  {data.tasks.length}
</span>
```

Add the percentage label immediately after it (still inside the header flex row):
```jsx
<span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11,
  fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
  {data.tasks.length}
</span>
{peratusSiap !== null && (
  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
    {Math.round(peratusSiap)}% siap
  </span>
)}
```

- [ ] **Step 5: Verify the edit visually**

Read back lines 903–990 of `JanaanJadual.jsx` and confirm:
- Arrow function now uses `{ return (); }` block syntax
- `peratusSiap`, `colBg`, `colBorder`, `isRed` are computed before `return`
- Outer wrapper div has conditional `background`, `border`, `cursor`, `title`, `onClick`
- Percentage label renders conditionally after the count badge

Do NOT commit yet.

---

### Task 2: Remove "Rekod Cuti" Admin Feature

**Files:**
- Modify: `Frontend/src/pages/manager/Cuti.jsx`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Read Cuti.jsx to understand current structure**

Open `Frontend/src/pages/manager/Cuti.jsx`. Confirm:
- `staffList` state and `fetchStaff()` are present
- `isModalOpen`, `isSubmitting`, `submitMsg`, `formData` states are present
- `handleChange`, `handleSubmit`, `closeModal` handlers are present
- `modalStyles` is used by both the Tolak modal (keep) and the Rekod Cuti modal (remove)

- [ ] **Step 2: Remove state declarations**

Find and remove these five `useState` declarations (lines ~50–62):

```js
const [staffList, setStaffList] = useState([]);
const [isModalOpen, setIsModalOpen]   = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitMsg, setSubmitMsg]       = useState(null);
const [formData, setFormData]         = useState({
  staff_id: '', start_date: '', end_date: '', reason: ''
});
```

Leave these states intact:
- `leaves`, `loading`, `error`
- `actionLoading`, `rejectModal`, `rejectReason`, `actionToast`
- `page`

- [ ] **Step 3: Remove fetchStaff function and its call in useEffect**

Remove the entire `fetchStaff` function (lines ~86–95):
```js
async function fetchStaff() {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/staff`);
    const data = res.data.data || res.data;
    setStaffList(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Ralat mengambil senarai staf:', err);
  }
}
```

Then update the `useEffect` (lines ~97–100). Change:
```js
useEffect(() => {
  fetchLeaves();
  fetchStaff();
}, []);
```
to:
```js
useEffect(() => {
  fetchLeaves();
}, []);
```

- [ ] **Step 4: Remove handleChange, handleSubmit, closeModal**

Remove these three functions entirely (lines ~137–168):

```js
const handleChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  const { staff_id, start_date, end_date, reason } = formData;
  if (!staff_id || !start_date || !end_date || !reason) return;
  try {
    setIsSubmitting(true);
    setSubmitMsg(null);
    await axios.post(`${API_BASE_URL}/api/leaves`, { staff_id, start_date, end_date, reason });
    setSubmitMsg({ type: 'success', text: 'Cuti berjaya direkodkan!' });
    setFormData({ staff_id: '', start_date: '', end_date: '', reason: '' });
    fetchLeaves();
    setTimeout(() => { setIsModalOpen(false); setSubmitMsg(null); }, 1500);
  } catch (err) {
    console.error('Ralat merekod cuti:', err);
    setSubmitMsg({ type: 'error', text: 'Gagal merekod cuti. Semak sambungan backend.' });
  } finally {
    setIsSubmitting(false);
  }
};

const closeModal = () => {
  setIsModalOpen(false);
  setSubmitMsg(null);
  setFormData({ staff_id: '', start_date: '', end_date: '', reason: '' });
};
```

- [ ] **Step 5: Remove the "Rekod Cuti" button from the page header**

Find in the JSX (lines ~184–195):
```jsx
<button className="btn btn--primary" id="btn-rekod-cuti" onClick={() => setIsModalOpen(true)}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ marginRight: 6 }}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
  Rekod Cuti
</button>
```

Remove it. The `<header className="page-header flex-between">` will now contain only the title/subtitle `<div>` — but since the button is gone, you can also remove the `flex-between` class (the header no longer needs space-between layout). Change:
```jsx
<header className="page-header flex-between">
```
to:
```jsx
<header className="page-header">
```

- [ ] **Step 6: Remove the "Modal Rekod Cuti" JSX block**

Find and remove the entire block from `{/* ── Modal Rekod Cuti ── */}` through its closing `)}` (lines ~376–494). This is the `{isModalOpen && (...)}` block. Do NOT remove the "Modal Tolak Cuti" block above it (the `{rejectModal && (...)}` block at lines ~333–374).

After removal, the file should end with the Tolak Cuti modal, then the closing `</div>` of the page, then the `modalStyles` object.

- [ ] **Step 7: Verify no dangling references**

Read the full Cuti.jsx file and confirm none of these identifiers appear anywhere:
- `staffList`, `setStaffList`
- `isModalOpen`, `setIsModalOpen`
- `isSubmitting`, `setIsSubmitting`
- `submitMsg`, `setSubmitMsg`
- `formData`, `setFormData`
- `handleChange`, `handleSubmit`, `closeModal`
- `fetchStaff`

Also confirm `modalStyles` still appears in the Tolak Cuti modal block.

Do NOT commit yet.

---

### Task 3: Dashboard KPI Interactions & Neutral Cards

**Files:**
- Modify: `Frontend/src/pages/manager/Dashboard.jsx`
- Modify: `Frontend/src/smarttask.css`

**Interfaces:**
- Consumes: nothing from Tasks 1–2
- Produces: `navigate` function in scope (Task 4 does not need it, but it's already in the file)

- [ ] **Step 1: Add useNavigate import to Dashboard.jsx**

Find the import line at the top of `Frontend/src/pages/manager/Dashboard.jsx`:
```js
import { useState, useEffect } from 'react';
```

Add `useNavigate` from react-router-dom on the next line (it is not yet imported):
```js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Add navigate declaration inside the component**

Inside `export default function Dashboard()`, after the existing state declarations (around line 85, after `setChartsLoading`), add:

```js
const navigate = useNavigate();
```

- [ ] **Step 3: Add neutral CSS class to smarttask.css**

Open `Frontend/src/smarttask.css`. Find the `.kpi-card--purple` rule (around line 436–438):
```css
.kpi-card--purple {
    background: linear-gradient(145deg, #4C1D95 0%, #7C3AED 55%, #8B5CF6 100%);
}
```

Add the new neutral class immediately after it:
```css
.kpi-card--neutral {
    background: linear-gradient(145deg, #334155 0%, #475569 55%, #64748B 100%);
}
```

- [ ] **Step 4: Update kpiCards array in Dashboard.jsx**

Find the `kpiCards` array (lines ~122–129). Apply three changes:

**a)** Change `'Staf Aktif'` modifier from `'kpi-card--cyan'` to `'kpi-card--neutral'`

**b)** Change `'Staf Cuti'` modifier from `'kpi-card--red'` to `'kpi-card--neutral'`

**c)** Add `navigateTo: '/cuti'` field to the `'Permohonan Cuti'` card

The updated array:
```js
const kpiCards = [
  { label: 'Tempahan Pending',  value: stats.pending,       modifier: 'kpi-card--blue',    footer: '↑ Menunggu tindakan',                  Icon: ClockIcon    },
  { label: 'Tugasan Siap',      value: stats.completed,     modifier: 'kpi-card--green',   footer: '↑ Selesai minggu ini',                 Icon: CheckIcon    },
  { label: 'Staf Aktif',        value: stats.activeStaff,   modifier: 'kpi-card--neutral', footer: 'Bertugas hari ini',                    Icon: TeamIcon     },
  { label: 'Dalam Proses',      value: stats.inProgress,    modifier: 'kpi-card--amber',   footer: '← Sedang diproses',                   Icon: ProgressIcon },
  { label: 'Staf Cuti',         value: stats.onLeave,       modifier: 'kpi-card--neutral', footer: 'Perlu semakan',                        Icon: LeaveIcon    },
  { label: 'Permohonan Cuti',   value: stats.pendingLeaves, modifier: 'kpi-card--purple',  footer: `${stats.completionRate}% tugasan siap`, Icon: CalendarIcon,
    navigateTo: '/cuti' },
];
```

- [ ] **Step 5: Update the kpiCards render to support click + notification badge**

Find the `kpiCards.map(...)` render block (lines ~168–181). Replace it with:

```jsx
{kpiCards.map((card) => (
  <article
    key={card.label}
    className={`kpi-card ${card.modifier}`}
    onClick={card.navigateTo ? () => navigate(card.navigateTo) : undefined}
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
```

- [ ] **Step 6: Verify Dashboard.jsx changes so far**

Read lines 1–185 of Dashboard.jsx and confirm:
- `useNavigate` is imported
- `navigate` is declared inside the component
- `kpiCards` has `navigateTo` on the Permohonan Cuti card only
- 'Staf Aktif' and 'Staf Cuti' use `kpi-card--neutral`
- The article render has conditional onClick, position: relative, and badge dot

Do NOT commit yet.

---

### Task 4: Progress Donut Chart + Build Verify + Final Commit

**Files:**
- Modify: `Frontend/src/pages/manager/Dashboard.jsx` (continued from Task 3)
- Verify build for all four changed files
- Commit all four files

**Interfaces:**
- Consumes: `stats.completionRate` (number 0–100, already in state from `GET /api/dashboard/stats`)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add donut data and colour computation**

In `Dashboard.jsx`, after the `kpiCards` array (around line 130, before the `if (loading)` block), add:

```js
const completionDonutData = [
  { name: 'Tugasan Siap', value: stats.completionRate },
  { name: 'Baki', value: Math.max(0, 100 - stats.completionRate) },
];
const donutColor = stats.completionRate >= 90 ? '#16A34A'
                 : stats.completionRate >= 50 ? '#D97706'
                 : '#DC2626';
```

- [ ] **Step 2: Add the donut chart section to the JSX**

Find the comment `{/* ── Analitik: Prestasi Staf (lebar penuh) ── */}` (around line 258). Insert the new section immediately BEFORE it:

```jsx
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
```

Note: `PieChart`, `Pie`, `Cell`, `ResponsiveContainer`, `Tooltip`, `Legend` are already imported from recharts — no new imports needed.

- [ ] **Step 3: Run the Vite build to verify zero errors**

```bash
cd Frontend && npm run build
```

Expected output: ends with `✓ built in X.XXs` (or similar Vite success message). Zero TypeScript/JSX errors.

If errors appear:
- `X is not defined` → a removed state reference was missed in Task 2 — find and remove it
- JSX parse error → check the `=> { return (); }` conversion in Task 1 for missing `return` or mismatched braces

- [ ] **Step 4: Confirm only the correct files were changed**

```bash
git diff --stat
```

Expected output — exactly these four files, no others:
```
Frontend/src/pages/manager/JanaanJadual.jsx  | XX ++--
Frontend/src/pages/manager/Dashboard.jsx     | XX ++--
Frontend/src/pages/manager/Cuti.jsx          | XX ++--
Frontend/src/smarttask.css                   |  X ++
```

If any unexpected file appears (e.g., `PengurusanCuti.jsx`, `App.jsx`), do NOT commit — investigate and revert the unintended change.

- [ ] **Step 5: Stage all four files and commit**

```bash
git add Frontend/src/pages/manager/JanaanJadual.jsx \
        Frontend/src/pages/manager/Dashboard.jsx \
        Frontend/src/pages/manager/Cuti.jsx \
        Frontend/src/smarttask.css
git commit -m "feat: tambah logic warna progress (per-staf + donut keseluruhan), notifikasi cuti boleh klik, buang rekod cuti admin"
```
