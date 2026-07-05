// src/pages/TempahanBaru.jsx
// ================================================================
// Halaman: Cipta Tempahan Baru
// Logik: useState untuk form state, axios.post untuk hantar data
// UI: Mengikut design system smarttask.css (korporat premium)
// ================================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsonLd from '../../components/JsonLd';
import { API_BASE_URL } from '../../config';

// ── Senarai item untuk dropdown ──
const JENIS_ITEM_OPTIONS = [
    { value: '', label: 'Pilih jenis item...' },
    { value: 'banner', label: 'Banner' },
    { value: 'bunting', label: 'Bunting' },
    { value: 'planner', label: 'Planner' },
    { value: 'buku_nota', label: 'Buku Nota' },
    { value: 'kad_bisnes', label: 'Kad Bisnes' },
    { value: 'flyer', label: 'Flyer / Risalah' },
    { value: 'brosur', label: 'Brosur' },
    { value: 'sticker', label: 'Sticker' },
    { value: 'backdrop', label: 'Backdrop / Standee' },
    { value: 'lain', label: 'Lain-lain' },
];

// ── Jenis tempahan (menentukan tugasan yang dijana oleh backend) ──
const JENIS_TEMPAHAN_OPTIONS = [
    { value: 'Design Only',      label: 'Design Sahaja',   desc: 'Pelanggan perlukan khidmat design sahaja — tempahan siap selepas design diluluskan.' },
    { value: 'Product Only',     label: 'Produk Sahaja',   desc: 'Pelanggan sudah ada design sendiri — lampirkan fail design; kerja bermula terus di Printing.' },
    { value: 'Design & Product', label: 'Design & Produk', desc: 'Syarikat uruskan design DAN penghasilan produk — aliran penuh dari Design hingga Delivery.' },
];

// ── State awal borang ──
const INITIAL_FORM = {
    namaKlien: '',
    jenisItem: '',
    jenisTempahan: 'Design & Product',
    kuantiti: '',
    harga: '',
    tarikhSiap: '',
    jenisHantar: 'internal',
    lokasiHantar: '',
    nota: '',
};

// ── Ikon SVG kecil ──
const SaveIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);
const BackIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);
const FormIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

