import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle2, Package, RefreshCw, MapPin, AlertTriangle, Plus, Trash2, Building2, Wrench, X } from 'lucide-react';
import { type Item } from '../types';

interface Location { id: number; name: string; type: 'MAIN' | 'SUB_TECHNICIAN'; }
interface StockEntry { id: number; itemId: number; locationId: number; quantity: number; item: Item; }
interface SerialEntry { id: number; serialNumber: string; itemId: number; locationId: number; status: string; item: Item; }

// ── shared style atoms ────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: 'var(--border-color)',
  fontSize: 12, color: 'var(--text-main)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 5,
};

export default function LocationManager({ currentUser }: { currentUser?: { role: string } | null }) {
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<number | null>(null);
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [serials, setSerials] = useState<SerialEntry[]>([]);

  // Transfer form
  const [fromLocId, setFromLocId] = useState('');
  const [toLocId, setToLocId] = useState('');
  const [transferItemId, setTransferItemId] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferReason, setTransferReason] = useState('');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [sourceSerials, setSourceSerials] = useState<SerialEntry[]>([]);
  const [sourceStocks, setSourceStocks] = useState<StockEntry[]>([]);

  // Add Location modal
  const [isAddLocOpen, setIsAddLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState<'MAIN' | 'SUB_TECHNICIAN'>('MAIN');

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [forceDeletePrompt, setForceDeletePrompt] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { if (selectedLocId) fetchLocationStock(selectedLocId); }, [selectedLocId]);
  useEffect(() => {
    if (fromLocId) fetchSourceStock(parseInt(fromLocId));
    else { setSourceStocks([]); setSourceSerials([]); }
    setTransferItemId(''); setSelectedSerials([]);
  }, [fromLocId]);

  const auth = () => ({ 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` });

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', { headers: auth() });
      const data = await res.json();
      setLocations(data);
      if (data.length > 0 && !selectedLocId) setSelectedLocId(data[0].id);
    } catch (err: any) { setError('Failed to load: ' + err.message); }
    finally { setLoading(false); }
  };

  const fetchLocationStock = async (locId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pos/locations/${locId}/stock`, { headers: auth() });
      const data = await res.json();
      setStocks(data.stocks || []); setSerials(data.serials || []);
    } catch (err: any) { console.error(err); }
  };

  const fetchSourceStock = async (locId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pos/locations/${locId}/stock`, { headers: auth() });
      const data = await res.json();
      setSourceStocks(data.stocks || []); setSourceSerials(data.serials || []);
    } catch (err: any) { console.error(err); }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) { setError('Location name is required.'); return; }
    try {
      setLocLoading(true); setError(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ name: newLocName.trim(), type: newLocType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create location');
      setLocations(prev => [...prev, data]);
      setSelectedLocId(data.id);
      setIsAddLocOpen(false);
      setNewLocName(''); setNewLocType('MAIN');
      setSuccess(`Location "${data.name}" created!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setLocLoading(false); }
  };

  const handleDeleteLocation = async (locId: number, force: boolean = false) => {
    try {
      if (force) {
        // Download full JSON backup first
        setSuccess('Downloading full system backup before force deletion...');
        try {
          const backupRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system/backup`, { headers: auth() });
          if (backupRes.ok) {
            const blob = await backupRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sappos_full_backup_${new Date().getTime()}.json`;
            a.click();
          }
        } catch (e) {
          console.error("Backup failed", e);
          if (!window.confirm("Backup failed to download. Proceed with permanent deletion anyway?")) {
            setLocLoading(false);
            setSuccess(null);
            return;
          }
        }
      }

      setLocLoading(true); setError(null); setSuccess(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pos/locations/${locId}${force ? '?force=true' : ''}`, {
        method: 'DELETE', headers: auth(),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400 && data.error.includes('has stock') && isSuperAdmin && !force) {
          // Change the modal state to ask for force delete
          setForceDeletePrompt(locId);
          setLocLoading(false);
          return;
        }
        throw new Error(data.error || 'Delete failed');
      }
      
      setLocations(prev => prev.filter(l => l.id !== locId));
      if (selectedLocId === locId) {
        const remaining = locations.filter(l => l.id !== locId);
        setSelectedLocId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeleteConfirmId(null);
      setForceDeletePrompt(null);
      setSuccess('Location deleted successfully.'); setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { setError(err.message); setDeleteConfirmId(null); setForceDeletePrompt(null); }
    finally { setLocLoading(false); }
  };

  const handleSerialCheckbox = (sNum: string) => {
    setSelectedSerials(prev =>
      prev.includes(sNum) ? prev.filter(s => s !== sNum) : [...prev, sNum]
    );
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocId || !toLocId || !transferItemId || !transferQty || !transferReason) {
      setError('All fields are required.'); return;
    }
    if (fromLocId === toLocId) { setError('Source and destination cannot be the same.'); return; }
    const item = sourceStocks.find(s => s.itemId === parseInt(transferItemId))?.item;
    const qty = parseInt(transferQty);
    if (item?.requiresSerial && selectedSerials.length !== qty) {
      setError(`Select exactly ${qty} serial(s). Currently: ${selectedSerials.length}`); return;
    }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({
          fromLocationId: parseInt(fromLocId), toLocationId: parseInt(toLocId),
          reason: transferReason,
          items: [{ itemId: parseInt(transferItemId), quantity: qty, serials: selectedSerials.length > 0 ? selectedSerials : undefined }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      setSuccess('Stock transferred successfully!');
      setTransferQty('1'); setTransferReason(''); setSelectedSerials([]);
      setFromLocId(''); setToLocId('');
      if (selectedLocId) fetchLocationStock(selectedLocId);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const selectedLocation = locations.find(l => l.id === selectedLocId);
  const selectedTransferItem = sourceStocks.find(s => s.itemId === parseInt(transferItemId))?.item;
  const filteredSourceSerials = sourceSerials.filter(s => s.itemId === parseInt(transferItemId));
  const availableQty = sourceStocks.find(s => s.itemId === parseInt(transferItemId))?.quantity || 0;

  const branches = locations.filter(l => l.type === 'MAIN');
  const technicians = locations.filter(l => l.type === 'SUB_TECHNICIAN');

  const stockColor = (qty: number) => qty > 5 ? '#059669' : qty > 0 ? '#f59e0b' : '#ef4444';
  const stockBg = (qty: number) => qty > 5 ? 'rgba(5,150,105,0.1)' : qty > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

      {/* ══════ COL 1 — Location List ══════ */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--bg-card)' }}>Locations</h3>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{locations.length} total</p>
              </div>
            </div>
            <button onClick={() => { setIsAddLocOpen(true); setError(null); }}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-card)', flexShrink: 0 }}
              title="Add New Location"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.28)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
            >
              <Plus style={{ width: 15, height: 15 }} />
            </button>
          </div>

          <div style={{ padding: '12px' }}>
            {/* Branches section */}
            {branches.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Building2 style={{ width: 11, height: 11, color: '#7c3aed' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Branches</span>
                </div>
                {branches.map(loc => renderLocationBtn(loc))}
              </>
            )}

            {/* Technicians section */}
            {technicians.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: branches.length > 0 ? 12 : 0 }}>
                  <Wrench style={{ width: 11, height: 11, color: '#10b981' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Technicians</span>
                </div>
                {technicians.map(loc => renderLocationBtn(loc))}
              </>
            )}

            {locations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-light)', fontSize: 12 }}>
                No locations yet.<br />Click <strong>+</strong> to add one.
              </div>
            )}

            {/* Add location CTA */}
            <button onClick={() => { setIsAddLocOpen(true); setError(null); }}
              style={{ width: '100%', marginTop: 10, padding: '9px', borderRadius: 10, border: '1.5px dashed #c4b5fd', background: 'rgba(124,58,237,0.04)', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.09)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)'; }}
            >
              <Plus style={{ width: 13, height: 13 }} /> Add Location
            </button>
          </div>
        </div>

        {/* Success/error for location ops */}
        {success && (
          <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, color: '#16a34a', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
            <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} /> {success}
          </div>
        )}
      </div>

      {/* ══════ COL 2 — Stock Viewer ══════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#059669,#047857)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--bg-card)' }}>
                  {selectedLocation ? `Stock: ${selectedLocation.name}` : 'Location Stock'}
                </h3>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
                  {stocks.length} items · {serials.length} serials
                </p>
              </div>
            </div>
            <button onClick={() => selectedLocId && fetchLocationStock(selectedLocId)} disabled={loading}
              style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'var(--bg-card)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
            </button>
          </div>

          <div style={{ padding: '14px 18px' }}>
            {!selectedLocation ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, color: '#cbd5e1' }}>
                <MapPin style={{ width: 32, height: 32, marginBottom: 8, strokeWidth: 1 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>Select a location</p>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 8px', ...lbl }}>Item Inventory</p>
                {stocks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                    {stocks.map(st => (
                      <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--border-color)', borderRadius: 10, border: '1.5px solid #e8ecf4' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{st.item.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-light)', fontFamily: 'monospace' }}>{st.item.code}</p>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: stockColor(st.quantity), background: stockBg(st.quantity), padding: '4px 12px', borderRadius: 20 }}>
                          {st.quantity} Units
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: 12, border: '1.5px dashed #e2e8f0', borderRadius: 10, marginBottom: 16 }}>
                    No stock at this location.
                  </div>
                )}

                {serials.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 8px', ...lbl }}>Available Serial Numbers</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                      {serials.map(s => (
                        <div key={s.id} style={{ padding: '7px 10px', background: 'var(--border-color)', borderRadius: 8, border: '1.5px solid #e8ecf4', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{s.serialNumber}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════ COL 3 — Transfer Form ══════ */}
      <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--bg-card)' }}>Transfer Stock</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Move inventory between locations</p>
            </div>
          </div>

          <form onSubmit={handleTransfer} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {(fromLocId || toLocId) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(124,58,237,0.05)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 9, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>From</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: 'var(--text-main)' }}>
                    {fromLocId ? (locations.find(l => l.id.toString() === fromLocId)?.name || '—') : '—'}
                  </p>
                </div>
                <ArrowRightLeft style={{ width: 18, height: 18, color: '#7c3aed', flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 9, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>To</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: 'var(--text-main)' }}>
                    {toLocId ? (locations.find(l => l.id.toString() === toLocId)?.name || '—') : '—'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label style={lbl}>Source Location *</label>
              <select value={fromLocId} onChange={e => setFromLocId(e.target.value)} required style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Select source…</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type === 'MAIN' ? 'Branch' : 'Tech'})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Destination Location *</label>
              <select value={toLocId} onChange={e => setToLocId(e.target.value)} required style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Select destination…</option>
                {locations.filter(l => l.id.toString() !== fromLocId).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type === 'MAIN' ? 'Branch' : 'Tech'})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Select Product *</label>
              <select value={transferItemId} onChange={e => setTransferItemId(e.target.value)}
                required disabled={!fromLocId} style={{ ...inp, cursor: fromLocId ? 'pointer' : 'not-allowed', opacity: fromLocId ? 1 : 0.5 }}>
                <option value="">{fromLocId ? 'Select item…' : 'Choose source first'}</option>
                {sourceStocks.map(st => (
                  <option key={st.itemId} value={st.itemId}>{st.item.name} ({st.quantity} in stock)</option>
                ))}
              </select>
            </div>

            {selectedTransferItem && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={lbl}>Transfer Quantity *</label>
                  <span style={{ fontSize: 10, color: stockColor(availableQty), background: stockBg(availableQty), padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                    {availableQty} available
                  </span>
                </div>
                <input type="number" min="1" max={availableQty} required value={transferQty}
                  onChange={e => { setTransferQty(e.target.value); setSelectedSerials([]); }}
                  style={inp} />
              </div>
            )}

            {selectedTransferItem?.requiresSerial && filteredSourceSerials.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={lbl}>Select Serials *</label>
                  <span style={{ fontSize: 10, fontWeight: 700, color: selectedSerials.length === parseInt(transferQty) ? '#059669' : '#f59e0b' }}>
                    {selectedSerials.length} / {transferQty} selected
                  </span>
                </div>
                <div style={{ background: 'var(--border-color)', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {filteredSourceSerials.map(s => {
                    const checked = selectedSerials.includes(s.serialNumber);
                    return (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: checked ? 'rgba(124,58,237,0.07)' : 'transparent', border: `1.5px solid ${checked ? 'rgba(124,58,237,0.25)' : 'transparent'}`, transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={checked} onChange={() => handleSerialCheckbox(s.serialNumber)}
                          style={{ width: 14, height: 14, accentColor: '#7c3aed', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: checked ? 800 : 600, color: checked ? '#7c3aed' : '#475569' }}>
                          {s.serialNumber}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label style={lbl}>Transfer Reason / Notes *</label>
              <textarea required rows={2} placeholder="e.g. Issuing stock to technician Kamal for job #104"
                value={transferReason} onChange={e => setTransferReason(e.target.value)}
                style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
            </div>

            {error && (
              <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !fromLocId || !toLocId}
              style={{ width: '100%', padding: '12px', background: (!fromLocId || !toLocId) ? 'var(--border-color)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: (!fromLocId || !toLocId) ? 'var(--text-light)' : 'var(--bg-card)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: (!fromLocId || !toLocId) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (fromLocId && toLocId) ? '0 6px 20px rgba(124,58,237,0.35)' : 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (fromLocId && toLocId) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <ArrowRightLeft style={{ width: 16, height: 16 }} />
              {loading ? 'Transferring…' : 'Execute Stock Transfer'}
            </button>
          </form>
        </div>

        {/* Step guide */}
        <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #ddd6fe' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transfer Guide</p>
          {['Choose source location', 'Choose destination location', 'Select product & quantity', 'Pick serials if required', 'Add reason & submit'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', color: 'var(--bg-card)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 11, color: '#475569' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ ADD LOCATION MODAL ══════ */}
      {isAddLocOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin style={{ width: 16, height: 16, color: 'var(--bg-card)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bg-card)' }}>Add New Location</h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Branch or Technician stock location</p>
                </div>
              </div>
              <button onClick={() => { setIsAddLocOpen(false); setError(null); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--bg-card)' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <form onSubmit={handleAddLocation} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type selector */}
              <div>
                <label style={lbl}>Location Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { type: 'MAIN' as const, icon: <Building2 style={{ width: 22, height: 22 }} />, label: 'Branch', sub: 'Main store / showroom', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.35)' },
                    { type: 'SUB_TECHNICIAN' as const, icon: <Wrench style={{ width: 22, height: 22 }} />, label: 'Technician', sub: 'Field tech stock bag', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)' },
                  ]).map(opt => {
                    const sel = newLocType === opt.type;
                    return (
                      <button key={opt.type} type="button" onClick={() => setNewLocType(opt.type)}
                        style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${sel ? opt.border : 'var(--border-color)'}`, background: sel ? opt.bg : 'var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s', color: sel ? opt.color : 'var(--text-light)' }}>
                        {opt.icon}
                        <span style={{ fontSize: 12, fontWeight: 800, color: sel ? opt.color : '#475569' }}>{opt.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'center' }}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={lbl}>
                  {newLocType === 'MAIN' ? 'Branch Name *' : 'Technician Name *'}
                </label>
                <input type="text" required autoFocus
                  placeholder={newLocType === 'MAIN' ? 'e.g. Colombo Head Office' : 'e.g. Technician Kamal'}
                  value={newLocName} onChange={e => setNewLocName(e.target.value)}
                  style={inp} />
                <p style={{ margin: '5px 0 0', fontSize: 10, color: 'var(--text-light)' }}>
                  {newLocType === 'MAIN'
                    ? 'This will appear as a transfer source/destination for branch stock.'
                    : 'This technician\'s bag can receive stock transfers and bill outdoor jobs.'}
                </p>
              </div>

              {/* Preview */}
              {newLocName.trim() && (
                <div style={{ padding: '10px 14px', background: newLocType === 'MAIN' ? 'rgba(124,58,237,0.05)' : 'rgba(16,185,129,0.05)', borderRadius: 10, border: `1.5px solid ${newLocType === 'MAIN' ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.2)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: newLocType === 'MAIN' ? 'rgba(124,58,237,0.12)' : 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {newLocType === 'MAIN' ? <Building2 style={{ width: 14, height: 14, color: '#7c3aed' }} /> : <Wrench style={{ width: 14, height: 14, color: '#10b981' }} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>{newLocName}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--text-light)' }}>{newLocType === 'MAIN' ? 'Branch Location' : 'Technician Bag'}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: newLocType === 'MAIN' ? '#7c3aed' : '#10b981', background: newLocType === 'MAIN' ? 'rgba(124,58,237,0.1)' : 'rgba(16,185,129,0.1)' }}>
                    {newLocType === 'MAIN' ? 'Branch' : 'Tech'}
                  </span>
                </div>
              )}

              {error && (
                <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => { setIsAddLocOpen(false); setError(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={locLoading}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: newLocType === 'MAIN' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'linear-gradient(135deg,#059669,#047857)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: newLocType === 'MAIN' ? '0 4px 14px rgba(124,58,237,0.35)' : '0 4px 14px rgba(5,150,105,0.35)' }}>
                  {locLoading ? 'Creating…' : `Create ${newLocType === 'MAIN' ? 'Branch' : 'Technician'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ DELETE CONFIRM MODAL ══════ */}
      {(deleteConfirmId !== null || forceDeletePrompt !== null) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 style={{ width: 22, height: 22, color: '#ef4444' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                {forceDeletePrompt !== null ? 'FORCE Delete Location?' : 'Delete Location?'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <strong>{locations.find(l => l.id === (forceDeletePrompt || deleteConfirmId))?.name}</strong> will be permanently deleted.<br />
                {forceDeletePrompt !== null ? (
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>WARNING: This location has data! Force deleting it will destroy all associated stock, serials, and invoices. A full JSON backup will be auto-downloaded first.</span>
                ) : (
                  'This only works if the location has no stock.'
                )}
              </p>
              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
                <button onClick={() => { setDeleteConfirmId(null); setForceDeletePrompt(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                
                {forceDeletePrompt !== null ? (
                  <button onClick={() => handleDeleteLocation(forceDeletePrompt, true)} disabled={locLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                    {locLoading ? 'Processing…' : 'FORCE DELETE'}
                  </button>
                ) : (
                  <button onClick={() => handleDeleteLocation(deleteConfirmId!)} disabled={locLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                    {locLoading ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render a location button (extracted to avoid repetition)
  function renderLocationBtn(loc: Location) {
    const isSel = selectedLocId === loc.id;
    const isMain = loc.type === 'MAIN';
    return (
      <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <button onClick={() => setSelectedLocId(loc.id)}
          style={{ flex: 1, textAlign: 'left', padding: '9px 11px', borderRadius: 10, border: `1.5px solid ${isSel ? (isMain ? '#7c3aed' : '#10b981') : 'var(--border-color)'}`, background: isSel ? (isMain ? 'rgba(124,58,237,0.06)' : 'rgba(16,185,129,0.06)') : 'var(--border-color)', cursor: 'pointer', transition: 'all 0.15s', minWidth: 0 }}
          onMouseEnter={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.borderColor = isMain ? '#7c3aed' : '#10b981'; } }}
          onMouseLeave={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; } }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isSel ? (isMain ? '#7c3aed' : '#059669') : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</p>
        </button>
        {loc.name !== 'Gampaha Head Office' && (
          <button onClick={() => { setDeleteConfirmId(loc.id); setError(null); }}
            title="Delete location"
            style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = 'var(--bg-card)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          >
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>
    );
  }
}
