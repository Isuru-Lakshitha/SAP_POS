import { useState, useEffect } from 'react';
import { Layers, Package, AlertTriangle, RefreshCw, BarChart2 } from 'lucide-react';

interface TechnicianStockProps {
  currentUser: { id: number; username: string; locationId?: number | null } | null;
}
interface StockEntry {
  id: number; itemId: number; locationId: number; quantity: number;
  item: { code: string; name: string; requiresSerial: boolean; };
}
interface SerialEntry {
  id: number; serialNumber: string;
  item: { code: string; name: string; };
}

// ── shared style atoms ────────────────────────────────────────────────────────
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4',
  ...extra,
});

export default function TechnicianStock({ currentUser }: TechnicianStockProps) {
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [serials, setSerials] = useState<SerialEntry[]>([]);
  const [locationName, setLocationName] = useState('Technician Stock');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.locationId) fetchTechnicianStock(currentUser.locationId);
    else setError('No location assigned. Please contact Admin.');
  }, [currentUser]);

  const fetchTechnicianStock = async (locId: number) => {
    try {
      setLoading(true); setError(null);
      const h = { 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` };
      const [stockRes, locRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pos/locations/${locId}/stock`, { headers: h }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', { headers: h }),
      ]);
      const data = await stockRes.json();
      if (!stockRes.ok) throw new Error(data.error || 'Failed to load stock.');
      setStocks(data.stocks || []);
      setSerials(data.serials || []);
      const locsData = await locRes.json();
      const loc = locsData.find((l: any) => l.id === locId);
      if (loc) setLocationName(loc.name);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totalUnits = stocks.reduce((s, st) => s + st.quantity, 0);
  const lowStock = stocks.filter(st => st.quantity > 0 && st.quantity <= 2).length;
  const outOfStock = stocks.filter(st => st.quantity === 0).length;

  const stockColor = (qty: number) =>
    qty > 3 ? '#059669' : qty > 0 ? '#f59e0b' : '#ef4444';
  const stockBg = (qty: number) =>
    qty > 3 ? 'rgba(5,150,105,0.1)' : qty > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

      {/* ══════ LEFT COLUMN ══════ */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header card */}
        <div style={{ ...card(), overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package style={{ width: 17, height: 17, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bg-card)' }}>My Stock Ledger</h2>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{locationName}</p>
              </div>
            </div>
            <button onClick={() => currentUser?.locationId && fetchTechnicianStock(currentUser.locationId)}
              disabled={loading}
              style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'var(--bg-card)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
            {[
              { label: 'Total Units', value: totalUnits, color: '#7c3aed', icon: '📦' },
              { label: 'Low Stock', value: lowStock, color: '#f59e0b', icon: '⚠️' },
              { label: 'Out of Stock', value: outOfStock, color: '#ef4444', icon: '🚫' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '14px 18px', textAlign: 'center', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                <p style={{ margin: 0, fontSize: 20 }}>{s.icon}</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stock table */}
        <div style={{ ...card(), padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.3)' }}>
              <BarChart2 style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>Product Inventory</h3>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)' }}>{stocks.length} product line(s) in bag</p>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} /> {error}
            </div>
          )}

          {stocks.length === 0 && !error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#cbd5e1' }}>
              <Package style={{ width: 40, height: 40, marginBottom: 10, strokeWidth: 1 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>No stock assigned</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cbd5e1' }}>Contact Admin to transfer stock to your bag</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {['SKU', 'Item Name', 'Serial Req.', 'Qty In-Hand'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Qty In-Hand' ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((st, idx) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)' }}>
                      <td style={{ padding: '11px 12px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>{st.item.code}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{st.item.name}</td>
                      <td style={{ padding: '11px 12px' }}>
                        {st.item.requiresSerial ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '3px 8px', borderRadius: 5 }}>Yes — Scan needed</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: stockColor(st.quantity), background: stockBg(st.quantity) }}>
                          {st.quantity} Units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════ RIGHT COLUMN — Serials ══════ */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ ...card(), overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers style={{ width: 16, height: 16, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--bg-card)' }}>Serial Numbers</h3>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{serials.length} assigned to your bag</p>
            </div>
          </div>

          {/* Info note */}
          <div style={{ margin: '14px 16px 0', padding: '10px 12px', background: 'rgba(124,58,237,0.05)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              These serials are in your technician bag. Select them when billing an outdoor customer job.
            </p>
          </div>

          <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
            {serials.length > 0 ? serials.map(s => (
              <div key={s.id} style={{ padding: '10px 12px', background: 'var(--border-color)', borderRadius: 10, border: '1.5px solid #e8ecf4', display: 'flex', flexDirection: 'column', gap: 3, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.background = 'var(--border-color)'; }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#7c3aed', letterSpacing: '0.04em' }}>{s.serialNumber}</span>
                <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 500 }}>{s.item.name}</span>
                <span style={{ fontSize: 9, color: '#cbd5e1', fontFamily: 'monospace' }}>{s.item.code}</span>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, color: '#cbd5e1', border: '1.5px dashed #e2e8f0', borderRadius: 10, padding: 20 }}>
                <Layers style={{ width: 28, height: 28, marginBottom: 8, strokeWidth: 1 }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-light)' }}>No serialized items</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>Transfer stock from Admin to see serials here</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick legend */}
        <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #ddd6fe' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Level Guide</p>
          {[
            { dot: '#059669', label: '> 3 units — Good' },
            { dot: '#f59e0b', label: '1–2 units — Low' },
            { dot: '#ef4444', label: '0 units — Out' },
          ].map(g => (
            <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#475569' }}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
