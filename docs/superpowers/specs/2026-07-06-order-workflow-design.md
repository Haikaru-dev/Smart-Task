# Spec: Aliran Kerja Tempahan Berperingkat + Jenis Tempahan + Kemasan UI

Tarikh: 2026-07-06 · Status: **Dilaksanakan & disahkan** (jest 169/169; ujian live 21/21; build lulus)
Sumber keperluan: sesi brainstorming pengguna + carta alir `C:\SmartTask\workflow.jpg`.
Pelan implementasi yang diluluskan: `~/.claude/plans/mutable-napping-cocoa.md` (kandungan sama seperti ringkasan di bawah).

## Keputusan reka bentuk (dipersetujui / lalai dimaklumkan)

| Keputusan | Pilihan |
|---|---|
| AI suggestions | KEKAL, tetapi stage-gated (bukan dibuang) — dipersetujui pengguna |
| Penolakan hantaran | Admin boleh tolak DENGAN sebab; staf baiki & hantar semula — dipersetujui |
| Badge/loceng | Kedua-duanya dibuang (badge '1' Layout + loceng StaffLayout) — dipersetujui |
| Rekod hantaran | `tasks.status='Submitted'` + `rejection_reason` (bukan jadual sejarah) — lalai, tiada bantahan |
| UI kelulusan | JanaanJadual (seksyen "Menunggu Kelulusan") DAN modal Tempahan — lalai |
| Sidebar boleh-lipat | Kedua-dua portal, pilihan dikongsi `localStorage` — lalai |
| Delivery external | Tugasan Delivery wujud tetapi DIKECUALIKAN daripada kolam agihan; admin "Tandakan Siap" — lalai, selaras carta |

## Model data

- `orders.order_type` ENUM('Design Only','Product Only','Design & Product') DEFAULT 'Design & Product'
- `orders.design_file_path` VARCHAR(255) NULL — fail design pelanggan (Product Only), `/uploads/orders/`
- `tasks.status` +`'Submitted'`; `tasks.rejection_reason` TEXT NULL
- Pembetulan bonus: ENUM `orders.status` DB tempatan tiada `'Cancelled'` — diselaraskan
- Migrasi: `Backend/migrations/add_order_workflow.sql` (+ `schema.sql` diselaraskan)

## Aliran (ikut workflow.jpg)

Peringkat: Design → Printing → Packing → Delivery (subset ikut order_type; Product Only mula di Printing).
Setiap peringkat: agih (AI/RR/manual, HANYA peringkat aktif) → admin sahkan tugasan → staf buat & **hantar** (`Submitted`, dikunci) → admin semak: lulus → `Completed` (peringkat seterusnya terbuka) / tolak+sebab → `In Progress` (gelung). Delivery external: admin sahkan sendiri. Order siap bila SEMUA tugasan `Completed`; Design Only siap selepas Design diluluskan.

Status order automatik (`syncOrderStatus`, 7 titik panggilan): Pending → In Progress (≥1 tugasan Confirmed+diagih) → Completed (semua Completed) / Cancelled (butang Batalkan; padam semua tugasan). Dropdown manual + `PATCH /api/orders/:id/status` dibuang; `POST /api/orders/:id/terminate` menggantikannya.

## Endpoint baharu/berubah

- `POST /api/orders` — multipart, `order_type`, tugasan bersyarat, fail wajib untuk Product Only
- `POST /api/orders/:id/terminate` — baharu (Manager)
- `PATCH /api/tasks/:id/review` — baharu (Manager): approve/reject+reason
- `PATCH /api/tasks/:id/complete-delivery` — baharu (Manager): Delivery external
- `PATCH /api/tasks/:id/status` — staf: ALLOWED tanpa 'Completed'; kunci Submitted/Completed
- `isTaskAssignable()` menapis kolam auto-assign & generate-schedule; `validateAssignment()` +gerbang peringkat +Delivery external

## UI

- TempahanBaru: pemilih jenis (3 kad) + upload bersyarat (Product Only)
- Tempahan: timeline visual + baris tugasan per-peringkat (Lulus/Tolak/Tandakan Siap) + Batalkan Tempahan
- JanaanJadual: seksyen "Menunggu Kelulusan" + lajur kanban ke-4
- TugasanStaf: "Hantar Tugasan", sebab penolakan, pautan design pelanggan, kunci selepas hantar
- Kemasan: KPI Cuti → /staf; badge '1' + loceng dibuang; sidebar boleh-lipat kedua-dua portal

## Rujukan penuh

`NEW_ARCHITECTURE.md` §5.3/§5.4 (skema), §6 (endpoint), §10.5 (aliran), §11 (AI), §12 #16 (bukti ujian), §13 (UI).
