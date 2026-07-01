import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, UserPlus, ShoppingCart, Trash2, Package, Plus, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { type Item } from '../types';

interface Supplier { id: number; name: string; telephone: string; email?: string | null; address?: string | null; }
interface Location { id: number; name: string; type: string; }
interface GRNRow {
  itemId: number; name: string; code: string; requiresSerial: boolean;
  quantity: number; costPrice: number; wholesalePrice: number; retailPrice: number;
  warrantyPeriod: string; serials: string[]; serialInputText: string;
}

// ── shared style atoms ────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid var(--border-color)',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border-color)', background: 'var(--border-color)',
  fontSize: 12, color: 'var(--text-main)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 5,
};

export default function GRNManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [grnRows, setGrnRows] = useState<GRNRow[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [warrantyPeriod, setWarrantyPeriod] = useState('1 Year');
  const [serialInputText, setSerialInputText] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (selectedItemId) {
      const item = items.find(i => i.id === parseInt(selectedItemId));
      if (item) {
        setCostPrice(item.cost.toString());
        setWholesalePrice(item.wholesalePrice.toString());
        setRetailPrice(item.retailPrice.toString());
        setWarrantyPeriod(item.warrantyPeriod);
      }
    } else {
      setCostPrice(''); setWholesalePrice(''); setRetailPrice('');
    }
    setSerialInputText('');
  }, [selectedItemId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sap_pos_token');
      const h = { 'Authorization': `Bearer ${token}` };
      const [supRes, locRes, itemsData] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/suppliers', { headers: h }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', { headers: h }),
        api.items.list(),
      ]);
      const supData = await supRes.json();
      const locData = await locRes.json();
      setSuppliers(supData);
      const mains = locData.filter((l: Location) => l.type === 'MAIN');
      setLocations(mains);
      if (mains.length > 0) setLocationId(mains[0].id.toString());
      setItems(itemsData);
    } catch (err: any) { setError('Failed to load: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) { setError('Name and Phone are required.'); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` },
        body: JSON.stringify({ name: supName, telephone: supPhone, email: supEmail, address: supAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuppliers([...suppliers, data]);
      setSupplierId(data.id.toString());
      setIsSupplierModalOpen(false);
      setSupName(''); setSupPhone(''); setSupEmail(''); setSupAddress('');
      setSuccess('Supplier registered!'); setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAddItemRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !costPrice || !retailPrice || !wholesalePrice || !quantity) {
      setError('All item fields are required.'); return;
    }
    const item = items.find(i => i.id === parseInt(selectedItemId));
    if (!item) return;
    const qty = parseInt(quantity);
    let parsedSerials: string[] = [];
    if (item.requiresSerial) {
      if (!serialInputText.trim()) { setError(`Serial numbers required for ${item.name}`); return; }
      parsedSerials = serialInputText.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (parsedSerials.length !== qty) { setError(`Need exactly ${qty} serial(s). Found ${parsedSerials.length}`); return; }
      
      // Prevent duplicates in the current input
      if (new Set(parsedSerials).size !== parsedSerials.length) {
        setError('Duplicate serial numbers detected in your input.'); return;
      }
      
      // Prevent duplicates against other rows in the same GRN
      const existingSerials = new Set(grnRows.flatMap(r => r.serials || []));
      const duplicate = parsedSerials.find(s => existingSerials.has(s));
      if (duplicate) {
        setError(`Serial number "${duplicate}" is already added in another row.`); return;
      }
    }
    setGrnRows([...grnRows, {
      itemId: item.id, name: item.name, code: item.code, requiresSerial: item.requiresSerial,
      quantity: qty, costPrice: parseFloat(costPrice) || 0,
      wholesalePrice: parseFloat(wholesalePrice) || 0, retailPrice: parseFloat(retailPrice) || 0,
      warrantyPeriod, serials: parsedSerials, serialInputText,
    }]);
    setError(null);
    setSelectedItemId(''); setQuantity('1'); setSerialInputText('');
  };

  const handleSubmitGRN = async () => {
    if (!supplierId || !locationId) { setError('Supplier and destination are required.'); return; }
    if (grnRows.length === 0) { setError('Add at least one product row.'); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` },
        body: JSON.stringify({
          supplierId: parseInt(supplierId), locationId: parseInt(locationId),
          receivedDate, billDate, notes,
          grnItems: grnRows.map(r => ({
            itemId: r.itemId, quantity: r.quantity, costPrice: r.costPrice,
            wholesalePrice: r.wholesalePrice, retailPrice: r.retailPrice,
            serials: r.requiresSerial ? r.serials : undefined, warrantyPeriod: r.warrantyPeriod,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(`GRN ${data.grnNumber} submitted successfully!`);
      setGrnRows([]); setNotes('');
      const updated = await api.items.list(); setItems(updated);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const selectedItem = items.find(i => i.id === parseInt(selectedItemId));
  const totalCost = grnRows.reduce((s, r) => s + r.costPrice * r.quantity, 0);
  const totalUnits = grnRows.reduce((s, r) => s + r.quantity, 0);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

      {/* ══════ LEFT COLUMN ══════ */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── GRN Header & Add Product (Combined Card) ── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart style={{ width: 17, height: 17, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bg-card)' }}>New Goods Received Note (GRN)</h2>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Stock inbound from supplier to branch</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Supplier */}
            <div>
              <label style={lbl}>Select Supplier *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ ...inp, flex: 1, cursor: 'pointer' }}>
                  <option value="">Choose Supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.telephone})</option>)}
                </select>
                <button onClick={() => setIsSupplierModalOpen(true)} type="button"
                  style={{ padding: '10px 13px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                >
                  <UserPlus style={{ width: 13, height: 13 }} /> New
                </button>
              </div>
            </div>
            {/* Location */}
            <div>
              <label style={lbl}>Target Branch Location *</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {/* Dates */}
            <div>
              <label style={lbl}>Received Date *</label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Supplier Bill Date *</label>
              <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} style={inp} />
            </div>
          </div>

          {/* ── Add Product Row (Integrated) ── */}
          <div style={{ borderTop: '1px dashed var(--border-color)', padding: '16px 20px', background: !supplierId ? 'var(--border-color)' : 'var(--bg-card)', position: 'relative' }}>
            {!supplierId && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ background: 'var(--text-main)', color: 'var(--bg-card)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  Select a supplier first to add stock
                </p>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.3)' }}>
                <Plus style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>Add Product Row</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)' }}>Select item and enter pricing for this delivery</p>
              </div>
            </div>

            <form onSubmit={handleAddItemRow} style={{ opacity: !supplierId ? 0.4 : 1, pointerEvents: !supplierId ? 'none' : 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Item select */}
                <div>
                  <label style={lbl}>Item Catalog *</label>
                  <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">Select item…</option>
                    {items.filter(i => i.type === 'PRODUCT').map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Cost Price (LKR) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={costPrice} onChange={e => setCostPrice(e.target.value)} style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>Wholesale (LKR) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>Retail (LKR) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label style={lbl}>Quantity *</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Warranty Period</label>
                  <select value={warrantyPeriod} onChange={e => setWarrantyPeriod(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years', '5 Years'].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                {/* Pricing margin preview */}
                {costPrice && retailPrice && (
                  <div style={{ background: 'rgba(124,58,237,0.06)', borderRadius: 10, padding: '8px 12px', border: '1.5px solid rgba(124,58,237,0.15)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 9, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>Margin</p>
                    <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace' }}>
                      {(((parseFloat(retailPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'var(--bg-card)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, height: 42 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Add Row
                </button>
              </div>

              {/* Serial numbers input */}
              {selectedItem?.requiresSerial && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#fef3c7', borderRadius: 10, border: '1.5px solid #fcd34d' }}>
                  <label style={{ ...lbl, color: '#92400e', marginBottom: 6 }}>
                    ⚠ Serial Numbers — enter exactly {quantity} comma-separated *
                  </label>
                  <input type="text" placeholder="e.g. SN-001, SN-002, SN-003"
                    value={serialInputText} onChange={e => setSerialInputText(e.target.value)}
                    style={{ ...inp, fontFamily: 'monospace', background: '#fffbeb', borderColor: '#fcd34d' }} />
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ── GRN Rows table ── */}
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.3)' }}>
                <Package style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>GRN Document Details</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)' }}>{grnRows.length} product line(s) added</p>
              </div>
            </div>
            {grnRows.length > 0 && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: 12, fontWeight: 700 }}>
                {totalUnits} units · LKR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {grnRows.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, color: 'var(--text-light)' }}>
              <Package style={{ width: 40, height: 40, marginBottom: 10, strokeWidth: 1 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>No rows added yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-light)' }}>Use the form above to add products</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {['Product', 'Cost Price', 'Qty', 'Wholesale', 'Retail', 'Margin', 'Subtotal', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: ['Subtotal'].includes(h) ? 'right' : ['Qty'].includes(h) ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grnRows.map((row, idx) => {
                    const margin = ((row.retailPrice - row.costPrice) / row.costPrice * 100).toFixed(1);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)' }}>
                        <td style={{ padding: '10px 10px' }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{row.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-light)', fontFamily: 'monospace' }}>{row.code}</p>
                          {row.requiresSerial && (
                            <p style={{ margin: '2px 0 0', fontSize: 9, color: '#0d9488', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              S/N: {row.serials.join(', ')}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          LKR {row.costPrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{row.quantity}</td>
                        <td style={{ padding: '10px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>LKR {row.wholesalePrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>LKR {row.retailPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: parseFloat(margin) > 20 ? '#059669' : '#f59e0b', background: parseFloat(margin) > 20 ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', padding: '2px 7px', borderRadius: 6 }}>
                            {margin}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#7c3aed', whiteSpace: 'nowrap' }}>
                          LKR {(row.costPrice * row.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                          <button onClick={() => setGrnRows(grnRows.filter((_, i) => i !== idx))}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = 'var(--bg-card)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                          ><Trash2 style={{ width: 12, height: 12 }} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════ RIGHT COLUMN ══════ */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* GRN Totals Summary */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText style={{ width: 17, height: 17, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--bg-card)' }}>GRN Invoice Totals</h3>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Review before submitting</p>
            </div>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Product Lines', value: `${grnRows.length}`, icon: '📦' },
                { label: 'Total Units', value: `${totalUnits}`, icon: '🔢' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--border-color)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 18 }}>{stat.icon}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'monospace' }}>{stat.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Supplier / Location */}
            {supplierId && (
              <div style={{ background: 'rgba(124,58,237,0.05)', borderRadius: 10, padding: '10px 12px', border: '1.5px solid rgba(124,58,237,0.15)' }}>
                <p style={{ margin: 0, fontSize: 9, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>Supplier</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>
                  {suppliers.find(s => s.id.toString() === supplierId)?.name || '—'}
                </p>
              </div>
            )}

            <div style={{ height: 1, background: 'linear-gradient(90deg,#06996933,#04785733,#06996933)' }} />

            {/* Grand total */}
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Billing Cost</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--text-light)' }}>Sum of all cost × qty</p>
              </div>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#059669', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                LKR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label style={lbl}>Receipt Notes / Remarks</label>
              <textarea placeholder="Supplier invoice ref, PO number, delivery details…" rows={3}
                value={notes} onChange={e => setNotes(e.target.value)}
                style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
            </div>

            {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>{error}</div>}
            {success && (
              <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#16a34a', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> {success}
              </div>
            )}

            <button onClick={handleSubmitGRN}
              disabled={grnRows.length === 0 || loading || !supplierId}
              style={{ width: '100%', padding: '13px', background: (grnRows.length === 0 || !supplierId) ? 'var(--border-color)' : 'linear-gradient(135deg,#059669,#047857)', color: (grnRows.length === 0 || !supplierId) ? 'var(--text-light)' : 'var(--bg-card)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: (grnRows.length === 0 || !supplierId) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: grnRows.length > 0 && supplierId ? '0 6px 20px rgba(5,150,105,0.35)' : 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (grnRows.length > 0 && supplierId) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <FileText style={{ width: 16, height: 16 }} />
              {loading ? 'Submitting…' : 'Finalize Goods Received Note'}
            </button>
          </div>
        </div>

        {/* Margin guide card */}
        <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #ddd6fe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingUp style={{ width: 15, height: 15, color: '#7c3aed' }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>Margin Guide</p>
          </div>
          {[
            { range: '> 40%', label: 'Excellent', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
            { range: '20–40%', label: 'Good', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
            { range: '10–20%', label: 'Acceptable', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { range: '< 10%', label: 'Low Risk', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          ].map(m => (
            <div key={m.range} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.range}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: m.color, background: m.bg, padding: '2px 8px', borderRadius: 5 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ SUPPLIER MODAL ══════ */}
      {isSupplierModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus style={{ width: 16, height: 16, color: 'var(--bg-card)' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bg-card)' }}>Register New Supplier</h3>
              </div>
              <button onClick={() => setIsSupplierModalOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--bg-card)' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Supplier Name *</label><input type="text" required placeholder="e.g. Dell Lanka Distributors" value={supName} onChange={e => setSupName(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Telephone *</label><input type="text" required placeholder="e.g. 0112459812" value={supPhone} onChange={e => setSupPhone(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Email Address</label><input type="email" placeholder="e.g. sales@dell.lk" value={supEmail} onChange={e => setSupEmail(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Physical Address</label><textarea placeholder="e.g. 45 Galle Road, Colombo 03" rows={2} value={supAddress} onChange={e => setSupAddress(e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
                  {loading ? 'Saving…' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
