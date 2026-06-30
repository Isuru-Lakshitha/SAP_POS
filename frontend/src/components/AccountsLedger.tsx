import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, Plus, X, FileText } from 'lucide-react';
import { api } from '../api';
import type { LedgerAccount, LedgerTransaction, Invoice } from '../types';

// ── shared style atoms ────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 13, color: '#1e293b', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  fontSize: 10, color: '#64748b', fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 5,
};
const th: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
  borderBottom: '2px solid #f1f5f9', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '14px 16px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f8fafc',
};

interface AccountsLedgerProps {
  currentUser: { role: string } | null;
}

export default function AccountsLedger({ currentUser }: AccountsLedgerProps) {
  const [balances, setBalances] = useState<LedgerAccount[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  // Invoice details preview modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Manual Adjustment Form
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAccountId, setAdjustAccountId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [adjustDesc, setAdjustDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalances();
    fetchTransactions();
  }, [selectedAccountId]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const data = await api.accounts.getBalances();
      setBalances(data);
    } catch (err: any) {
      setError('Failed to fetch ledger balances: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await api.accounts.getTransactions(selectedAccountId || undefined);
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load ledger transactions:', err);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAccountId || !adjustAmount || !adjustDesc) {
      setError('Account, amount, and description notes are required.');
      return;
    }
    try {
      setLoading(true); setError(null);
      await api.accounts.adjust({ accountId: parseInt(adjustAccountId), amount: parseFloat(adjustAmount) || 0, type: adjustType, description: adjustDesc });
      setIsAdjustModalOpen(false);
      setAdjustAccountId(''); setAdjustAmount(''); setAdjustType('DEBIT'); setAdjustDesc('');
      fetchBalances(); fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice | null) => {
    setSelectedInvoice(invoice);
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      
      {/* Ledger Accounts Balance Overview */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {balances.map(acc => {
          const isSelected = selectedAccountId === acc.id;
          return (
            <div key={acc.id} onClick={() => setSelectedAccountId(isSelected ? null : acc.id)} style={{ ...card, minWidth: 220, padding: 20, cursor: 'pointer', border: isSelected ? '2px solid #6366f1' : '1px solid #e8ecf4', background: isSelected ? 'rgba(99,102,241,0.03)' : '#fff', transition: 'all 0.2s', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: isSelected ? '#6366f1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {acc.name.replace('_ACCOUNT', '').replace('_', ' ')}
                </span>
                <Layers style={{ width: 16, height: 16, color: isSelected ? '#6366f1' : '#94a3b8' }} />
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Ledger balance:</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                LKR {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Transactions & Adjustments list */}
      <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw style={{ color: '#6366f1', width: 20, height: 20 }} /> Account Ledgers & Audit Log
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
              {selectedAccountId ? `Showing postings for: ${balances.find(b => b.id === selectedAccountId)?.name.replace('_ACCOUNT', '')}` : 'Showing individual postings across all accounts'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedAccountId && (
              <button onClick={() => setSelectedAccountId(null)} style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Clear Filter
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { setError(null); setIsAdjustModalOpen(true); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                <Plus style={{ width: 14, height: 14 }} /> Audit Adjustment
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 24px', background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{error}</div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <tr>
                <th style={{...th, width: 150}}>Date & Time</th>
                <th style={th}>Account</th>
                <th style={th}>Description / Notes</th>
                <th style={th}>Flow Type</th>
                <th style={{...th, textAlign: 'right'}}>Inflow (Debit)</th>
                <th style={{...th, textAlign: 'right'}}>Outflow (Credit)</th>
                <th style={{...th, textAlign: 'center', width: 100}}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? transactions.map(txn => {
                const isDebit = txn.type === 'DEBIT';
                return (
                  <tr key={txn.id} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{...td, color: '#64748b', fontSize: 11}}>{new Date(txn.date).toLocaleString()}</td>
                    <td style={{...td, fontWeight: 700}}>{txn.ledgerAccount.name.replace('_ACCOUNT', '')}</td>
                    <td style={{...td, color: '#475569'}}>{txn.description}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 4, background: isDebit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isDebit ? '#10b981' : '#ef4444' }}>
                        {isDebit ? 'Inflow' : 'Outflow'}
                      </span>
                    </td>
                    <td style={{...td, textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace'}}>
                      {isDebit ? `+ LKR ${txn.amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{...td, textAlign: 'right', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace'}}>
                      {!isDebit ? `- LKR ${txn.amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{...td, textAlign: 'center'}}>
                      {txn.invoice ? (
                        <button onClick={() => handleViewInvoice(txn.invoice || null)} style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <FileText style={{ width: 12, height: 12 }} /> {txn.invoice.invoiceNumber.split('-')[2] || 'INV'}
                        </button>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No transactions found in ledger databases.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW INVOICE DETAIL MODAL */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Invoice Details</h3>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{selectedInvoice.invoiceNumber}</div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{new Date(selectedInvoice.date).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Cashier Operator</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{selectedInvoice.cashier.username}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Billing Customer</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{selectedInvoice.customer?.name || 'Walk-in'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Payment Method</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{selectedInvoice.paymentMethod}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Cart Items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {selectedInvoice.cartItems.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{c.item.name}</div>
                        {c.serialNumber && <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>S/N: {c.serialNumber}</div>}
                        {c.notes && <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>Note: {c.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{c.quantity}x</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>LKR {((c.unitPrice - c.discount) * c.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'right', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'monospace' }}>LKR {selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                    <span>Discounts Applied</span>
                    <span style={{ fontFamily: 'monospace' }}>- LKR {selectedInvoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b', fontWeight: 800, fontSize: 14, paddingTop: 8, borderTop: '1px dashed #cbd5e1', marginTop: 4 }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>LKR {selectedInvoice.finalAmount.toFixed(2)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 11 }}>
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 9, marginBottom: 2 }}>Bill Memo:</div>
                  <div>{selectedInvoice.notes}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedInvoice(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Post Ledger Adjustment</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Target Account *</label>
                <select required style={inp} value={adjustAccountId} onChange={(e) => setAdjustAccountId(e.target.value)}>
                  <option value="">Select Ledger Account...</option>
                  {balances.map(b => (
                    <option key={b.id} value={b.id}>{b.name.replace('_ACCOUNT', '')}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Flow Type *</label>
                  <select required style={inp} value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'DEBIT' | 'CREDIT')}>
                    <option value="DEBIT">INFLOW (DEBIT)</option>
                    <option value="CREDIT">OUTFLOW (CREDIT)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Amount (LKR) *</label>
                  <input type="number" step="0.01" required placeholder="0.00" style={{...inp, fontFamily: 'monospace', fontWeight: 700}} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={lbl}>Adjustment Reason / Notes *</label>
                <textarea required placeholder="Explain why this adjustment is made..." rows={3} style={{...inp, resize: 'none'}} value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>Confirm Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
