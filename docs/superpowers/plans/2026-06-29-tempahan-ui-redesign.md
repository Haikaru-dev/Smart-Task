# Tempahan UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "Tempahan Baru" sidebar link, add a create-order button inside the Tempahan list page header, and replace the "Lihat Detail" button column with clickable rows.

**Architecture:** Two focused file edits — `Layout.jsx` loses one nav item, `Tempahan.jsx` gains a header button and row-click behaviour. No new files, no backend changes, no route changes.

**Tech Stack:** React 18, React Router DOM 7, inline SVG icons, existing `smarttask.css` classes.

## Global Constraints

- All UI text in Bahasa Malaysia
- No external icon libraries — inline SVG only
- Use existing CSS classes: `btn btn--primary`, `page-header flex-between`, `nav-link`, etc.
- Do not modify `App.jsx`, `TempahanBaru.jsx`, or any backend files
- The `/tempahan/baru` route must remain accessible

---

### Task 1: Remove "Tempahan Baru" sidebar link

**Files:**
- Modify: `Frontend/src/components/Layout.jsx` (NAV_ITEMS array, lines ~62–79)

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: sidebar with no "Tempahan Baru" link; the route `/tempahan/baru` still works

- [ ] **Step 1: Open `Frontend/src/components/Layout.jsx` and locate `NAV_ITEMS`**

Find this block (around line 62):

```js
const NAV_ITEMS = [
    {
        section: 'Utama',
        items: [
            { label: 'Dashboard', to: '/dashboard', icon: ICONS.dashboard },
            { label: 'Tempahan', to: '/tempahan', icon: ICONS.orders },
            { label: 'Tempahan Baru', to: '/tempahan/baru', icon: ICONS.newOrder },
        ],
    },
    ...
```

- [ ] **Step 2: Remove the "Tempahan Baru" entry**

Replace the `items` array in the `'Utama'` section so it reads:

```js
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
```

Leave `ICONS.newOrder` in the `ICONS` object — do not remove it (no-op, but avoids an unnecessary diff).

- [ ] **Step 3: Verify manually**

Start the frontend (`npm run dev` inside `Frontend/`). Log in as Manager. Confirm:
- Sidebar "Utama" section shows only "Dashboard" and "Tempahan"
- "Tempahan Baru" link is gone from the sidebar
- Navigating directly to `http://localhost:5173/tempahan/baru` still works

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/components/Layout.jsx
git commit -m "feat: remove Tempahan Baru sidebar link"
```

---

### Task 2: Add header button and make rows clickable in Tempahan page

**Files:**
- Modify: `Frontend/src/pages/manager/Tempahan.jsx`

**Interfaces:**
- Consumes: nothing from Task 1 (independent)
- Produces: Tempahan page with a "+ Tambah Tempahan" header button, no "Tindakan" column, clickable rows that open the existing detail modal

- [ ] **Step 1: Add `useNavigate` import**

At the top of `Frontend/src/pages/manager/Tempahan.jsx`, change:

```js
import { useState, useEffect } from 'react';
```

to:

```js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Add `navigate` and `hoveredRow` state inside the component**

Inside `export default function Tempahan()`, after the existing state declarations, add:

```js
const navigate = useNavigate();
const [hoveredRow, setHoveredRow] = useState(null);
```

- [ ] **Step 3: Add the "+ Tambah Tempahan" button to the page header**

Find the existing `<header>` block (around line 84):

```jsx
<header className="page-header flex-between">
  <div>
    <h1 className="page-title">Senarai Tempahan</h1>
    <p className="page-subtitle">Pantau dan urus semua tempahan pelanggan</p>
  </div>
</header>
```

Replace it with:

```jsx
<header className="page-header flex-between">
  <div>
    <h1 className="page-title">Senarai Tempahan</h1>
    <p className="page-subtitle">Pantau dan urus semua tempahan pelanggan</p>
  </div>
  <button
    className="btn btn--primary"
    onClick={() => navigate('/tempahan/baru')}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6 }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    Tambah Tempahan
  </button>
</header>
```

- [ ] **Step 4: Remove the "Tindakan" column header**

Find the `<thead>` block (around line 121). Remove this line:

```jsx
<th style={{ textAlign: 'center' }}>Tindakan</th>
```

- [ ] **Step 5: Fix `colSpan` on loading and empty-state rows**

Find the two `<td colSpan={6} ...>` cells (loading state and empty state) and change both from `colSpan={6}` to `colSpan={5}`:

```jsx
{/* Loading state */}
<td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
  Memuatkan data...
</td>

{/* Empty state */}
<td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
  Tiada rekod tempahan dijumpai.
</td>
```

- [ ] **Step 6: Make rows clickable and remove the "Lihat Detail" button cell**

Find the data row `<tr key={order.id}>` block. Replace the entire `<tr>` with:

```jsx
<tr
  key={order.id}
  onClick={() => handleOpenModal(order)}
  onMouseEnter={() => setHoveredRow(order.id)}
  onMouseLeave={() => setHoveredRow(null)}
  style={{
    cursor: 'pointer',
    backgroundColor: hoveredRow === order.id ? '#F8FAFC' : 'transparent',
    transition: 'background-color 0.15s',
  }}
>
  <td>
    <span className="td-id">{order.order_number}</span>
  </td>
  <td style={{ fontWeight: 500, color: '#1E293B' }}>{order.client_name}</td>
  <td style={{ textTransform: 'capitalize' }}>
    {order.item_type ? order.item_type.replace('_', ' ') : '-'}
  </td>
  <td>
    <span className="td-mono">
      {order.due_date ? new Date(order.due_date).toLocaleDateString('ms-MY') : '-'}
    </span>
  </td>
  <td>
    <span className={`badge ${getBadgeClass(order.status)}`}>
      {order.status || 'Pending'}
    </span>
  </td>
</tr>
```

Note: the old `<td>` with the "Lihat Detail" button is not included — it is intentionally removed.

- [ ] **Step 7: Verify manually**

With the dev server running, navigate to `/tempahan`. Confirm:
- A blue "+ Tambah Tempahan" button appears top-right of the page header
- Clicking it navigates to `/tempahan/baru`
- The table has 5 columns (no "Tindakan" column)
- Hovering a row highlights it with a light background and shows a pointer cursor
- Clicking any row opens the detail modal
- The modal still shows all fields correctly and closes with "Tutup Tetingkap"

- [ ] **Step 8: Commit**

```bash
git add Frontend/src/pages/manager/Tempahan.jsx
git commit -m "feat: add Tambah Tempahan button and clickable rows in Tempahan list"
```
