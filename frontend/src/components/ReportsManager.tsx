import React, { useState, useEffect } from 'react';
import {
  BarChart2, Award, ArrowRightLeft, TrendingUp, Package, Search,
  RefreshCw, Calendar, Filter, AlertTriangle, CheckCircle2,
  DollarSign, ShoppingCart, Layers, FileText
} from 'lucide-react';

interface StockSummary { totalQuantity: number; totalCostVal: number; totalWholesaleVal: number; totalRetailVal: number; }
interface StockRecord { stockId: number; location: string; locationType: string; itemId: number; itemCode: string; itemName: string; quantity: number; cost: number; wholesalePrice: number; retailPrice: number; totalCostValue: number; totalWholesaleValue: number; totalRetailValue: number; }
interface WarrantyResult { serialNumber: string; itemCode: string; itemName: string; status: 'IN_STOCK' | 'SOLD'; purchaseDate: string; supplierName: string; location: string; warrantyAvailability: 'Active' | 'Expired' | 'Active (Unsold)' | 'Expired (Unsold)'; warrantyExpiry: string | null; saleDetails?: { invoiceNumber: string; soldDate: string; customerName: string; customerPhone: string; cashier: string; warrantyPeriod: string; } | null; }
interface TransferRecord { id: number; date: string; fromLocation: { name: string }; toLocation: { name: string }; reason: string; cashier: { username: string }; transferItems: { item: { name: string; code: string }; quantity: number; serialNumbers?: string | null; }[]; }
interface ProfitSummary { totalRevenue: number; totalCogs: number; totalProfit: number; }
interface ProfitRecord { id: number; invoiceNumber: string; date: string; location: string; customer: string; cashier: string; revenue: number; cogs: number; profit: number; }