// ================================================================
// KOMPONEN UTAMA
// ================================================================
export default function TempahanBaru() {
    const navigate = useNavigate();

    // ── Form state ──
    const [form, setForm] = useState(INITIAL_FORM);
    const [designFile, setDesignFile] = useState(null); // fail design pelanggan (Product Only)
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null); // { type: 'success'|'error', message: '' }
    const [errors, setErrors] = useState({});   // inline validation errors

    // ── Generic change handler ──
    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Buang error untuk field yang sedang diedit
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }

    // ── Validasi borang ──
    function validate() {
        const newErrors = {};
        if (!form.namaKlien.trim()) newErrors.namaKlien = 'Nama klien diperlukan.';
        if (!form.jenisItem) newErrors.jenisItem = 'Sila pilih jenis item.';
        if (!form.kuantiti || Number(form.kuantiti) < 1)
            newErrors.kuantiti = 'Kuantiti mesti lebih dari 0.';
        if (!form.harga || Number(form.harga) < 0)
            newErrors.harga = 'Sila masukkan harga yang sah.';
        if (!form.tarikhSiap) newErrors.tarikhSiap = 'Tarikh siap diperlukan.';
        if (!form.lokasiHantar.trim()) newErrors.lokasiHantar = 'Lokasi penghantaran diperlukan.';
        if (form.jenisTempahan === 'Product Only' && !designFile)
            newErrors.designFile = "Fail design pelanggan wajib dilampirkan untuk tempahan 'Produk Sahaja'.";
        return newErrors;
    }

    // ── Submit handler ──
    async function handleSubmit(e) {
        if (e) e.preventDefault();
        // Reset alert lama
        setAlert(null);

        // Validasi
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setAlert({ type: 'error', message: 'Sila lengkapkan semua medan yang diperlukan.' });
            return;
        }

        // Sediakan payload multipart (fail design pelanggan disertakan jika ada)
        const formData = new FormData();
        formData.append('namaKlien', form.namaKlien.trim());
        formData.append('jenisItem', form.jenisItem);
        formData.append('order_type', form.jenisTempahan);
        formData.append('kuantiti', Number(form.kuantiti));
        formData.append('harga', Number(form.harga));
        formData.append('tarikhSiap', form.tarikhSiap);
        formData.append('jenisHantar', form.jenisHantar);
        formData.append('lokasiHantar', form.lokasiHantar.trim());
        formData.append('nota', form.nota.trim());
        if (form.jenisTempahan === 'Product Only' && designFile) {
            formData.append('design_file', designFile);
        }

        try {
            setLoading(true);
            // ── Hantar ke API ──
            await axios.post(`${API_BASE_URL}/api/orders`, formData);

            // Berjaya
            setAlert({ type: 'success', message: 'Tempahan berjaya disimpan! Borang telah dikosongkan.' });
            setForm(INITIAL_FORM);
            setDesignFile(null);
            setErrors({});

            // Auto-navigate ke senarai tempahan selepas 2 saat (pilihan)
            // setTimeout(() => navigate('/tempahan'), 2000);

        } catch (err) {
            console.error('Ralat simpan tempahan:', err);
            const msg = err?.response?.data?.error
                ?? err?.response?.data?.message
                ?? err?.message
                ?? 'Ralat tidak diketahui. Sila cuba lagi.';
            setAlert({ type: 'error', message: `Gagal menyimpan tempahan: ${msg}` });
        } finally {
            setLoading(false);
        }
    }

    // ── Reset handler ──
    function handleReset() {
        setForm(INITIAL_FORM);
        setDesignFile(null);
        setErrors({});
        setAlert(null);
    }

    // ── JSON-LD Data ──
    const jsonLdData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Cipta Tempahan Baru - SmartTask",
        "description": "Borang untuk mencipta dan menambah tempahan pelanggan baharu ke dalam sistem.",
        "audience": {
          "@type": "Audience",
          "audienceType": "Administrators and Managers"
        },
        "about": {
          "@type": "Thing",
          "name": "Borang Tempahan Baru"
        }
    };

    // ── Render ──
    return (
        <div className="page-content">
            <JsonLd data={jsonLdData} />

            {/* ── Butang Kembali ── */}
            <button className="btn-back" onClick={() => navigate('/tempahan')}>
                <BackIcon />
                Kembali ke Senarai
            </button>

            {/* ── Page Header ── */}
            <header className="page-header">
                <h1 className="page-title">Cipta Tempahan Baru</h1>
                <p className="page-subtitle">Isi maklumat tempahan pelanggan dengan lengkap</p>
            </header>

            {/* ── Alert Banner ── */}
            {alert && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 18px',
                    borderRadius: 10,
                    marginBottom: 20,
                    fontSize: 13.5,
                    fontWeight: 500,
                    border: '1px solid',
                    ...(alert.type === 'success'
                        ? { background: '#F0FDF4', color: '#15803D', borderColor: '#86EFAC' }
                        : { background: '#FEF2F2', color: '#B91C1C', borderColor: '#FCA5A5' }
                    ),
                }}>
                    {alert.type === 'success' ? <CheckCircleIcon /> : <AlertIcon />}
                    <span>{alert.message}</span>
                    <button
                        onClick={() => setAlert(null)}
                        style={{
                            marginLeft: 'auto', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* ── Borang ── */}
            <section className="form-section" aria-label="Borang Tempahan">

                {/* Header biru korporat */}
                <div className="form-section-header">
                    <FormIcon />
                    <span className="form-section-title">Borang Tempahan</span>
                </div>

                {/* Body borang */}
                <div className="form-body">

                    {/* ── Baris 1: Nama Klien (full width) ── */}
                    <div style={{ marginBottom: 20 }}>
                        <div className="form-group">
                            <label className="form-label">
                                Nama Klien / Syarikat <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="namaKlien"
                                value={form.namaKlien}
                                onChange={handleChange}
                                placeholder="Contoh: SMK Jalan Reko, Public Bank HQ"
                                className="form-input"
                                style={errors.namaKlien ? { borderColor: '#EF4444' } : {}}
                            />
                            {errors.namaKlien && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.namaKlien}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Baris 1.5: Jenis Tempahan (menentukan aliran tugasan) ── */}
                    <div style={{ marginBottom: 20 }}>
                        <div className="form-group">
                            <label className="form-label">
                                Jenis Tempahan <span className="required">*</span>
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {JENIS_TEMPAHAN_OPTIONS.map(opt => (
                                    <label key={opt.value} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: form.jenisTempahan === opt.value
                                            ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                                        background: form.jenisTempahan === opt.value ? '#EFF6FF' : '#fff',
                                    }}>
                                        <input
                                            type="radio"
                                            name="jenisTempahan"
                                            value={opt.value}
                                            checked={form.jenisTempahan === opt.value}
                                            onChange={handleChange}
                                            style={{ marginTop: 3 }}
                                        />
                                        <span>
                                            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
                                                {opt.label}
                                            </span>
                                            <span style={{ display: 'block', fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                                {opt.desc}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Placeholder upload — muncul HANYA untuk 'Produk Sahaja' */}
                            {form.jenisTempahan === 'Product Only' && (
                                <div style={{
                                    marginTop: 10, padding: '14px 16px', borderRadius: 10,
                                    border: errors.designFile ? '1.5px dashed #EF4444' : '1.5px dashed #93C5FD',
                                    background: '#F8FAFC',
                                }}>
                                    <label className="form-label" style={{ marginBottom: 6 }}>
                                        Fail Design Pelanggan <span className="required">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={e => {
                                            setDesignFile(e.target.files?.[0] || null);
                                            if (errors.designFile) setErrors(prev => ({ ...prev, designFile: '' }));
                                        }}
                                        style={{ fontSize: 13 }}
                                    />
                                    <span style={{ display: 'block', fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
                                        {designFile
                                            ? `Dipilih: ${designFile.name}`
                                            : 'JPG, PNG atau PDF (maksimum 5MB) — design sedia ada daripada pelanggan.'}
                                    </span>
                                    {errors.designFile && (
                                        <span style={{ display: 'block', fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                            {errors.designFile}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Baris 2: Jenis Item + Kuantiti ── */}
                    <div className="form-grid-2" style={{ marginBottom: 20 }}>
                        <div className="form-group">
                            <label className="form-label">
                                Jenis Item <span className="required">*</span>
                            </label>
                            <select
                                name="jenisItem"
                                value={form.jenisItem}
                                onChange={handleChange}
                                className="form-select"
                                style={errors.jenisItem ? { borderColor: '#EF4444' } : {}}
                            >
                                {JENIS_ITEM_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.jenisItem && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.jenisItem}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Kuantiti (Unit) <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                name="kuantiti"
                                value={form.kuantiti}
                                onChange={handleChange}
                                placeholder="0"
                                min="1"
                                className="form-input"
                                style={errors.kuantiti ? { borderColor: '#EF4444' } : {}}
                            />
                            {errors.kuantiti && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.kuantiti}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Baris 3: Harga + Tarikh Siap ── */}
                    <div className="form-grid-2" style={{ marginBottom: 20 }}>
                        <div className="form-group">
                            <label className="form-label">
                                Harga (RM) <span className="required">*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: 13, top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: 13, color: '#94A3B8', fontWeight: 600,
                                    pointerEvents: 'none',
                                }}>
                                    RM
                                </span>
                                <input
                                    type="number"
                                    name="harga"
                                    value={form.harga}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="form-input"
                                    style={{
                                        paddingLeft: 40,
                                        ...(errors.harga ? { borderColor: '#EF4444' } : {}),
                                    }}
                                />
                            </div>
                            {errors.harga && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.harga}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Tarikh Siap (Due Date) <span className="required">*</span>
                            </label>
                            <input
                                type="date"
                                name="tarikhSiap"
                                value={form.tarikhSiap}
                                onChange={handleChange}
                                className="form-input"
                                min={new Date().toISOString().split('T')[0]}
                                style={errors.tarikhSiap ? { borderColor: '#EF4444' } : {}}
                            />
                            {errors.tarikhSiap && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.tarikhSiap}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Baris 4: Jenis Penghantaran + Lokasi ── */}
                    <div className="form-grid-2" style={{ marginBottom: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Jenis Penghantaran</label>
                            <div className="radio-group" style={{ paddingTop: 8 }}>
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="jenisHantar"
                                        value="internal"
                                        checked={form.jenisHantar === 'internal'}
                                        onChange={handleChange}
                                    />
                                    Internal (Staf Sendiri)
                                </label>
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="jenisHantar"
                                        value="external"
                                        checked={form.jenisHantar === 'external'}
                                        onChange={handleChange}
                                    />
                                    External (Poslaju / J&T)
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Lokasi Penghantaran <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="lokasiHantar"
                                value={form.lokasiHantar}
                                onChange={handleChange}
                                placeholder="Contoh: Bangi, Selangor"
                                className="form-input"
                                style={errors.lokasiHantar ? { borderColor: '#EF4444' } : {}}
                            />
                            {errors.lokasiHantar && (
                                <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    {errors.lokasiHantar}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Baris 5: Nota Tambahan (full width) ── */}
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Nota Tambahan / Spesifikasi</label>
                        <textarea
                            name="nota"
                            value={form.nota}
                            onChange={handleChange}
                            placeholder="Contoh: Material Tarpaulin 380gsm, Finishing Eyelet &amp; Tali, Saiz 10ft x 10ft..."
                            className="form-textarea"
                            rows={4}
                        />
                        <span style={{ fontSize: 11.5, color: '#CBD5E1', marginTop: 4 }}>
                            Opsional — maklumat tambahan untuk pasukan
                        </span>
                    </div>

                    {/* ── Butang Aksi ── */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={handleReset}
                            disabled={loading}
                        >
                            Kosongkan
                        </button>
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() => navigate('/tempahan')}
                            disabled={loading}
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ minWidth: 160 }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff', borderRadius: '50%',
                                        display: 'inline-block',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    Menyimpan…
                                </>
                            ) : (
                                <>
                                    <SaveIcon />
                                    Simpan Tempahan
                                </>
                            )}
                        </button>
                    </div>

                </div>
                {/* akhir form-body */}
            </section>
            {/* akhir form-section */}

            {/* Spinner keyframe */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        </div>
    );
}