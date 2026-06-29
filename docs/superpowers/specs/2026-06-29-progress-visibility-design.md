# Progress Visibility & UI Cleanup — Design Spec

**Date:** 2026-06-29
**Status:** Approved

## Overview

Five targeted frontend changes to SmartTask's manager portal that surface task-completion progress visually, add a leave-notification affordance, and remove admin-facing functionality that belongs only to staff (recording their own leave).

No backend changes. No new API endpoints. All data already exists in the API responses.

## Files Changed

| File | What changes |
|------|-------------|
| `Frontend/src/pages/manager/JanaanJadual.jsx` | Staff column colour logic + percentage label |
| `Frontend/src/pages/manager/Dashboard.jsx` | Donut chart, clickable KPI card, neutral card modifiers, useNavigate |
| `Frontend/src/pages/manager/Cuti.jsx` | Remove Rekod Cuti button, modal, and all related state/handlers |
| `Frontend/src/smarttask.css` | Add `.kpi-card--neutral` class |

**Do NOT touch:** `App.jsx`, `Layout.jsx`, `PengurusanCuti.jsx`, `CutiStaf.jsx`, any backend file.

---

## Section 1 — Staff Column Colour Logic (`JanaanJadual.jsx`)

**Where:** Inside `staffColumns.map(([staffName, data], colIdx) => ...)` (around line 906).

### Computation (per column)

```js
const confirmedTasks = data.tasks.filter(t => t.approval_status === 'Confirmed');
const jumlahConfirmed = confirmedTasks.length;
const siapCount = confirmedTasks.filter(t => t.status === 'Completed').length;
const peratusSiap = jumlahConfirmed > 0 ? (siapCount / jumlahConfirmed) * 100 : null;
```

Draft tasks (`approval_status !== 'Confirmed'`) are excluded from the calculation — they are not yet valid assignments.

### Colour thresholds

| Condition | Background | Border |
|-----------|-----------|--------|
| `peratusSiap === null` (no confirmed tasks) | `#F8FAFC` (neutral, unchanged) | `#E8EDF3` |
| `>= 90` | `#DCFCE7` (green) | `#86EFAC` |
| `>= 50 && < 90` | `#FEF3C7` (yellow) | `#FDE68A` |
| `< 50` | `#FEE2E2` (red) | `#FCA5A5` |

### Click behaviour (red columns only)

- Apply `cursor: 'pointer'` to the column wrapper div when `peratusSiap < 50 && jumlahConfirmed > 0`
- Add `onClick={() => setViewMode('kanban')}` on the same wrapper (no-op for other colours)
- Add `title="Klik untuk lihat papan kanban"` tooltip on the column wrapper when red

### Percentage label in column header

