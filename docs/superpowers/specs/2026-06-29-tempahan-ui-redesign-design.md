# Tempahan UI Redesign — Design Spec

**Date:** 2026-06-29
**Status:** Approved

## Overview

Simplify the Tempahan (Orders) navigation by removing the dedicated "Tempahan Baru" sidebar link and consolidating the create-order entry point into the Tempahan list page. Replace the per-row "Lihat Detail" button with clickable table rows.

## Changes

### 1. Sidebar — `Frontend/src/components/Layout.jsx`

Remove the `Tempahan Baru` entry from `NAV_ITEMS`:

```js
// REMOVE this item from the 'Utama' section:
{ label: 'Tempahan Baru', to: '/tempahan/baru', icon: ICONS.newOrder }
```

The `ICONS.newOrder` path data and `/tempahan/baru` route in `App.jsx` are **not** removed — the page remains accessible via the new button and breadcrumb.

### 2. Tempahan List Page — `Frontend/src/pages/manager/Tempahan.jsx`

#### 2a. Add `useNavigate` and header button

Import `useNavigate` from `react-router-dom`. In the existing `<header className="page-header flex-between">` block, add a primary button on the right that navigates to `/tempahan/baru`:

```
[ Senarai Tempahan                    ] [ + Tambah Tempahan ]
[ Pantau dan urus semua tempahan ...  ]
```

Button uses class `btn btn--primary` with a small inline `+` SVG icon.

#### 2b. Remove "Tindakan" column

- Remove `<th style={{ textAlign: 'center' }}>Tindakan</th>` from `<thead>`
- Update `colSpan` on loading and empty-state rows from `6` → `5`
- Remove the `<td>` cell containing the "Lihat Detail" `<button>` from each data row

#### 2c. Make rows clickable

On each data `<tr>`:
- Add `onClick={() => handleOpenModal(order)}`
- Add `style={{ cursor: 'pointer' }}`
- Add `onMouseEnter` / `onMouseLeave` handlers to toggle a subtle background highlight (`#F8FAFC` on hover, transparent on leave) using a local `hoveredRow` state (stores the hovered `order.id` or `null`)

The existing `handleOpenModal`, `handleCloseModal`, and modal JSX are **unchanged**.

## Out of Scope

- No changes to `TempahanBaru.jsx`
- No changes to `App.jsx` routes
- No backend changes
- No changes to the modal content or any other page
