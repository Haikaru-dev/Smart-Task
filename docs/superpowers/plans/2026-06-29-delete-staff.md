# Delete Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a manager to permanently delete a staff member (and their linked login account) from the system when they are no longer with the company.

**Architecture:** Two focused changes — a new `DELETE /api/staff/:id` backend endpoint that removes the staff + user rows (MySQL FK cascades handle leaves and task nullification automatically), and a frontend confirmation flow wired to the existing "Padam Staf" button in `DetailStaf.jsx`.

**Tech Stack:** Express 5, raw MySQL via `db.js` pool, React 18 / Vite, axios, inline styles + existing CSS classes.

## Global Constraints

- All UI text in Bahasa Malaysia
- No test suite — verify with `npm run build` (inside `Frontend/`) and a manual smoke test against XAMPP MySQL
- Backend: raw SQL only, no ORM; use `db.query(sql, params)` from `../db` import
- Frontend: `axios` from `'axios'`, base URL from `'../../config'` as `API_BASE_URL`
- Manager role guard: `verifyToken` + `requireRole('Manager')` on every new route
- No new npm dependencies on either side

---

### Task 1: Backend — `DELETE /api/staff/:id` endpoint

**Files:**
- Modify: `Backend/server.js` — insert after the existing `GET /api/staff/:id` block (around line 468)

**Interfaces:**
- Consumes: `db` pool (already imported at top of file), `verifyToken` + `requireRole` middleware (already defined)
- Produces: `DELETE /api/staff/:id` — returns `{ message: "Staf berjaya dipadam." }` on success, 404 if not found, 500 on DB error

**How MySQL FK cascades work here (read before coding):**

When you `DELETE FROM staff WHERE id = ?`:
- `leaves.staff_id → staff.id ON DELETE CASCADE` — all leave records for this staff are deleted automatically
- `tasks.assigned_staff_id → staff.id ON DELETE SET NULL` — all tasks previously assigned to this staff have `assigned_staff_id` set to NULL (task history is preserved)

The `users` row is **not** automatically deleted (staff → users is `ON DELETE SET NULL` on `staff.user_id`, not the other way). You must delete the `users` row explicitly, which you do **after** deleting staff (so you can read `user_id` first).

- [ ] **Step 1: Add the endpoint to `Backend/server.js`**

Find the end of the `GET /api/staff/:id` block (around line 468 — look for the closing `});` after `res.status(200).json(results[0])`). Insert the following block immediately after it:

```js
// Endpoint untuk padam staf dan akaun login berkaitan
app.delete('/api/staff/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    const staffId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Ambil user_id sebelum padam (untuk padam akaun login selepas)
        const [[staffRow]] = await connection.query(
            `SELECT user_id FROM staff WHERE id = ?`, [staffId]
        );
        if (!staffRow) {
            await connection.rollback();
            return res.status(404).json({ error: "Staf tidak dijumpai." });
        }

        // Padam rekod staff — FK CASCADE padam leaves, FK SET NULL nullkan tasks
        await connection.query(`DELETE FROM staff WHERE id = ?`, [staffId]);

        // Padam akaun login jika wujud
        if (staffRow.user_id) {
            await connection.query(`DELETE FROM users WHERE id = ?`, [staffRow.user_id]);
        }

        await connection.commit();
        res.status(200).json({ message: "Staf berjaya dipadam." });
    } catch (err) {
        await connection.rollback();
        console.error("Ralat DELETE /api/staff/:id:", err);
        res.status(500).json({ error: "Gagal memadam staf." });
    } finally {
        connection.release();
    }
});
```

- [ ] **Step 2: Verify the server starts without syntax errors**

Run from `Backend/`:
```bash
node -e "require('./server.js')" 2>&1 | head -5
```
Expected: either no output or the normal "Server running on port 5000" line (no `SyntaxError`).

If you see a syntax error, fix it before continuing.

- [ ] **Step 3: Smoke-test the endpoint manually**

With the backend server running (`node server.js` inside `Backend/`), open another terminal and run:

```bash
# First log in to get a token (replace credentials if different)
curl -s -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@1234"}' | grep -o '"token":"[^"]*"'
```

Copy the token value, then:
```bash
curl -s -X DELETE http://localhost:5000/api/staff/999 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```
Expected response: `{"error":"Staf tidak dijumpai."}` (404 — staff 999 does not exist, which proves the not-found guard works).

Do **not** delete a real staff row during testing — this verifies routing only.

- [ ] **Step 4: Commit**

```bash
git add Backend/server.js
git commit -m "feat: tambah endpoint DELETE /api/staff/:id untuk padam staf dan akaun login"
```