// ── style atoms ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: '#ffffff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4' };
const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 12, color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 };
const th: React.CSSProperties = { padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #f1f5f9' };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 12, color: '#334155', borderBottom: '1px solid #f8fafc' };

type ReportTab = 'stock' | 'warranty' | 'transfers' | 'profit';

const TABS: { id: ReportTab; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'stock',     label: 'Stock in Hand',          icon: <Package style={{ width: 14, height: 14 }} />,      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  { id: 'warranty',  label: 'Warranty Lookup',         icon: <Award style={{ width: 14, height: 14 }} />,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'transfers', label: 'Transfers Log',           icon: <ArrowRightLeft style={{ width: 14, height: 14 }} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { id: 'profit',    label: 'Profit & Revenue',        icon: <TrendingUp style={{ width: 14, height: 14 }} />,   color: '#059669', bg: 'rgba(5,150,105,0.1)' },
];

export default function ReportsManager() {
  const [activeTab, setActiveTab] = useState<ReportTab>('stock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [selectedLocId, setSelectedLocId] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [serialQuery, setSerialQuery] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<WarrantyResult | null>(null);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [profitRecords, setProfitRecords] = useState<ProfitRecord[]>([]);

  const auth = () => ({ 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` });

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { loadReportData(); }, [activeTab, selectedLocId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/pos/locations', { headers: auth() });
      setLocations(await res.json());
    } catch { }
  };

  const loadReportData = () => {
    setError(null);
    if (activeTab === 'stock') fetchStockReport();
    else if (activeTab === 'transfers') fetchTransfersReport();
    else if (activeTab === 'profit') fetchProfitReport();
  };

  const fetchStockReport = async () => {
    try {
      setLoading(true);
      const q = selectedLocId ? `?locationId=${selectedLocId}` : '';
      const res = await fetch(`http://localhost:5000/api/reports/stock-in-hand${q}`, { headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStockSummary(data.summary); setStockRecords(data.records);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchTransfersReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/reports/transfers?startDate=${startDate}&endDate=${endDate}`, { headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransferRecords(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchProfitReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/reports/profit-viewer?startDate=${startDate}&endDate=${endDate}`, { headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfitSummary(data.summary); setProfitRecords(data.records);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleWarrantySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialQuery.trim()) return;
    try {
      setLoading(true); setError(null); setWarrantyResult(null);
      const res = await fetch(`http://localhost:5000/api/reports/warranty-search?serial=${serialQuery}`, { headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWarrantyResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const profitMargin = profitSummary && profitSummary.totalRevenue > 0
    ? ((profitSummary.totalProfit / profitSummary.totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* ── Top control bar ── */}
      <div style={{ ...card, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setError(null); setWarrantyResult(null); setSerialQuery(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${active ? tab.color : '#e2e8f0'}`, background: active ? tab.bg : '#f8fafc', color: active ? tab.color : '#64748b', fontSize: 12, fontWeight: active ? 800 : 600, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = tab.color; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {activeTab === 'stock' && (
              <>
                <Filter style={{ width: 14, height: 14, color: '#94a3b8' }} />
                <select value={selectedLocId} onChange={e => setSelectedLocId(e.target.value)}
                  style={{ ...inp, width: 180 }}>
                  <option value="">All Locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </>
            )}
            {(activeTab === 'transfers' || activeTab === 'profit') && (
              <>
                <Calendar style={{ width: 14, height: 14, color: '#94a3b8' }} />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inp, width: 140 }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inp, width: 140 }} />
                <button onClick={loadReportData}
                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(124,58,237,0.3)', whiteSpace: 'nowrap' }}>
                  <RefreshCw style={{ width: 13, height: 13 }} /> Apply
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ════ 1. STOCK IN HAND ════ */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stat cards */}
          {stockSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Product Lines', value: `${stockRecords.length}`, sub: 'unique SKUs', icon: <Layers style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#7c3aed, #4f46e5', glow: 'rgba(124,58,237,0.3)' },
                { label: 'Total Cost Value', value: `LKR ${(stockSummary.totalCostVal / 1000).toFixed(1)}K`, sub: 'at purchase price', icon: <DollarSign style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#f59e0b, #d97706', glow: 'rgba(245,158,11,0.3)' },
                { label: 'Wholesale Value', value: `LKR ${(stockSummary.totalWholesaleVal / 1000).toFixed(1)}K`, sub: 'at wholesale price', icon: <ShoppingCart style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#06b6d4, #0891b2', glow: 'rgba(6,182,212,0.3)' },
                { label: 'Retail Value', value: `LKR ${(stockSummary.totalRetailVal / 1000).toFixed(1)}K`, sub: 'at retail price', icon: <TrendingUp style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#059669, #047857', glow: 'rgba(5,150,105,0.3)' },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${s.grad})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${s.glow}` }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 900, color: '#1e293b', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 9, color: '#cbd5e1' }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.3)' }}>
                <BarChart2 style={{ width: 15, height: 15, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>Inventory Balances Report</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{stockRecords.length} records{selectedLocId ? ` · filtered` : ' · all locations'}</p>
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>Loading report…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead><tr>
                    {['Location', 'SKU', 'Product', 'Qty', 'Cost', 'Wholesale', 'Retail', 'Total Cost', 'Total Retail'].map((h, i) => (
                      <th key={h} style={{ ...th, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {stockRecords.length > 0 ? stockRecords.map((r, idx) => (
                      <tr key={r.stockId} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                        <td style={{ ...td }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: r.locationType === 'MAIN' ? 'rgba(124,58,237,0.08)' : 'rgba(16,185,129,0.08)', color: r.locationType === 'MAIN' ? '#7c3aed' : '#059669' }}>{r.location}</span>
                        </td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>{r.itemCode}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#1e293b' }}>{r.itemName}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: r.quantity > 5 ? '#059669' : r.quantity > 0 ? '#f59e0b' : '#ef4444' }}>{r.quantity}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>LKR {r.cost.toFixed(2)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>LKR {r.wholesalePrice.toFixed(2)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>LKR {r.retailPrice.toFixed(2)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>LKR {r.totalCostValue.toFixed(2)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>LKR {r.totalRetailValue.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={9} style={{ ...td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No stock records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ 2. WARRANTY LOOKUP ════ */}
      {activeTab === 'warranty' && (
        <div style={{ display: 'flex', gap: 14 }}>

          {/* Search panel */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search style={{ width: 15, height: 15, color: '#fff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Warranty Tracker</h3>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Serial number lookup</p>
                </div>
              </div>
              <form onSubmit={handleWarrantySearch} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Serial Number *</label>
                  <input type="text" required placeholder="e.g. DELL-XPS-98612"
                    value={serialQuery} onChange={e => setSerialQuery(e.target.value)}
                    style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <button type="submit" disabled={loading || !serialQuery.trim()}
                  style={{ padding: '10px', borderRadius: 10, border: 'none', background: (!serialQuery.trim() || loading) ? '#e2e8f0' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: (!serialQuery.trim() || loading) ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 13, cursor: (!serialQuery.trim() || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <Search style={{ width: 14, height: 14 }} /> {loading ? 'Searching…' : 'Search Lifecycle'}
                </button>

                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1.5px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#92400e', lineHeight: 1.6 }}>
                    Enter any serial number to trace its full lifecycle: GRN receipt → stock location → customer sale → warranty status.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Result panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...card, overflow: 'hidden', minHeight: 300 }}>
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award style={{ width: 15, height: 15, color: '#fff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Lifecycle Record</h3>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
                    {warrantyResult ? `S/N: ${warrantyResult.serialNumber}` : 'Awaiting lookup'}
                  </p>
                </div>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {!warrantyResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, color: '#cbd5e1' }}>
                    <Award style={{ width: 40, height: 40, marginBottom: 10, strokeWidth: 1 }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>No result yet</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cbd5e1' }}>Search a serial number to see its full history</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Left */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e8ecf4' }}>
                        <p style={{ margin: '0 0 4px', ...lbl }}>Serial Number</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace' }}>{warrantyResult.serialNumber}</p>
                      </div>
                      <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e8ecf4' }}>
                        <p style={{ margin: '0 0 4px', ...lbl }}>Product</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{warrantyResult.itemName}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>SKU: {warrantyResult.itemCode}</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e8ecf4' }}>
                          <p style={{ margin: '0 0 4px', ...lbl }}>Location</p>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{warrantyResult.location}</p>
                        </div>
                        <div style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${warrantyResult.status === 'SOLD' ? '#fca5a5' : '#86efac'}`, background: warrantyResult.status === 'SOLD' ? '#fef2f2' : '#f0fdf4' }}>
                          <p style={{ margin: '0 0 4px', ...lbl, color: warrantyResult.status === 'SOLD' ? '#dc2626' : '#059669' }}>Status</p>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: warrantyResult.status === 'SOLD' ? '#dc2626' : '#059669' }}>
                            {warrantyResult.status === 'SOLD' ? 'SOLD / OUT' : 'IN STORE'}
                          </p>
                        </div>
                      </div>
                      {/* Warranty badge */}
                      <div style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${warrantyResult.warrantyAvailability.includes('Active') ? '#86efac' : '#fca5a5'}`, background: warrantyResult.warrantyAvailability.includes('Active') ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: warrantyResult.warrantyAvailability.includes('Active') ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px ${warrantyResult.warrantyAvailability.includes('Active') ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
                          <Award style={{ width: 18, height: 18, color: '#fff' }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Warranty Status</p>
                          <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 900, color: warrantyResult.warrantyAvailability.includes('Active') ? '#059669' : '#dc2626' }}>{warrantyResult.warrantyAvailability}</p>
                          {warrantyResult.warrantyExpiry && (
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>Expires: {new Date(warrantyResult.warrantyExpiry).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Right */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ padding: '14px 16px', background: 'rgba(124,58,237,0.05)', borderRadius: 12, border: '1.5px solid rgba(124,58,237,0.15)' }}>
                        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GRN Registry Data</p>
                        {[
                          { label: 'Supplier', value: warrantyResult.supplierName },
                          { label: 'Received Date', value: new Date(warrantyResult.purchaseDate).toLocaleDateString() },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{r.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>

                      {warrantyResult.saleDetails ? (
                        <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.04)', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.2)', flex: 1 }}>
                          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer Invoice</p>
                          {[
                            { label: 'Invoice #', value: warrantyResult.saleDetails.invoiceNumber },
                            { label: 'Sale Date', value: new Date(warrantyResult.saleDetails.soldDate).toLocaleDateString() },
                            { label: 'Customer', value: warrantyResult.saleDetails.customerName },
                            { label: 'Phone', value: warrantyResult.saleDetails.customerPhone },
                            { label: 'Cashier', value: warrantyResult.saleDetails.cashier },
                            { label: 'Warranty', value: warrantyResult.saleDetails.warrantyPeriod },
                          ].map(r => (
                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(239,68,68,0.08)' }}>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{r.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', fontFamily: r.label === 'Invoice #' ? 'monospace' : 'inherit' }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '1.5px dashed #e2e8f0', borderRadius: 12, textAlign: 'center' }}>
                          <CheckCircle2 style={{ width: 28, height: 28, color: '#10b981', marginBottom: 8 }} />
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#059669' }}>Unsold — In Stock</p>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>No sales history recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ 3. TRANSFERS LOG ════ */}
      {activeTab === 'transfers' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0e7490,#0891b2)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Stock Transfers Log</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{transferRecords.length} transfers · {startDate} to {endDate}</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>Loading transfers…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead><tr>
                  {['Date & Time', 'From → To', 'Cashier', 'Items', 'Qty', 'Serials', 'Reason'].map((h, i) => (
                    <th key={h} style={{ ...th, textAlign: i >= 4 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {transferRecords.length > 0 ? transferRecords.map((rec, idx) => (
                    <tr key={rec.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(rec.date).toLocaleString()}</td>
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', padding: '2px 7px', borderRadius: 5 }}>{rec.fromLocation.name}</span>
                          <ArrowRightLeft style={{ width: 12, height: 12, color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,0.08)', padding: '2px 7px', borderRadius: 5 }}>{rec.toLocation.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, fontSize: 11, fontWeight: 600 }}>{rec.cashier.username}</td>
                      <td style={{ ...td }}>
                        {rec.transferItems.map((ti, i) => (
                          <p key={i} style={{ margin: '1px 0', fontSize: 11, fontWeight: 700, color: '#334155' }}>
                            {ti.item.name} <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 400, fontSize: 10 }}>({ti.item.code})</span>
                          </p>
                        ))}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {rec.transferItems.map((ti, i) => (
                          <p key={i} style={{ margin: '1px 0', fontSize: 13, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>{ti.quantity}</p>
                        ))}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {rec.transferItems.map((ti, i) => (
                          <p key={i} title={ti.serialNumbers || ''} style={{ margin: '1px 0', fontSize: 10, fontFamily: 'monospace', color: '#7c3aed', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ti.serialNumbers || '—'}</p>
                        ))}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: '#64748b', fontStyle: 'italic', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.reason}>{rec.reason}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No transfers in this date range.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════ 4. PROFIT & REVENUE ════ */}
      {activeTab === 'profit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profitSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Total Revenue', value: `LKR ${(profitSummary.totalRevenue / 1000).toFixed(1)}K`, full: `LKR ${profitSummary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: <DollarSign style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#7c3aed, #4f46e5', glow: 'rgba(124,58,237,0.3)' },
                { label: 'Cost of Goods (COGS)', value: `LKR ${(profitSummary.totalCogs / 1000).toFixed(1)}K`, full: `LKR ${profitSummary.totalCogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: <ShoppingCart style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#f59e0b, #d97706', glow: 'rgba(245,158,11,0.3)' },
                { label: 'Net Profit', value: `LKR ${(profitSummary.totalProfit / 1000).toFixed(1)}K`, full: `LKR ${profitSummary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: <TrendingUp style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#059669, #047857', glow: 'rgba(5,150,105,0.3)' },
                { label: 'Profit Margin', value: `${profitMargin}%`, full: `${profitMargin}% of revenue`, icon: <BarChart2 style={{ width: 18, height: 18, color: '#fff' }} />, grad: '#06b6d4, #0891b2', glow: 'rgba(6,182,212,0.3)' },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }} title={s.full}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${s.grad})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${s.glow}` }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 900, color: '#1e293b', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 9, color: '#cbd5e1' }}>{startDate} to {endDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Profit bar visual */}
          {profitSummary && profitSummary.totalRevenue > 0 && (
            <div style={{ ...card, padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#64748b' }}>Revenue Breakdown</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{profitMargin}% profit margin</p>
              </div>
              <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(profitSummary.totalCogs / profitSummary.totalRevenue) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius: '6px 0 0 6px', transition: 'width 0.5s ease' }} title={`COGS: ${(profitSummary.totalCogs / profitSummary.totalRevenue * 100).toFixed(1)}%`} />
                <div style={{ flex: 1, background: 'linear-gradient(90deg,#059669,#047857)', borderRadius: '0 6px 6px 0', transition: 'width 0.5s ease' }} title={`Profit: ${profitMargin}%`} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>COGS ({(profitSummary.totalCogs / profitSummary.totalRevenue * 100).toFixed(1)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#059669' }} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>Net Profit ({profitMargin}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Profit table */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 15, height: 15, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Profitability Ledger</h3>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{profitRecords.length} invoices · {startDate} to {endDate}</p>
              </div>
            </div>
            <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>Loading profit data…</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead><tr>
                    {['Invoice', 'Date', 'Location', 'Customer', 'Cashier', 'Revenue', 'COGS', 'Net Profit'].map((h, i) => (
                      <th key={h} style={{ ...th, textAlign: i >= 5 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {profitRecords.length > 0 ? profitRecords.map((rec, idx) => (
                      <tr key={rec.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                        <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: 11 }}>{rec.invoiceNumber}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(rec.date).toLocaleDateString()}</td>
                        <td style={{ ...td, fontSize: 11 }}>{rec.location}</td>
                        <td style={{ ...td, fontSize: 11, fontWeight: 600 }}>{rec.customer}</td>
                        <td style={{ ...td, fontSize: 11 }}>{rec.cashier}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#1e293b', fontWeight: 700 }}>LKR {rec.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>LKR {rec.cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>
                          <span style={{ color: rec.profit >= 0 ? '#059669' : '#dc2626', background: rec.profit >= 0 ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 9px', borderRadius: 6 }}>
                            LKR {rec.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No sales data in this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
