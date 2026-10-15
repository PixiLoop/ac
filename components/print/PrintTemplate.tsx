'use client';

import { COMPANY } from '../../lib/company-config';

export type PrintTemplateVariant = 'template1' | 'template2';

interface PrintTemplateProps {
  variant?: PrintTemplateVariant;
  docType: string;
  docNumber: string;
  status?: string;
  statusColor?: { bg: string; color: string };
  reference?: string;
  issuedAt?: string;
  dueDate?: string;
  badges?: { label: string; value: string }[];
  billTo?: { name?: string; address1?: string; city?: string; state?: string; postcode?: string };
  shipTo?: { name?: string; address1?: string; city?: string; state?: string; postcode?: string };
  columns: { label: string; align?: 'left' | 'right' | 'center'; width?: number }[];
  rows: React.ReactNode[][];
  totals?: { label: string; value: string; bold?: boolean; color?: string; topBorder?: boolean; bg?: string }[];
  notes?: string;
  footerNote?: string;
  children?: React.ReactNode;
}

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '48px 40px',
};

const PAGE_STYLE_PRINT: string = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1a1a1a; }
  @media print {
    .no-print { display: none !important; }
    body { margin: 0; }
    #print-page { padding: 24px !important; }
  }
`;

// ── Template 1: Classic Blue ──
function Template1({ props }: { props: PrintTemplateProps }) {
  const { docType, docNumber, status, statusColor, reference, issuedAt, dueDate,
    badges, billTo, shipTo, columns, rows, totals, notes, footerNote } = props;

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-AU') : '—';

  return (
    <>
      <style>{`
        ${PAGE_STYLE_PRINT}
        body { font-family: Arial, sans-serif; }
      `}</style>

      <div id="print-page" style={PAGE_STYLE}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <img
              src="/Logo2.png"
              alt={COMPANY.name}
              style={{ height: 48, marginBottom: 12, objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8', letterSpacing: 1 }}>{docType}</h1>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{docNumber}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>{COMPANY.name}</p>
            {COMPANY.abn && <p style={{ color: '#64748b', fontSize: 12 }}>ABN: {COMPANY.abn}</p>}
            <p>{COMPANY.address}</p>
            <p>{COMPANY.phone}</p>
            <p style={{ color: '#1d4ed8' }}>{COMPANY.email}</p>
            {COMPANY.website && <p style={{ color: '#64748b' }}>{COMPANY.website}</p>}
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 2, background: '#1d4ed8', marginBottom: 28, borderRadius: 2 }} />

        {/* ADDRESSES + DATES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To</p>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{billTo?.name}</p>
            {billTo?.address1 && <p style={{ color: '#555', fontSize: 13 }}>{billTo.address1}</p>}
            <p style={{ color: '#555', fontSize: 13 }}>{[billTo?.city, billTo?.state, billTo?.postcode].filter(Boolean).join(', ')}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ship To</p>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{shipTo?.name}</p>
            {shipTo?.address1 && <p style={{ color: '#555', fontSize: 13 }}>{shipTo.address1}</p>}
            <p style={{ color: '#555', fontSize: 13 }}>{[shipTo?.city, shipTo?.state, shipTo?.postcode].filter(Boolean).join(', ')}</p>
          </div>
          <div style={{ fontSize: 13 }}>
            {issuedAt && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Issue Date</p>
                <p style={{ fontWeight: 600 }}>{fmtDate(issuedAt)}</p>
              </div>
            )}
            {dueDate && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Due Date</p>
                <p style={{ fontWeight: 700, color: '#dc2626' }}>{fmtDate(dueDate)}</p>
              </div>
            )}
            {reference && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Reference</p>
                <p>{reference}</p>
              </div>
            )}
          </div>
        </div>

        {/* STATUS + BADGES */}
        {(status || badges?.length) && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {status && statusColor && (
              <span style={{ background: statusColor.bg, color: statusColor.color, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                {status.replace(/_/g, ' ')}
              </span>
            )}
            {badges?.map((b, i) => (
              <span key={i} style={{ color: '#64748b', fontSize: 12 }}>
                {b.label}: <strong>{b.value}</strong>
              </span>
            ))}
          </div>
        )}

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#1d4ed8' }}>
              {columns.map((col, i) => (
                <th key={i} style={{
                  padding: '9px 12px', color: 'white', fontSize: 11, fontWeight: 700,
                  textAlign: col.align ?? (i === 0 ? 'left' : 'right'),
                  width: col.width,
                }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '8px 12px', fontSize: 13,
                    textAlign: columns[ci]?.align ?? (ci === 0 ? 'left' : 'right'),
                    fontWeight: ci === row.length - 1 ? 600 : 400,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No items</td></tr>
            )}
          </tbody>
        </table>

        {/* TOTALS */}
        {totals && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <table style={{ width: 300, borderCollapse: 'collapse' }}>
              <tbody>
                {totals.map((t, i) => (
                  <tr key={i} style={{ borderTop: t.topBorder ? '2px solid #1d4ed8' : undefined, borderBottom: '1px solid #f1f5f9', background: t.bg }}>
                    <td style={{ padding: t.bold ? '10px' : '5px 10px', color: t.color ?? '#555', fontSize: t.bold ? 15 : 13, fontWeight: t.bold ? 700 : 400 }}>{t.label}</td>
                    <td style={{ padding: t.bold ? '10px' : '5px 10px', textAlign: 'right', color: t.color ?? undefined, fontSize: t.bold ? 15 : 13, fontWeight: t.bold ? 700 : 400 }}>{t.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NOTES */}
        {notes && (
          <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #1d4ed8', marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notes</p>
            <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <p>{COMPANY.name} | ABN: {COMPANY.abn}</p>
            <p>{COMPANY.address} | {COMPANY.phone} | {COMPANY.email}</p>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            {footerNote ?? 'Thank you for your business.'}
          </p>
        </div>

      </div>
    </>
  );
}

// ── Template 2: Dark Header ──
function Template2({ props }: { props: PrintTemplateProps }) {
  const { docType, docNumber, status, statusColor, reference, issuedAt, dueDate,
    badges, billTo, shipTo, columns, rows, totals, notes, footerNote } = props;

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-AU') : '—';

  return (
    <>
      <style>{`
        ${PAGE_STYLE_PRINT}
        body { font-family: 'Helvetica Neue', Arial, sans-serif; }
      `}</style>

      <div id="print-page" style={PAGE_STYLE}>

        {/* HEADER — dark band */}
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '24px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <img
              src="/Logo2.png"
              alt={COMPANY.name}
              style={{ height: 40, marginBottom: 8, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p style={{ color: '#94a3b8', fontSize: 12 }}>{COMPANY.address}</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>{COMPANY.phone} | {COMPANY.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: 2 }}>{docType}</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{docNumber}</p>
            {COMPANY.abn && <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>ABN: {COMPANY.abn}</p>}
          </div>
        </div>

        {/* ADDRESSES + DATES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, borderBottom: '2px solid #0f172a', paddingBottom: 4 }}>Bill To</p>
            <p style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{billTo?.name}</p>
            {billTo?.address1 && <p style={{ color: '#555', fontSize: 13 }}>{billTo.address1}</p>}
            <p style={{ color: '#555', fontSize: 13 }}>{[billTo?.city, billTo?.state, billTo?.postcode].filter(Boolean).join(', ')}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, borderBottom: '2px solid #0f172a', paddingBottom: 4 }}>Ship To</p>
            <p style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{shipTo?.name}</p>
            {shipTo?.address1 && <p style={{ color: '#555', fontSize: 13 }}>{shipTo.address1}</p>}
            <p style={{ color: '#555', fontSize: 13 }}>{[shipTo?.city, shipTo?.state, shipTo?.postcode].filter(Boolean).join(', ')}</p>
          </div>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, borderBottom: '2px solid #0f172a', paddingBottom: 4 }}>Details</p>
            {issuedAt && <p style={{ marginTop: 6 }}><span style={{ color: '#94a3b8' }}>Issue Date: </span><strong>{fmtDate(issuedAt)}</strong></p>}
            {dueDate && <p><span style={{ color: '#94a3b8' }}>Due Date: </span><strong style={{ color: '#dc2626' }}>{fmtDate(dueDate)}</strong></p>}
            {reference && <p><span style={{ color: '#94a3b8' }}>Reference: </span><strong>{reference}</strong></p>}
          </div>
        </div>

        {/* STATUS + BADGES */}
        {(status || badges?.length) && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {status && statusColor && (
              <span style={{ background: statusColor.bg, color: statusColor.color, padding: '3px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                {status.replace(/_/g, ' ')}
              </span>
            )}
            {badges?.map((b, i) => (
              <span key={i} style={{ color: '#64748b', fontSize: 12 }}>{b.label}: <strong>{b.value}</strong></span>
            ))}
          </div>
        )}

        {/* TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {columns.map((col, i) => (
                <th key={i} style={{
                  padding: '9px 12px', color: 'white', fontSize: 11, fontWeight: 700,
                  textAlign: col.align ?? (i === 0 ? 'left' : 'right'),
                  width: col.width,
                }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '8px 12px', fontSize: 13,
                    textAlign: columns[ci]?.align ?? (ci === 0 ? 'left' : 'right'),
                    fontWeight: ci === row.length - 1 ? 600 : 400,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>No items</td></tr>
            )}
          </tbody>
        </table>

        {/* TOTALS */}
        {totals && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <table style={{ width: 300, borderCollapse: 'collapse' }}>
              <tbody>
                {totals.map((t, i) => (
                  <tr key={i} style={{ borderTop: t.topBorder ? '2px solid #0f172a' : undefined, borderBottom: '1px solid #f1f5f9', background: t.bg }}>
                    <td style={{ padding: t.bold ? '10px' : '5px 10px', color: t.color ?? '#555', fontSize: t.bold ? 15 : 13, fontWeight: t.bold ? 700 : 400 }}>{t.label}</td>
                    <td style={{ padding: t.bold ? '10px' : '5px 10px', textAlign: 'right', color: t.color, fontSize: t.bold ? 15 : 13, fontWeight: t.bold ? 700 : 400 }}>{t.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NOTES */}
        {notes && (
          <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #0f172a', marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notes</p>
            <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <p>{COMPANY.name} | ABN: {COMPANY.abn}</p>
            <p>{COMPANY.address} | {COMPANY.phone} | {COMPANY.email}</p>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
            {footerNote ?? 'Thank you for your business.'}
          </p>
        </div>

      </div>
    </>
  );
}

// ── Main Export ──
export function PrintTemplate(props: PrintTemplateProps & { variant?: PrintTemplateVariant }) {
  const { variant = 'template1', ...rest } = props;
  if (variant === 'template2') return <Template2 props={rest} />;
  return <Template1 props={rest} />;
}