---

### Task 2: Frontend — confirmation flow in `DetailStaf.jsx`

**Files:**
- Modify: `Frontend/src/pages/manager/DetailStaf.jsx`

**Interfaces:**
- Consumes: `DELETE /api/staff/:id` from Task 1 — returns `{ message }` on 200, `{ error }` on 404/500
- Consumes: `id` from `useParams()` (already present in component)
- Consumes: `navigate` from `useNavigate()` (already present)
- Consumes: `axios` (already imported), `API_BASE_URL` (already imported)

**Current state of the button (line ~109–115 in `DetailStaf.jsx`):**
```jsx
<button 
  className="btn btn--secondary" 
  style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
  onClick={() => alert('Fungsi padam belum diaktifkan.')}
>
  Padam Staf
</button>
```

This button lives inside `<aside className="section-card" ...>`, inside the `<div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>` block.

- [ ] **Step 1: Add three new state declarations to the component**

Find the existing state declarations at the top of `DetailStaf()` (the block with `useState` calls). Add these three lines immediately after them:

```jsx
const [confirmDelete, setConfirmDelete] = useState(false);
const [isDeleting, setIsDeleting]       = useState(false);
const [deleteError, setDeleteError]     = useState(null);
```

- [ ] **Step 2: Add the `handleDelete` async function**

Find the `fetchStaffTasks` function definition inside the component. Add the following function **after** the closing `}` of `fetchStaffTasks`, before the `useEffect`:

```jsx
const handleDelete = async () => {
  try {
    setIsDeleting(true);
    setDeleteError(null);
    await axios.delete(`${API_BASE_URL}/api/staff/${id}`);
    navigate('/staf');
  } catch (err) {
    console.error('Ralat memadam staf:', err);
    setDeleteError('Gagal memadam staf. Sila cuba semula.');
    setIsDeleting(false);
    setConfirmDelete(false);
  }
};
```

- [ ] **Step 3: Replace the placeholder button with the confirmation flow**

Find and replace the entire button block inside the `<div style={{ width: '100%', marginTop: 'auto', ... }}>`:

**Before:**
```jsx
<div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
  <button 
    className="btn btn--secondary" 
    style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
    onClick={() => alert('Fungsi padam belum diaktifkan.')}
  >
    Padam Staf
  </button>
</div>
```

**After:**
```jsx
<div style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
  {deleteError && (
    <p style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px', textAlign: 'center' }}>
      {deleteError}
    </p>
  )}
  {confirmDelete ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600', margin: '0 0 4px', textAlign: 'center' }}>
        Anda pasti ingin memadam staf ini?
      </p>
      <button
        className="btn btn--secondary"
        style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Memadam...' : 'Ya, Padam Staf'}
      </button>
      <button
        className="btn btn--secondary"
        style={{ width: '100%' }}
        onClick={() => setConfirmDelete(false)}
        disabled={isDeleting}
      >
        Batal
      </button>
    </div>
  ) : (
    <button
      className="btn btn--secondary"
      style={{ width: '100%', color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
      onClick={() => setConfirmDelete(true)}
    >
      Padam Staf
    </button>
  )}
</div>
```

- [ ] **Step 4: Build the frontend to verify zero compile errors**

Run from `Frontend/`:
```bash
npm run build
```
Expected output ends with: `✓ built in X.XXs`

If you see a red error, read the error message, fix the syntax in `DetailStaf.jsx`, and re-run until the build is clean.

- [ ] **Step 5: Manual smoke test**

With both backend (`node server.js`) and frontend (`npm run dev`) running:
1. Log in as Manager
2. Navigate to `/staf`
3. Click any staff row to open the detail panel, then click "Lihat Profil" (or navigate directly to `/staf/<id>`)
4. On the detail page, click **Padam Staf** → button should transform to a "Anda pasti?" confirmation with two buttons
5. Click **Batal** → confirm the confirmation disappears and the original button is restored
6. Click **Padam Staf** again → click **Ya, Padam Staf** → confirm the page navigates back to `/staf` and the staff no longer appears in the list
7. Check MySQL: `SELECT * FROM staff WHERE id = <deleted_id>` should return empty; `SELECT * FROM leaves WHERE staff_id = <deleted_id>` should return empty; `SELECT assigned_staff_id FROM tasks WHERE assigned_staff_id = <deleted_id>` should return empty (nullified)

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/pages/manager/DetailStaf.jsx
git commit -m "feat: aktifkan butang Padam Staf dengan dialog pengesahan dan panggilan API"
```
