import React, { useState, useEffect } from 'react';
import { Search, UserPlus, FileText, X, AlertTriangle, Users, MapPin, CheckCircle2, Edit } from 'lucide-react';
import { api } from '../api';
import type { Customer, Invoice } from '../types';

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
const th: React.CSSProperties = {
  padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
  borderBottom: '2px solid #f1f5f9', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '12px 14px', fontSize: 12, color: '#334155', borderBottom: '1px solid #f8fafc',
};

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custIsCredit, setCustIsCredit] = useState(false);
  const [custBalance, setCustBalance] = useState('0');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.customers.list();
      setCustomers(data);
    } catch (err: any) { setError('Failed to fetch customers: ' + err.message); }
    finally { setLoading(false); }
  };

  const fetchInvoices = async () => {
    try {
      const data = await api.invoices.list();
      setInvoices(data);
    } catch (err: any) { console.error('Failed to load invoices:', err); }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setCustName(''); setCustPhone(''); setCustAddress('');
    setCustIsCredit(false); setCustBalance('0');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(cust);
    setCustName(cust.name); setCustPhone(cust.telephone); setCustAddress(cust.address || '');
    setCustIsCredit(cust.isCreditCorporate); setCustBalance(cust.balance.toString());
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) { setError('Name and Phone number are required.'); return; }
    try {
      setLoading(true); setError(null);
      if (editingCustomer) {
        const updated = await api.customers.update(editingCustomer.id, {
          name: custName, telephone: custPhone, address: custAddress,
          isCreditCorporate: custIsCredit, balance: parseFloat(custBalance) || 0
        });
        setCustomers(customers.map(c => c.id === editingCustomer.id ? updated : c));
        setSuccess(`Updated profile for ${updated.name}`);
      } else {
        const created = await api.customers.create({
          name: custName, telephone: custPhone, address: custAddress, isCreditCorporate: custIsCredit
        });
        setCustomers([...customers, created]);
        setSuccess(`Registered new customer: ${created.name}`);
        setSelectedCustomerId(created.id);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.telephone.includes(searchQuery)
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedCustomerInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

      {/* ══════ LEFT: Customer Registry ══════ */}
      <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* Header / Search bar */}
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                <Users style={{ width: 17, height: 17, color: 'var(--bg-card)' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Customer Registry</h2>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)' }}>{customers.length} registered profiles</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
                <Search style={{ position: 'absolute', left: 12, top: 10, width: 14, height: 14, color: 'var(--text-light)' }} />
                <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inp, paddingLeft: 36 }} />
              </div>
              <button onClick={handleOpenAdd}
                style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(59,130,246,0.3)', whiteSpace: 'nowrap', transition: 'transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <UserPlus style={{ width: 14, height: 14 }} /> Register New
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Banners */}
        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} /> {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, color: '#16a34a', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} /> {success}
          </div>
        )}

        {/* Table Card */}
        <div style={{ ...card, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Address</th>
                  <th style={th}>Account Type</th>
                  <th style={{ ...th, textAlign: 'right' }}>Balance Due</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? filteredCustomers.map(cust => {
                  const isSel = selectedCustomerId === cust.id;
                  return (
                    <tr key={cust.id} onClick={() => setSelectedCustomerId(cust.id)}
                      style={{ background: isSel ? 'rgba(59,130,246,0.06)' : 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--border-color)'; }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
                    >
                      <td style={{ ...td, fontWeight: 700, color: isSel ? '#2563eb' : 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: isSel ? 'rgba(59,130,246,0.15)' : 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSel ? '#2563eb' : 'var(--text-light)', fontSize: 10, fontWeight: 800 }}>
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          {cust.name}
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>{cust.telephone}</td>
                      <td style={{ ...td, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.address || '—'}</td>
                      <td style={{ ...td }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em', background: cust.isCreditCorporate ? 'rgba(124,58,237,0.1)' : 'rgba(16,185,129,0.1)', color: cust.isCreditCorporate ? '#7c3aed' : '#059669' }}>
                          {cust.isCreditCorporate ? 'Credit / Corp' : 'Standard'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: cust.balance > 0 ? 800 : 600, color: cust.balance > 0 ? '#dc2626' : 'var(--text-light)' }}>
                        LKR {cust.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button onClick={(e) => handleOpenEdit(cust, e)}
                          title="Edit Customer"
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLElement).style.color = '#3b82f6'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                        >
                          <Edit style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                      <Users style={{ width: 32, height: 32, margin: '0 auto 10px', opacity: 0.3 }} />
                      No customers found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════ RIGHT: Customer Details ══════ */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          
          <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText style={{ width: 15, height: 15, color: 'var(--bg-card)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--bg-card)' }}>Customer Profile</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Purchase & ledger logs</p>
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {!selectedCustomer ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#cbd5e1', textAlign: 'center' }}>
                <Users style={{ width: 36, height: 36, marginBottom: 10, strokeWidth: 1 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>No Profile Selected</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#cbd5e1' }}>Click on a customer in the registry to view their details.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Profile header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text-main)' }}>{selectedCustomer.name}</h4>
                    {selectedCustomer.isCreditCorporate && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '2px 6px', borderRadius: 4 }}>CORPORATE</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    <span>{selectedCustomer.telephone}</span>
                  </div>
                  {selectedCustomer.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: '8px 10px', background: 'var(--border-color)', borderRadius: 8, border: '1px solid #e8ecf4' }}>
                      <MapPin style={{ width: 12, height: 12, color: 'var(--text-light)', marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>

                {/* Ledger Warning (if credit) */}
                {selectedCustomer.isCreditCorporate && (
                  <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.04)', border: '1.5px solid rgba(239,68,68,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Ledger</span>
                      <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: '#991b1b' }}>
                        LKR {selectedCustomer.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <AlertTriangle style={{ width: 24, height: 24, color: '#ef4444', opacity: 0.8 }} />
                  </div>
                )}

                {/* Purchase History */}
                <div>
                  <p style={{ margin: '0 0 10px', ...lbl }}>Purchase History</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {selectedCustomerInvoices.length > 0 ? (
                      selectedCustomerInvoices.map(inv => (
                        <div key={inv.id} style={{ padding: '10px 12px', background: 'var(--border-color)', borderRadius: 10, border: '1.5px solid #e8ecf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{inv.invoiceNumber}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-light)' }}>{new Date(inv.date).toLocaleDateString()}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>LKR {inv.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <span style={{ display: 'inline-block', padding: '1px 6px', background: 'var(--border-color)', color: '#475569', fontSize: 9, fontWeight: 700, borderRadius: 4, marginTop: 4, textTransform: 'uppercase' }}>
                              {inv.paymentMethod}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: 11, border: '1.5px dashed #e2e8f0', borderRadius: 10 }}>
                        No invoices on record.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════ MODAL: ADD / EDIT CUSTOMER ══════ */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 16, height: 16, color: 'var(--bg-card)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bg-card)' }}>
                    {editingCustomer ? 'Edit Customer' : 'Register Customer'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Update CRM database</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--bg-card)' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Customer Name *</label>
                <input type="text" required placeholder="e.g. Acme Corporation" value={custName} onChange={e => setCustName(e.target.value)} style={inp} />
              </div>

              <div>
                <label style={lbl}>Telephone Number *</label>
                <input type="text" required placeholder="e.g. 0112345678" value={custPhone} onChange={e => setCustPhone(e.target.value)} style={inp} />
              </div>

              <div>
                <label style={lbl}>Billing Address</label>
                <textarea rows={2} placeholder="e.g. 45 Galle Road, Colombo 03" value={custAddress} onChange={e => setCustAddress(e.target.value)} style={{ ...inp, resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: custIsCredit ? 'rgba(124,58,237,0.05)' : 'var(--border-color)', border: `1.5px solid ${custIsCredit ? 'rgba(124,58,237,0.3)' : 'var(--border-color)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => setCustIsCredit(!custIsCredit)}>
                <input type="checkbox" checked={custIsCredit} onChange={() => {}} style={{ width: 16, height: 16, accentColor: '#7c3aed' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: custIsCredit ? '#7c3aed' : '#334155' }}>Corporate / Credit Account</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Allows billing to a ledger without immediate payment.</p>
                </div>
              </div>

              {editingCustomer && custIsCredit && (
                <div>
                  <label style={lbl}>Outstanding Ledger Balance (LKR)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={custBalance} onChange={e => setCustBalance(e.target.value)} style={{ ...inp, fontFamily: 'monospace', fontWeight: 700 }} />
                </div>
              )}

              {error && (
                <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                  {loading ? 'Saving…' : (editingCustomer ? 'Save Changes' : 'Register Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
