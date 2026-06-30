import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Trash2, Package, Wrench, Tag, ShieldCheck, Edit2, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { Item } from '../types';

interface InventoryManagerProps {
  currentUser: { role: string } | null;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 13, color: '#1e293b', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#64748b', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 6,
};

export default function InventoryManager({ currentUser }: InventoryManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('0');
  const [itemWholesale, setItemWholesale] = useState('0');
  const [itemRetail, setItemRetail] = useState('');
  const [itemWarranty, setItemWarranty] = useState('1 Year');
  const [itemRequireSerial, setItemRequireSerial] = useState(false);
  const [itemType, setItemType] = useState('PRODUCT');
  const [itemDesc, setItemDesc] = useState('');
  const [itemMinStock, setItemMinStock] = useState('5');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.items.list();
      setItems(data);
    } catch (err: any) {
      setError('Failed to fetch items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemCode(''); setItemName(''); setItemCost('0');
    setItemWholesale('0'); setItemRetail(''); setItemWarranty('1 Year');
    setItemRequireSerial(false); setItemType('PRODUCT'); setItemDesc(''); setItemMinStock('5');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setItemCode(item.code); setItemName(item.name);
    setItemCost(item.cost.toString()); setItemWholesale(item.wholesalePrice.toString());
    setItemRetail(item.retailPrice.toString()); setItemWarranty(item.warrantyPeriod);
    setItemRequireSerial(item.requiresSerial); setItemType(item.type);
    setItemDesc(item.description || ''); setItemMinStock((item.minStock || 5).toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode || !itemName || !itemRetail) {
      setError('SKU, name, and retail price are required.'); return;
    }
    try {
      setLoading(true); setError(null);
      const payload = {
        code: itemCode, name: itemName,
        cost: parseFloat(itemCost) || 0,
        wholesalePrice: parseFloat(itemWholesale) || 0,
        retailPrice: parseFloat(itemRetail) || 0,
        warrantyPeriod: itemWarranty, requiresSerial: itemRequireSerial,
        type: itemType, stock: editingItem ? editingItem.stock : 0,
        description: itemDesc || undefined,
        minStock: parseInt(itemMinStock) || 5,
      };
      if (editingItem) {
        const updated = await api.items.update(editingItem.id, payload);
        setItems(items.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await api.items.create(payload);
        setItems([...items, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      setLoading(true);
      await api.items.delete(id);
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'ALL' || i.type === filterType;
    return matchSearch && matchType;
  });

  const totalProducts = items.filter(i => i.type === 'PRODUCT').length;
  const totalServices = items.filter(i => i.type === 'SERVICE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: 18,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        border: '1px solid #e8ecf4', padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
            }}>
              <Package style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>Product Registry</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Configure models, cost margins, retail and wholesale pricing
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package style={{ width: 13, height: 13, color: '#7c3aed' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>{totalProducts} Products</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wrench style={{ width: 13, height: 13, color: '#10b981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{totalServices} Services</span>
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36, padding: '10px 14px 10px 36px' }}
            />
          </div>

          {/* Filter pills */}
          {(['ALL', 'PRODUCT', 'SERVICE'] as const).map(type => (
            <button key={type} onClick={() => setFilterType(type)} style={{
              padding: '9px 16px', borderRadius: 10, border: '1.5px solid',
              borderColor: filterType === type ? '#7c3aed' : '#e2e8f0',
              background: filterType === type ? '#7c3aed' : '#ffffff',
              color: filterType === type ? '#ffffff' : '#64748b',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {type === 'ALL' ? `All (${items.length})` : type === 'PRODUCT' ? `Products (${totalProducts})` : `Services (${totalServices})`}
            </button>
          ))}

          {/* Add button */}
          {isAdmin && (
            <button onClick={handleOpenAdd} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Register Item
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── PRODUCT CARD GRID ─────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, color: '#94a3b8', fontSize: 14 }}>
          Loading catalog…
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, color: '#94a3b8' }}>
          <Package style={{ width: 48, height: 48, marginBottom: 12, strokeWidth: 1 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No products match your search</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Try a different SKU or product name</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
          overflowY: 'auto',
          paddingBottom: 8,
        }}>
          {filteredItems.map(item => {
            const isService = item.type === 'SERVICE';
            const margin = item.cost > 0 ? (((item.retailPrice - item.cost) / item.cost) * 100).toFixed(0) : null;

            return (
              <div key={item.id} style={{
                background: '#ffffff', borderRadius: 14,
                border: '1.5px solid #e8ecf4',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                overflow: 'hidden', position: 'relative',
                transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(124,58,237,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e8ecf4';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Top colour strip */}
                <div style={{
                  height: 4,
                  background: isService
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #7c3aed, #6366f1)',
                }} />

                {/* Card body */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Row 1: Icon + Name + SKU */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isService ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isService
                        ? <Wrench style={{ width: 16, height: 16, color: '#10b981' }} />
                        : <Package style={{ width: 16, height: 16, color: '#7c3aed' }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b', lineHeight: 1.3, wordBreak: 'break-word' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace' }}>
                          {item.code}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                          background: isService ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                          color: isService ? '#10b981' : '#7c3aed',
                        }}>
                          {isService ? 'SERVICE' : 'PRODUCT'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Pricing grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Cost', value: item.cost, color: '#64748b' },
                      { label: 'Wholesale', value: item.wholesalePrice, color: '#f59e0b' },
                      { label: 'Retail', value: item.retailPrice, color: '#7c3aed' },
                    ].map(p => (
                      <div key={p.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 800, color: p.color, fontFamily: 'monospace' }}>
                          {p.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Row 3: Warranty + Serial + Margin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9' }}>
                      <ShieldCheck style={{ width: 11, height: 11, color: '#64748b' }} />
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{item.warrantyPeriod}</span>
                    </div>
                    {item.requiresSerial && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)' }}>
                        <Tag style={{ width: 11, height: 11, color: '#ef4444' }} />
                        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>Serial Req.</span>
                      </div>
                    )}
                    {margin !== null && !isService && (
                      <div style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.08)' }}>
                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>+{margin}% margin</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Action footer */}
                {isAdmin && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => handleOpenEdit(item)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', background: '#fff',
                      color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.color = '#7c3aed'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      <Edit2 style={{ width: 11, height: 11 }} /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: '1.5px solid #fca5a5', background: '#fef2f2',
                      color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, padding: 20,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {editingItem ? 'Edit Product' : 'Register New Item'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {editingItem ? `Editing ${editingItem.code}` : 'Add to product catalog registry'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>{error}</div>
              )}

              {/* SKU + Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>SKU Code *</label>
                  <input type="text" required placeholder="e.g. ITM006" value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={labelStyle}>Product Type *</label>
                  <select value={itemType} onChange={e => setItemType(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="PRODUCT">PRODUCT (Physical)</option>
                    <option value="SERVICE">SERVICE (Labour/Work)</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input type="text" required placeholder="e.g. Apple iPad Air" value={itemName}
                  onChange={e => setItemName(e.target.value)} style={inputStyle} />
              </div>

              {/* Pricing */}
              <div>
                <label style={labelStyle}>Pricing (LKR)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Cost', val: itemCost, set: setItemCost, color: '#64748b' },
                    { label: 'Wholesale', val: itemWholesale, set: setItemWholesale, color: '#f59e0b' },
                    { label: 'Retail *', val: itemRetail, set: setItemRetail, color: '#7c3aed' },
                  ].map(p => (
                    <div key={p.label}>
                      <p style={{ margin: '0 0 5px', fontSize: 10, color: p.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</p>
                      <input type="number" step="0.01" required={p.label === 'Retail *'}
                        value={p.val} onChange={e => p.set(e.target.value)}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, color: p.color, padding: '9px 12px' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Warranty */}
              <div>
                <label style={labelStyle}>Warranty Period</label>
                <select value={itemWarranty} onChange={e => setItemWarranty(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="No Warranty">No Warranty</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3 Years">3 Years</option>
                  <option value="5 Years">5 Years</option>
                </select>
              </div>

              {/* Description + Min Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Description / Notes</label>
                  <textarea placeholder="Optional details..." value={itemDesc}
                    onChange={e => setItemDesc(e.target.value)}
                    style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }} />
                </div>
                {itemType === 'PRODUCT' && (
                  <div>
                    <label style={labelStyle}>Min Stock</label>
                    <input type="number" min="0" value={itemMinStock}
                      onChange={e => setItemMinStock(e.target.value)}
                      style={{ ...inputStyle, fontWeight: 700 }} />
                  </div>
                )}
              </div>

              {/* Serial number toggle */}
              {itemType === 'PRODUCT' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                  <input type="checkbox" id="modalRequireSerial" checked={itemRequireSerial}
                    onChange={e => setItemRequireSerial(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Requires Serial Number</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cashier must select a serial during POS checkout</p>
                  </div>
                </label>
              )}

              {/* Footer buttons */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                  background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                }}>
                  {loading ? 'Saving…' : editingItem ? 'Save Changes' : 'Create Registry Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
