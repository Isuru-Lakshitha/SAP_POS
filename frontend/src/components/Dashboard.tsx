import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  ShoppingCart, Package, TrendingUp, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2, Layers, AlertTriangle
} from 'lucide-react';

const TOKEN = () => localStorage.getItem('sap_pos_token');
const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '';
const auth = () => ({ Authorization: `Bearer ${TOKEN()}` });

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n);

const PIE_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

interface ProfitSummary { totalRevenue: number; totalCogs: number; totalProfit: number; }
interface ProfitRecord { id: number; invoiceNumber: string; date: string; location: string; customer: string; revenue: number; cogs: number; profit: number; }
interface StockSummary { totalQuantity: number; totalCostVal: number; totalRetailVal: number; }
interface StockRecord { itemName: string; quantity: number; totalRetailValue: number; }
interface Invoice { id: number; invoiceNumber: string; createdAt: string; finalAmount: number; customer?: { name: string } | null; }

export default function Dashboard() {
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [profitRecords, setProfitRecords] = useState<ProfitRecord[]>([]);
  const [stock, setStock] = useState<StockSummary | null>(null);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<number>(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profitRes, stockRes, invRes, custRes, lowStockRes] = await Promise.all([
        fetch(`${BASE}/reports/profit-viewer`, { headers: auth() }),
        fetch(`${BASE}/reports/stock-in-hand`, { headers: auth() }),
        fetch(`${BASE}/pos/invoices`, { headers: auth() }),
        fetch(`${BASE}/pos/customers`, { headers: auth() }),
        fetch(`${BASE}/reports/low-stock`, { headers: auth() }),
      ]);
      const [profitData, stockData, invData, custData, lowStockData] = await Promise.all([
        profitRes.json(), stockRes.json(), invRes.json(), custRes.json(), lowStockRes.json()
      ]);
      if (profitData.summary) { setProfit(profitData.summary); setProfitRecords(profitData.records || []); }
      if (stockData.summary) { setStock(stockData.summary); setStockRecords(stockData.records || []); }
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(custData)) setCustomers(custData.length);
      if (Array.isArray(lowStockData)) setLowStock(lowStockData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ── Derived Data ──────────────────────────────────────────────────────────
  // Today's sales
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = invoices.filter(i => i.createdAt?.slice(0, 10) === today).reduce((s, i) => s + i.finalAmount, 0);
  const todayTxns = invoices.filter(i => i.createdAt?.slice(0, 10) === today).length;

  // Sales chart — last 7 days daily revenue
  const last7: { date: string; revenue: number; profit: number }[] = [];
  for (let d = 6; d >= 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const key = dt.toISOString().slice(0, 10);
    const dayInvs = invoices.filter(i => i.createdAt?.slice(0, 10) === key);
    const dayProf = profitRecords.filter(r => r.date?.slice(0, 10) === key);
    last7.push({
      date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dayInvs.reduce((s, i) => s + i.finalAmount, 0),
      profit: dayProf.reduce((s, r) => s + r.profit, 0),
    });
  }

  // Top 6 products by retail value
  const topItems = [...stockRecords]
    .sort((a, b) => b.totalRetailValue - a.totalRetailValue)
    .slice(0, 6)
    .map(r => ({ name: r.itemName.length > 18 ? r.itemName.slice(0, 18) + '…' : r.itemName, value: r.totalRetailValue }));

  // Recent 5 invoices
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // ── Stat Cards Config ────────────────────────────────────────────────────
  const cards = [
    {
      label: "Today's Sales",
      value: fmt(todaySales),
      sub: `${todayTxns} transactions`,
      icon: <ShoppingCart size={22} />,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.12)',
      trend: 'up',
    },
    {
      label: 'Total Revenue',
      value: fmt(profit?.totalRevenue ?? 0),
      sub: 'All time',
      icon: <DollarSign size={22} />,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.12)',
      trend: 'up',
    },
    {
      label: 'Net Profit',
      value: fmt(profit?.totalProfit ?? 0),
      sub: `Margin ${profit?.totalRevenue ? Math.round((profit.totalProfit / profit.totalRevenue) * 100) : 0}%`,
      icon: <TrendingUp size={22} />,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      trend: 'up',
    },
    {
      label: 'Stock Value',
      value: fmt(stock?.totalRetailVal ?? 0),
      sub: `${stock?.totalQuantity ?? 0} units in stock`,
      icon: <Package size={22} />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      trend: 'neutral',
    },
    {
      label: 'Customers',
      value: customers.toString(),
      sub: 'Total registered',
      icon: <Users size={22} />,
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.12)',
      trend: 'up',
    },
    {
      label: 'Cost of Goods',
      value: fmt(profit?.totalCogs ?? 0),
      sub: 'Total COGS',
      icon: <BarChart2 size={22} />,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
      trend: 'down',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <RefreshCw size={36} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{ padding: '24px 28px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: 'var(--bg-content)' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Dashboard Overview</h1>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={loadAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            background: '#7c3aed', color: 'var(--bg-card)', border: 'none', borderRadius: 10,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── 6 Stat Cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            borderRadius: 18,
            padding: '20px 22px',
            boxShadow: '8px 8px 20px #cdd0db, -8px -8px 20px var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'transform 0.2s',
            cursor: 'default',
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {/* Icon bubble */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: c.color, flexShrink: 0,
              boxShadow: `0 4px 12px ${c.bg}`,
            }}>
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {c.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 2px', lineHeight: 1 }}>
                {c.value}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {c.trend === 'up' && <ArrowUpRight size={13} style={{ color: '#10b981' }} />}
                {c.trend === 'down' && <ArrowDownRight size={13} style={{ color: '#ef4444' }} />}
                <span style={{ fontSize: 11, color: c.trend === 'up' ? '#10b981' : c.trend === 'down' ? '#ef4444' : 'var(--text-light)', fontWeight: 600 }}>
                  {c.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 24 }}>

        {/* Sales & Profit Area Chart */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 18, padding: '22px 24px',
          boxShadow: '8px 8px 20px #cdd0db, -8px -8px 20px var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.75)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Sales Statistics</h3>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>Last 7 days revenue & profit</p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7c3aed' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#7c3aed', display: 'inline-block' }} /> Revenue
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10b981' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981', display: 'inline-block' }} /> Profit
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last7} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-light)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-light)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ background: 'var(--text-main)', border: 'none', borderRadius: 10, color: 'var(--bg-card)', fontSize: 12 }}
                formatter={(val: any, name: any) => [fmt(Number(val) || 0), name === 'revenue' ? 'Revenue' : 'Profit']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gradRev)" dot={false} />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="url(#gradProf)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Pie Chart */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 18, padding: '22px 20px',
          boxShadow: '8px 8px 20px #cdd0db, -8px -8px 20px var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.75)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>Top Stock Items</h3>
          <p style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 16 }}>By retail value</p>
          {topItems.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={topItems} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {topItems.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--text-main)', border: 'none', borderRadius: 10, color: 'var(--bg-card)', fontSize: 11 }}
                    formatter={(val: any) => [fmt(Number(val) || 0), 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {topItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '30px 0' }}>No stock data</div>
          )}
        </div>
      </div>

      {/* ── Bottom Grid (Invoices & Low Stock) ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        
        {/* Recent Invoices Table */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 18, padding: '22px 24px',
          boxShadow: '8px 8px 20px #cdd0db, -8px -8px 20px var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.75)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Recent Transactions</h3>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>Latest 5 invoices</p>
            </div>
            <Layers size={18} style={{ color: 'var(--text-light)' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Invoice #', 'Customer', 'Amount'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv, i) => (
                <tr key={inv.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.03)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7c3aed' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {inv.customer?.name ?? 'Walk-in'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>{fmt(inv.finalAmount)}</td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)' }}>No transactions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 18, padding: '22px 24px',
          boxShadow: '8px 8px 20px #cdd0db, -8px -8px 20px var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.75)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Low Stock Alerts</h3>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>Items at or below minimum threshold</p>
            </div>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Item', 'Min', 'Current Stock'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item, i) => (
                <tr key={item.id} style={{ background: item.currentStock === 0 ? 'rgba(239,68,68,0.08)' : (i % 2 === 0 ? 'transparent' : 'rgba(245,158,11,0.05)') }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.minStock}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: item.currentStock === 0 ? '#ef4444' : '#d97706' }}>
                    {item.currentStock}
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>Stock levels look good!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
