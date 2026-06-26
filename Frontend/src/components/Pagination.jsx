import React from 'react';

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 32, height: 32, padding: '0 8px',
  fontSize: 13, fontWeight: 500, borderRadius: 7,
  border: '1px solid #E2E8F0', cursor: 'pointer',
  fontFamily: 'inherit', lineHeight: 1,
  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
};

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [1];
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    pages.push(i);
  }
  if (page < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ total, page, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);
  const nums = getPageNumbers(page, totalPages);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', borderTop: '1px solid #F1F5F9',
      background: '#FAFBFD', flexWrap: 'wrap', gap: 10,
    }}>
      <span style={{ fontSize: 12, color: '#64748B' }}>
        Menunjukkan <strong>{from}</strong>–<strong>{to}</strong> daripada <strong>{total}</strong> rekod
      </span>

      <div style={{ display: 'flex', gap: 4 }}>
        {/* Prev */}
        <button
          style={{
            ...btnBase,
            background: page === 1 ? '#F8FAFC' : '#fff',
            color: page === 1 ? '#CBD5E1' : '#374151',
          }}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelum"
        >
          ‹
        </button>

        {nums.map((num, i) =>
          num === '...' ? (
            <span key={`e${i}`} style={{ ...btnBase, border: 'none', background: 'none', color: '#94A3B8', cursor: 'default' }}>
              …
            </span>
          ) : (
            <button
              key={num}
              style={{
                ...btnBase,
                background: num === page ? '#1E293B' : '#fff',
                color:      num === page ? '#fff'     : '#374151',
                borderColor: num === page ? '#1E293B' : '#E2E8F0',
                fontWeight: num === page ? 700 : 500,
              }}
              onClick={() => onChange(num)}
              aria-current={num === page ? 'page' : undefined}
            >
              {num}
            </button>
          )
        )}

        {/* Next */}
        <button
          style={{
            ...btnBase,
            background: page === totalPages ? '#F8FAFC' : '#fff',
            color: page === totalPages ? '#CBD5E1' : '#374151',
          }}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Halaman seterusnya"
        >
          ›
        </button>
      </div>
    </div>
  );
}
