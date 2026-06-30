import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, ShoppingCart, Trash2, Plus, Minus,
  Printer, X, CreditCard, DollarSign, FileText, CheckCircle2, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import type { Customer, Item, CartItem, Invoice } from '../types';

interface BillingRegisterProps {
  currentUser: { id: number; username: string; role: string; locationId?: number | null } | null;
}
interface Location { id: number; name: string; type: string; }
interface SerialNumberEntry { serialNumber: string; itemId: number; locationId: number; status: string; }

// ─── shared inline style atoms ───────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 12, color: '#1e293b', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  fontSize: 10, color: '#64748b', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 5,
};
const iconBox = (color: string): React.CSSProperties => ({
  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
  background: `linear-gradient(135deg, ${color})`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: `0 4px 12px ${color.split(',')[0].replace('linear-gradient(135deg, ', '')}33`,
});

export default function BillingRegister({ currentUser }: BillingRegisterProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [localStocks, setLocalStocks] = useState<Record<number, number>>({});
  const [localSerials, setLocalSerials] = useState<SerialNumberEntry[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CHEQUE' | 'KOKO' | 'BANK_TRANSFER'>('CASH');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustIsCredit, setNewCustIsCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isTechnician = currentUser?.role === 'USER';

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { if (selectedLocationId) fetchLocationStock(selectedLocationId); }, [selectedLocationId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true); setError(null);
      const custData = await api.customers.list();
      setCustomers(custData);
      const walkIn = (custData as Customer[]).find((c: Customer) => c.telephone === '0000000000');
      if (walkIn) setSelectedCustomerId(walkIn.id);
      const itemsData = await api.items.list();
      setItems(itemsData);
      const locRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` }
      });
      const locData = await locRes.json();
      setLocations(locData);
      if (isTechnician) {
        if (currentUser?.locationId) setSelectedLocationId(currentUser.locationId);
        else setError('No assigned location bag. Please ask Admin.');
      } else {
        const head = locData.find((l: Location) => l.type === 'MAIN');
        setSelectedLocationId(head ? head.id : locData[0]?.id);
      }
    } catch (err: any) { setError('Initialization failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const fetchLocationStock = async (locId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pos/locations/${locId}/stock`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` }
      });
      const data = await res.json();
      const stockMap: Record<number, number> = {};
      if (data.stocks) data.stocks.forEach((s: any) => { stockMap[s.itemId] = s.quantity; });
      setLocalStocks(stockMap);
      setLocalSerials(data.serials || []);
      setCart([]);
    } catch (err: any) { console.error('Failed to load local stock:', err); }
  };

  const addToCart = (item: Item) => {
    if (item.type === 'SERVICE') {
      const existing = cart.find(c => c.itemId === item.id);
      if (existing) setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      else setCart([...cart, { itemId: item.id, code: item.code, name: item.name, quantity: 1, unitPrice: item.retailPrice, discount: 0, warrantyPeriod: 'No Warranty', serialNumber: '', notes: '' }]);
      setError(null); return;
    }
    const localQty = localStocks[item.id] || 0;
    const existing = cart.find(c => c.itemId === item.id);
    if (existing) {
      if (existing.quantity >= localQty) { setError(`Only ${localQty} unit(s) available for ${item.name}.`); return; }
      setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (localQty < 1) { setError(`${item.name} is out of stock at this location.`); return; }
      setCart([...cart, { itemId: item.id, code: item.code, name: item.name, quantity: 1, unitPrice: item.retailPrice, discount: 0, warrantyPeriod: item.warrantyPeriod, serialNumber: '', notes: '' }]);
    }
    setError(null);
  };

  const removeFromCart = (itemId: number) => setCart(cart.filter(c => c.itemId !== itemId));

  const updateQuantity = (itemId: number, qty: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    if (qty <= 0) { removeFromCart(itemId); return; }
    if (item.type === 'PRODUCT') {
      const localQty = localStocks[itemId] || 0;
      if (qty > localQty) { setError(`Only ${localQty} unit(s) available.`); return; }
    }
    setCart(cart.map(c => c.itemId === itemId ? { ...c, quantity: qty } : c));
    setError(null);
  };

  const updateCartField = (itemId: number, field: keyof CartItem, value: any) =>
    setCart(cart.map(c => c.itemId === itemId ? { ...c, [field]: value } : c));

  const getSubtotal = () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const getItemDiscountsTotal = () => cart.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  const getFinalTotal = () => Math.max(0, getSubtotal() - getItemDiscountsTotal() - cartDiscount);

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) { setError('Name and Telephone are required.'); return; }
    try {
      setLoading(true);
      const newCust = await api.customers.create({ name: newCustName, telephone: newCustPhone, address: newCustAddress, isCreditCorporate: newCustIsCredit });
      setCustomers([...customers, newCust]);
      setSelectedCustomerId(newCust.id);
      setIsCustomerModalOpen(false);
      setNewCustName(''); setNewCustPhone(''); setNewCustAddress(''); setNewCustIsCredit(false);
      setSuccessMsg('Customer registered!'); setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (paymentMethod === 'CASH') {
      const cash = parseFloat(cashReceived) || 0;
      setChangeAmount(Math.max(0, cash - getFinalTotal()));
    }
  }, [cashReceived, paymentMethod, cart, cartDiscount]);

  const handleCheckout = async () => {
    if (cart.length === 0) { setError('Cart is empty.'); return; }
    if (isTechnician) {
      const client = customers.find(c => c.id === selectedCustomerId);
      if (!client || client.telephone === '0000000000') { setError('Outdoor jobs require a registered customer.'); return; }
    }
    for (const ci of cart) {
      const dbItem = items.find(i => i.id === ci.itemId);
      if (dbItem?.requiresSerial && !ci.serialNumber?.trim()) { setError(`Serial required for: ${ci.name}`); return; }
    }
    if (paymentMethod === 'CASH' && (parseFloat(cashReceived) || 0) < getFinalTotal()) {
      setError('Cash received is less than total.'); return;
    }
    try {
      setLoading(true); setError(null);
      const invoice = await api.invoices.create({
        customerId: selectedCustomerId,
        cartItems: cart.map(c => ({ itemId: c.itemId, quantity: c.quantity, unitPrice: c.unitPrice, discount: c.discount, serialNumber: c.serialNumber || undefined, warrantyPeriod: c.warrantyPeriod, notes: c.notes || undefined })),
        totalAmount: getSubtotal(), discountAmount: getItemDiscountsTotal() + cartDiscount,
        finalAmount: getFinalTotal(), paymentMethod,
        paymentDetails: paymentMethod === 'CASH' ? `Cash Received: LKR ${cashReceived}` : paymentDetails, notes,
      });
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#06b6d4', '#8b5cf6', '#10b981'] });
      setCompletedInvoice(invoice);
      setIsCheckoutOpen(false);
      setCart([]); setCartDiscount(0); setNotes(''); setCashReceived(''); setPaymentDetails('');
      if (selectedLocationId) fetchLocationStock(selectedLocationId);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handlePrintReceipt = () => window.print();

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.telephone.includes(customerSearch)
  );
  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.code.toLowerCase().includes(itemSearch.toLowerCase())
  );
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedLocation = locations.find(l => l.id === selectedLocationId);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

      {/* ══════ LEFT COLUMN ══════ */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Customer & Location bar ── */}
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Customer search */}
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <label style={lbl}>Billing Customer</label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8' }} />
                <input type="text" placeholder="Search by name or phone…"
                  value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  style={{ ...inp, paddingLeft: 34 }} />
                {customerSearch && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 30, maxHeight: 220, overflowY: 'auto' }}>
                    {filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                      <button key={cust.id} type="button"
                        onClick={() => { setSelectedCustomerId(cust.id); setCustomerSearch(''); }}
                        style={{ width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: selectedCustomerId === cust.id ? 'rgba(124,58,237,0.06)' : 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedCustomerId === cust.id ? 'rgba(124,58,237,0.06)' : 'transparent'; }}
                      >
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{cust.name}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>{cust.telephone}</span>
                        </div>
                        {cust.isCreditCorporate && <span style={{ fontSize: 10, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Credit</span>}
                      </button>
                    )) : <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>No customers found.</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={lbl}>Sales Location</label>
              {isTechnician ? (
                <div style={{ ...inp, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  {selectedLocation?.name || 'Technician Bag'}
                </div>
              ) : (
                <select value={selectedLocationId || ''} onChange={e => setSelectedLocationId(parseInt(e.target.value))}
                  style={{ ...inp, cursor: 'pointer' }}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type === 'MAIN' ? 'Branch' : 'Tech'})</option>)}
                </select>
              )}
            </div>

            {/* Selected customer chip */}
            {selectedCustomer ? (
              <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.06)', border: '1.5px solid rgba(124,58,237,0.2)', minWidth: 130 }}>
                <p style={{ margin: 0, fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>Customer</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 800, color: '#1e293b' }}>
                  {selectedCustomer.name}
                  {selectedCustomer.isCreditCorporate && <span style={{ fontSize: 10, color: '#7c3aed', marginLeft: 5 }}>(Credit)</span>}
                </p>
              </div>
            ) : (
              <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1.5px solid rgba(245,158,11,0.25)' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Walk-in Sale</p>
              </div>
            )}

            {/* New customer */}
            <button onClick={() => setIsCustomerModalOpen(true)} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
            >
              <UserPlus style={{ width: 14, height: 14 }} /> New Customer
            </button>
          </div>
        </div>

        {/* ── Cart Table ── */}
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...iconBox('#7c3aed, #4f46e5'), width: 34, height: 34 }}>
                <ShoppingCart style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Billing Cart</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Counter / Outdoor POS</p>
              </div>
            </div>
            {cart.length > 0 && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#cbd5e1' }}>
              <ShoppingCart style={{ width: 48, height: 48, marginBottom: 12, strokeWidth: 1 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Cart is empty</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cbd5e1' }}>Click a product below to add it</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {['Product', 'Unit Price', 'Qty', 'Discount', 'Serial / Notes', 'Total', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Total' ? 'right' : h === 'Qty' ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const dbItem = items.find(i => i.id === item.itemId);
                    const filteredSerials = localSerials.filter(s => s.itemId === item.itemId);
                    return (
                      <tr key={item.itemId} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                        <td style={{ padding: '10px 10px' }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{item.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{item.code}</p>
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 12, fontWeight: 600, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          LKR {item.unitPrice.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                            ><Minus style={{ width: 11, height: 11 }} /></button>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', minWidth: 22, textAlign: 'center', fontFamily: 'monospace' }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                            ><Plus style={{ width: 11, height: 11 }} /></button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <input type="number" min="0" placeholder="0"
                            value={item.discount || ''}
                            onChange={e => updateCartField(item.itemId, 'discount', parseFloat(e.target.value) || 0)}
                            style={{ ...inp, width: 76, padding: '6px 10px', fontFamily: 'monospace', fontSize: 12 }} />
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {dbItem?.requiresSerial ? (
                              <select required value={item.serialNumber}
                                onChange={e => updateCartField(item.itemId, 'serialNumber', e.target.value)}
                                style={{ ...inp, padding: '6px 10px', fontSize: 11, width: 150 }}>
                                <option value="">Select Serial *</option>
                                {filteredSerials.map(s => <option key={s.serialNumber} value={s.serialNumber}>{s.serialNumber}</option>)}
                              </select>
                            ) : (
                              <span style={{ fontSize: 10, color: dbItem?.type === 'SERVICE' ? '#10b981' : '#94a3b8', fontStyle: 'italic' }}>
                                {dbItem?.type === 'SERVICE' ? 'Service' : 'Non-serialized'}
                              </span>
                            )}
                            <div style={{ display: 'flex', gap: 5 }}>
                              <input type="text" placeholder="Warranty" value={item.warrantyPeriod}
                                onChange={e => updateCartField(item.itemId, 'warrantyPeriod', e.target.value)}
                                style={{ ...inp, padding: '5px 8px', fontSize: 10, width: 80 }} />
                              <input type="text" placeholder="Note…" value={item.notes}
                                onChange={e => updateCartField(item.itemId, 'notes', e.target.value)}
                                style={{ ...inp, padding: '5px 8px', fontSize: 10, flex: 1 }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#7c3aed', whiteSpace: 'nowrap' }}>
                          LKR {((item.unitPrice - item.discount) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                          <button onClick={() => removeFromCart(item.itemId)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
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

        {/* ── Items Catalog ── */}
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...iconBox('#7c3aed, #4f46e5'), width: 34, height: 34 }}>
                <Search style={{ width: 15, height: 15, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Items Catalog</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{filteredItems.length} products at billing source</p>
              </div>
            </div>
            <div style={{ position: 'relative', width: 220 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94a3b8' }} />
              <input type="text" placeholder="Filter by SKU or name…" value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                style={{ ...inp, paddingLeft: 32 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, maxHeight: 270, overflowY: 'auto', paddingRight: 2 }}>
            {filteredItems.map(item => {
              const localQty = item.type === 'SERVICE' ? 999999 : (localStocks[item.id] || 0);
              const isOut = item.type === 'PRODUCT' && localQty === 0;
              const isService = item.type === 'SERVICE';
              const stockColor = isService ? '#10b981' : localQty > 5 ? '#10b981' : localQty > 0 ? '#f59e0b' : '#ef4444';
              const stockBg = isService ? 'rgba(16,185,129,0.1)' : localQty > 5 ? 'rgba(16,185,129,0.1)' : localQty > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
              return (
                <div key={item.id} onClick={() => !isOut && addToCart(item)}
                  style={{ borderRadius: 12, padding: '11px 13px', background: '#fff', border: `1.5px solid ${isOut ? '#e2e8f0' : '#e8ecf4'}`, cursor: isOut ? 'not-allowed' : 'pointer', opacity: isOut ? 0.45 : 1, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', gap: 7, position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { if (!isOut) { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.14)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isOut ? '#e2e8f0' : '#e8ecf4'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isService ? 'linear-gradient(90deg,#10b981,#34d399)' : localQty > 0 ? 'linear-gradient(90deg,#7c3aed,#6366f1)' : '#e2e8f0', borderRadius: '12px 12px 0 0' }} />
                  <div style={{ paddingTop: 3 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{item.name}</p>
                    <span style={{ display: 'inline-block', marginTop: 3, fontSize: 9, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{item.code}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }}>LKR {item.retailPrice.toLocaleString()}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: stockColor, background: stockBg, padding: '2px 6px', borderRadius: 5 }}>
                      {isService ? 'Service' : localQty > 0 ? `${localQty} left` : 'Out'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════ RIGHT COLUMN ══════ */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Invoice Summary */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 17, height: 17, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Invoice Summary</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)} items · {selectedCustomer?.name || 'Walk-in'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cart.length > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', maxHeight: 160, overflowY: 'auto' }}>
                {cart.map(item => (
                  <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#334155' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>×{item.quantity} @ LKR {item.unitPrice.toLocaleString()}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>
                      LKR {((item.unitPrice - item.discount) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Subtotal</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>LKR {getSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {getItemDiscountsTotal() > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#10b981' }}>Item Discounts</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>- LKR {getItemDiscountsTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>Extra Discount</span>
              <div style={{ position: 'relative', width: 120 }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>LKR</span>
                <input type="number" min="0" placeholder="0.00" value={cartDiscount || ''}
                  onChange={e => setCartDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ ...inp, paddingLeft: 34, paddingRight: 8, paddingTop: 6, paddingBottom: 6, fontFamily: 'monospace', fontWeight: 700, textAlign: 'right' }} />
              </div>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg,#7c3aed33,#6366f133,#7c3aed33)', margin: '2px 0' }} />

            <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grand Total</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>All discounts applied</p>
              </div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                LKR {getFinalTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <label style={lbl}>Invoice Notes</label>
              <textarea placeholder="Optional notes…" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
            </div>

            {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>{error}</div>}
            {successMsg && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#16a34a', fontSize: 12, fontWeight: 600 }}>{successMsg}</div>}

            <button
              onClick={() => { if (cart.length === 0) { setError('Cart is empty.'); return; } setError(null); setIsCheckoutOpen(true); }}
              disabled={cart.length === 0 || loading}
              style={{ width: '100%', padding: '13px', background: cart.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: cart.length === 0 ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: cart.length > 0 ? '0 6px 20px rgba(124,58,237,0.35)' : 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (cart.length > 0) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <CreditCard style={{ width: 16, height: 16 }} /> Proceed to Checkout
            </button>
          </div>
        </div>

        {/* Success card */}
        {completedInvoice && (
          <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1.5px solid #86efac', boxShadow: '0 4px 20px rgba(16,185,129,0.15)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>
                <CheckCircle2 style={{ width: 17, height: 17, color: '#fff' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#065f46' }}>Checkout Successful!</p>
                <p style={{ margin: 0, fontSize: 11, color: '#34d399' }}>Invoice saved</p>
              </div>
            </div>
            <div style={{ background: '#dcfce7', borderRadius: 10, padding: '9px 13px', marginBottom: 10, border: '1px solid #86efac' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#065f46', fontWeight: 600 }}>Invoice #</p>
              <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace' }}>{completedInvoice.invoiceNumber}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrintReceipt} style={{ flex: 1, padding: '9px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                <Printer style={{ width: 13, height: 13 }} /> Print
              </button>
              <button onClick={() => setCompletedInvoice(null)} style={{ width: 36, height: 36, background: 'rgba(16,185,129,0.12)', border: '1px solid #86efac', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════ CUSTOMER MODAL ══════ */}
      {isCustomerModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Quick Customer Register</h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <form onSubmit={handleRegisterCustomer} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Customer Name *</label><input type="text" required placeholder="e.g. John Smith" value={newCustName} onChange={e => setNewCustName(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Telephone *</label><input type="text" required placeholder="e.g. 0771234567" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Address (Optional)</label><textarea placeholder="e.g. 123 Main Street, Colombo" rows={2} value={newCustAddress} onChange={e => setNewCustAddress(e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                <input type="checkbox" checked={newCustIsCredit} onChange={e => setNewCustIsCredit(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#7c3aed' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Credit / Corporate Customer</span>
              </label>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
                  {loading ? 'Registering…' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ CHECKOUT MODAL ══════ */}
      {isCheckoutOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign style={{ width: 17, height: 17, color: '#fff' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Select Payment Mode</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Total banner */}
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 14, padding: '14px 18px', border: '1.5px solid #ddd6fe', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Amount Due</p>
                <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', letterSpacing: '-0.03em' }}>
                  LKR {getFinalTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {/* Payment methods */}
              <div>
                <label style={lbl}>Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                  {(['CASH', 'CARD', 'CHEQUE', 'KOKO', 'BANK_TRANSFER'] as const).map(method => (
                    <button key={method} type="button"
                      onClick={() => { setPaymentMethod(method); setPaymentDetails(''); }}
                      style={{ padding: '10px 4px', borderRadius: 10, border: `2px solid ${paymentMethod === method ? '#7c3aed' : '#e2e8f0'}`, background: paymentMethod === method ? 'rgba(124,58,237,0.08)' : '#f8fafc', color: paymentMethod === method ? '#7c3aed' : '#64748b', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                      {method === 'CASH' && <DollarSign style={{ width: 16, height: 16 }} />}
                      {method === 'CARD' && <CreditCard style={{ width: 16, height: 16 }} />}
                      {method === 'CHEQUE' && <FileText style={{ width: 16, height: 16 }} />}
                      {method === 'KOKO' && <ShoppingCart style={{ width: 16, height: 16 }} />}
                      {method === 'BANK_TRANSFER' && <RefreshCw style={{ width: 16, height: 16 }} />}
                      <span>{method.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Payment details */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #e2e8f0' }}>
                {paymentMethod === 'CASH' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Cash Received (LKR)</label>
                      <input type="number" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} style={{ ...inp, fontFamily: 'monospace', fontWeight: 700 }} />
                    </div>
                    <div>
                      <label style={lbl}>Change to Return</label>
                      <div style={{ ...inp, background: '#dcfce7', border: '1.5px solid #86efac', color: '#16a34a', fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>
                        LKR {changeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>
                      {paymentMethod === 'CARD' ? 'Card Approval / Tx ID' : paymentMethod === 'CHEQUE' ? 'Cheque No & Bank' : paymentMethod === 'KOKO' ? 'Koko Order Reference' : 'Bank Transfer Reference'}
                    </label>
                    <input type="text"
                      placeholder={paymentMethod === 'CARD' ? 'e.g. TXN-12345678' : paymentMethod === 'CHEQUE' ? 'e.g. #856102 – Sampath Bank' : paymentMethod === 'KOKO' ? 'e.g. KOKO-95628' : 'e.g. HNB Ref #659281'}
                      value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} style={inp} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 4 }}>
                <button type="button" onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Go Back</button>
                <button onClick={handleCheckout} disabled={loading} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: loading ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                  {loading ? 'Processing…' : 'Confirm & Print Bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ A5/A4 INVOICE PRINT MODAL ══════ */}
      {completedInvoice && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 850, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Actions Bar (Hidden during print) */}
            <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 style={{ color: '#10b981', width: 24, height: 24 }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Sale Completed Successfully</h3>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setCompletedInvoice(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Close (New Sale)</button>
                <button type="button" onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>Print Invoice</button>
              </div>
            </div>

            {/* The Actual Invoice to Print */}
            <div id="print-receipt-section" style={{ width: '100%', fontFamily: 'Arial, sans-serif', color: '#000', padding: '40px', boxSizing: 'border-box', background: '#fff' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-1px' }}>
                    SAP <span style={{ fontSize: '18px', verticalAlign: 'super' }}>+</span>
                    <div style={{ fontSize: '10px', fontStyle: 'normal', letterSpacing: '2px', marginTop: '-5px' }}>COMPUTERS</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', paddingRight: '80px', color: '#1f2937' }}>SAP COMPUTERS</h1>
                </div>
              </div>
          <div style={{ background: '#e5e7eb', textAlign: 'center', padding: '4px', borderTop: '1px solid #000', borderBottom: '1px solid #000', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '4px', fontWeight: 'bold' }}>INVOICE</h2>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '12px', lineHeight: '1.4' }}>
            <div style={{ width: '60%' }}>
              <p style={{ margin: 0 }}><strong>No.14, Sanasa Ideal Complex, Colombo Rd, Gampaha.</strong></p>
              <p style={{ margin: 0 }}><strong>Email :</strong> saptechnology.info@gmail.com</p>
              <p style={{ margin: 0 }}><strong>Branches:</strong> 60 /36 / B, Kandy Road Yakkala.</p>
              <p style={{ margin: 0 }}><strong>Tel :</strong> 033-7294388, 071-8176220</p>
            </div>
            <div style={{ width: '35%' }}>
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <strong style={{ width: '60px' }}>DATE:</strong>
                <span style={{ borderBottom: '1px dotted #000', flexGrow: 1 }}>{new Date(completedInvoice.date).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <strong style={{ width: '60px' }}>TO:</strong>
                <span style={{ borderBottom: '1px dotted #000', flexGrow: 1 }}>{completedInvoice.customer?.name || 'Walk-in'}</span>
              </div>
              <div style={{ display: 'flex', marginTop: '5px' }}>
                <strong style={{ width: '60px' }}>INV NO:</strong>
                <span style={{ borderBottom: '1px dotted #000', flexGrow: 1 }}>{completedInvoice.invoiceNumber}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#374151', color: '#fff' }}>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '50%' }}>DESCRIPTION</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '20%' }}>UNIT PRICE</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '10%' }}>QTY</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', width: '20%' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {/* Fill minimum 10 empty rows to match the image bill layout if less items exist */}
              {Array.from({ length: Math.max(10, completedInvoice.cartItems.length) }).map((_, idx) => {
                const ci = completedInvoice.cartItems[idx];
                return (
                  <tr key={idx} style={{ height: '30px' }}>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', verticalAlign: 'top' }}>
                      {ci ? (
                        <>
                          <div style={{ fontWeight: 'bold' }}>{ci.item.name}</div>
                          {ci.serialNumber && <div style={{ fontSize: '11px', color: '#333' }}>S/N: {ci.serialNumber}</div>}
                          {ci.notes && <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#555' }}>Note: {ci.notes}</div>}
                          {ci.warrantyPeriod && ci.warrantyPeriod !== 'No Warranty' && <div style={{ fontSize: '11px' }}>Warranty: {ci.warrantyPeriod}</div>}
                        </>
                      ) : null}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                      {ci ? (ci.unitPrice - ci.discount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                      {ci ? ci.quantity : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                      {ci ? ((ci.unitPrice - ci.discount) * ci.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr>
                <td colSpan={2} style={{ border: '1px solid #000', borderRight: 'none' }}></td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#374151', color: '#fff', fontWeight: 'bold' }}>Total</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                  {completedInvoice.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Notes */}
          <div style={{ marginTop: '15px', fontSize: '9px', lineHeight: '1.2' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontStyle: 'italic' }}>Note:</p>
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontStyle: 'italic' }}>Terms & Conditions</p>
            <p style={{ margin: 0, fontStyle: 'italic' }}>
              • Warranty period referred to 1 year = 365 -14 days, 2 years = 730 -28 days, 3 years = 1095 -42 days, (Excluding Public Holidays) Warranty covers only manufacture's defects, damages or defects due to other causes such as improper operation, Power fluctuation, lightning or any other natural disaster are not included under this warranty.
            </p>
          </div>

          {/* Signatures & Stamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                Issued By<br/>SAP Computers
              </div>
            </div>
            
            <div style={{ textAlign: 'center', color: '#4f46e5', fontWeight: 'bold' }}>
              <div style={{ fontSize: '18px' }}>SAP COMPUTERS</div>
              <div style={{ fontSize: '13px' }}>No. 14,</div>
              <div style={{ fontSize: '13px' }}>Sanasa Ideal Building,</div>
              <div style={{ fontSize: '13px' }}>Gampaha</div>
            </div>

            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                Customer Signature
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '13px', fontWeight: 'bold' }}>
            THANK YOU FOR YOUR BUSINESS
          </div>

        </div>
          </div>
        </div>
      )}
    </div>
  );
}
