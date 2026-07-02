# Design: Full Verification Audit of NEW_ARCHITECTURE.md

**Date:** 2026-07-02
**Status:** Approved (approach 1 — section-by-section sweep)

## Goal

Re-verify every checkable claim in `NEW_ARCHITECTURE.md` against the **current
working tree** (HEAD `4443080` + 11 uncommitted modified files + untracked
`Frontend/src/hooks/`), then correct the document in place so it remains the
single source of truth. **No code fixes this session** — fixes are planned
separately afterwards.

## Why

`NEW_ARCHITECTURE.md` was verified against commit `4443080`, but the working
tree has since diverged (11 modified files, new hooks folder). The document
itself proved that stale docs cause wasted work (§0.2). Before acting on its
§12 issue list, every claim must be re-confirmed against what the code says
*today*.

## Inputs (ground truth, read in full)

- `Backend/schema.sql`, `Backend/server.js`, `Backend/middleware/auth.js`,
  `Backend/db.js`, `Backend/package.json`, `Backend/seed.js`,
  `Backend/tests/login.test.js`
- `Frontend/package.json`, `Frontend/src/App.jsx`, `Frontend/src/main.jsx`
- The 11 uncommitted files: `Layout.jsx`, `StaffLayout.jsx`, `Cuti.jsx`,
  `Dashboard.jsx`, `DetailStaf.jsx`, `JanaanJadual.jsx`, `SenaraiStaf.jsx`,
  `Tempahan.jsx`, `CutiStaf.jsx`, `TugasanStaf.jsx`, `smarttask.css`
- Untracked `Frontend/src/hooks/` (contents unknown — must be inventoried)

## Process

Walk NEW_ARCHITECTURE.md section by section; the doc is its own checklist.
For each claim, locate evidence in code (file:line) and mark it one of:

- **Confirmed** — claim matches code; no doc change.
- **Corrected** — claim no longer matches; fix the doc text.
- **Changed by working tree** — uncommitted changes fixed/introduced
  something; update statuses and note it.

Section order and key checks:

1. **§2 Tech stack** — versions vs both `package.json` files.
2. **§3/§3.1 Architecture & auth** — server.js line count, JWT flow,
   interceptor in `main.jsx`, JWT_SECRET fallback in all 3 claimed files.
3. **§5 Schema** — every table/column/ENUM/FK vs `schema.sql`.
4. **§6 API routes** — enumerate all routes in `server.js`; confirm the count
   (doc says 31), each guard (`verifyToken`/`requireRole`), and the claimed
   absences (no `PUT/PATCH /api/orders/:id`, no `GET /api/orders/:id`,
   no full `PUT /api/staff/:id`).
5. **§7–§9 F1–F6, UC-01–11, NFR statuses** — re-derive each ✅/⚠️/❌ from code.
6. **§11 AI engine** — stages vs `auto-assign` handler (verify, do not touch).
7. **§12 Issues #1–#11** — re-verify each at its cited location. Explicitly
   check whether uncommitted changes affect: #2 (`TugasanStaf.jsx` notes →
   does FormData now send notes?), #4 (`INSERT INTO Orders` casing), #9
   (dead CSS in `smarttask.css`), #8 (orphan `PengurusanCuti.jsx` still
   unrouted?). Each issue outcome: kept / closed / re-prioritized / reworded.
   New issues found during the sweep are appended with priority.
8. **§13 Frontend structure** — file tree vs reality; add `hooks/` folder;
   re-check "built" vs "not yet built" feature lists (e.g. sidebar profile
   dropdown — do the uncommitted `Layout.jsx` changes add it?).
9. **§14 Env/config** — `db.js` variable names, `.env.example`, `.gitignore`.

## Output

- `NEW_ARCHITECTURE.md` corrected **in place**, in Malay, preserving its
  structure and tone. Verification stamp updated: today's date + note that it
  now reflects the working tree (uncommitted state), not just HEAD.
- English chat summary listing every correction: claim → what code shows →
  what was changed in the doc.

## Not in scope

- Any code changes (even one-line fixes like #4).
- Rewriting `CLAUDE.md` (§12 #11 — separate follow-up).
- Committing `NEW_ARCHITECTURE.md` or the user's working-tree changes
  (user decides; only this spec file gets committed).

## Error handling

- If a file the doc references does not exist, record it as a correction,
  not a failure.
- If working-tree code is ambiguous (e.g. half-finished feature in the
  uncommitted diff), describe the observed state factually in the doc and
  flag it in the chat summary rather than guessing intent.

## Testing / verification of the audit itself

Spot-check discipline: every Corrected entry must cite file:line evidence in
the chat summary. No claim gets flipped on memory or inference alone.