Next to the existing task-count badge (the blue pill showing `data.tasks.length`), add a small percentage text:
- Only shown when `peratusSiap !== null`
- Text: `{Math.round(peratusSiap)}% siap`
- Style: `fontSize: 10, color: '#64748B', fontWeight: 500` (neutral — doesn't repeat the colour signal)

---

## Section 2 — Overall Progress Donut Chart (`Dashboard.jsx`)

**Placement:** New `section-card` inserted between the 2-column analytics grid (after line 255) and the "Prestasi Staf" section (line 258). Full-width, consistent with "Prestasi Staf" layout.

### Data

Uses `stats.completionRate` already returned by `GET /api/dashboard/stats`. No new fetch needed.

```js
const completionDonutData = [
  { name: 'Tugasan Siap', value: stats.completionRate },
  { name: 'Baki', value: 100 - stats.completionRate },
];
const donutColor = stats.completionRate >= 90 ? '#16A34A'
                 : stats.completionRate >= 50 ? '#D97706'
                 : '#DC2626';
```

### Chart

Uses existing recharts imports (`PieChart`, `Pie`, `Cell`, `ResponsiveContainer`) — no new dependencies.

```jsx
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
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 28, fontWeight: 700, fill: donutColor }}>
      {stats.completionRate}%
    </text>
    <text x="50%" y="50%" dy={26} textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 11, fill: '#94A3B8' }}>
      Tugasan Siap
    </text>
    <Tooltip formatter={(val) => `${val}%`} />
    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
  </PieChart>
</ResponsiveContainer>
```

Section label: `"Progress Keseluruhan Tugasan"`. Show completion rate in the section-card-meta: `"{stats.completionRate}% daripada tugasan Confirmed"`.

---

## Section 3 — Clickable "Permohonan Cuti" KPI Card (`Dashboard.jsx`)

### useNavigate

Add `import { useNavigate } from 'react-router-dom';` at the top of Dashboard.jsx. Add `const navigate = useNavigate();` inside the component, alongside existing state declarations.

### kpiCards object change

Add a `navigateTo` field only to the "Permohonan Cuti" card:

```js
{ label: 'Permohonan Cuti', value: stats.pendingLeaves, modifier: 'kpi-card--purple',
  footer: `${stats.completionRate}% tugasan siap`, Icon: CalendarIcon,
  navigateTo: '/cuti' },
```

### Render change

In `kpiCards.map(...)`, for cards that have `card.navigateTo`:
- Add `onClick={() => navigate(card.navigateTo)}` to the `<article>`
- Add `style={{ cursor: 'pointer' }}` to the `<article>`

### Notification badge

When `stats.pendingLeaves > 0`, render a red dot badge inside the article (absolutely positioned, top-right):

```jsx
{card.navigateTo && stats.pendingLeaves > 0 && (
  <span style={{
    position: 'absolute', top: 10, right: 10,
    width: 10, height: 10, borderRadius: '50%',
    background: '#DC2626', border: '2px solid rgba(255,255,255,0.5)',
  }} />
)}
```

Requires `position: 'relative'` on the `<article>` (add inline or via CSS) so the absolute badge positions correctly inside it.

---

## Section 4 — Neutral KPI Card Style (`smarttask.css` + `Dashboard.jsx`)

### New CSS class

Add to `smarttask.css` immediately after `.kpi-card--purple`:

```css
.kpi-card--neutral {
  background: linear-gradient(145deg, #334155 0%, #475569 55%, #64748B 100%);
}
```

### Dashboard.jsx kpiCards change

- `'Staf Aktif'` modifier: `'kpi-card--cyan'` → `'kpi-card--neutral'`
- `'Staf Cuti'` modifier: `'kpi-card--red'` → `'kpi-card--neutral'`

Icons (`TeamIcon`, `LeaveIcon`) and footer text for both cards are unchanged.

---

## Section 5 — Remove "Rekod Cuti" Admin Feature (`Cuti.jsx`)

### Remove from JSX

1. The `<button>` with `id="btn-rekod-cuti"` and `onClick={() => setIsModalOpen(true)}` from `<header className="page-header flex-between">` (lines 189–194)
2. The entire `{isModalOpen && (...)}` block — "Modal Rekod Cuti" (lines 376–494)

### Remove state declarations

```js
// Remove all of these:
const [isModalOpen, setIsModalOpen]   = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitMsg, setSubmitMsg]       = useState(null);
const [formData, setFormData]         = useState({ staff_id: '', start_date: '', end_date: '', reason: '' });
const [staffList, setStaffList]       = useState([]);
```

### Remove functions

```js
// Remove entirely:
async function fetchStaff() { ... }
const handleChange = (e) => { ... };
const handleSubmit = async (e) => { ... };
const closeModal = () => { ... };
```

### Update useEffect

Change:
```js
useEffect(() => {
  fetchLeaves();
  fetchStaff();   // ← remove this line
}, []);
```
to:
```js
useEffect(() => {
  fetchLeaves();
}, []);
```

### What to KEEP

- `modalStyles` object in its entirety (used by the "Tolak Permohonan Cuti" modal)
- All approve/reject state and handlers (`actionLoading`, `rejectModal`, `rejectReason`, `actionToast`, `handleAction`)
- The "Tolak Cuti" modal block (lines 333–374)
- The three KPI cards, the leave table, pagination

---

## Verification Checklist

- [ ] `npm run build` in `Frontend/` — zero compile errors
- [ ] `git diff --stat` shows only `JanaanJadual.jsx`, `Dashboard.jsx`, `Cuti.jsx`, `smarttask.css`
- [ ] Staff columns turn green/yellow/red by threshold; red columns navigate to kanban on click
- [ ] Dashboard donut renders and colour matches threshold
- [ ] "Permohonan Cuti" KPI card navigates to `/cuti`; other KPI cards do not
- [ ] Red dot badge appears on the card when `pendingLeaves > 0`
- [ ] "Staf Aktif" and "Staf Cuti" cards show neutral slate gradient
- [ ] `/cuti` page: no "Rekod Cuti" button, no related modal, no console errors
- [ ] `/staf/cuti` (staff leave page): unaffected

## Commit Message

```
feat: tambah logic warna progress (per-staf + donut keseluruhan), notifikasi cuti boleh klik, buang rekod cuti admin
```
