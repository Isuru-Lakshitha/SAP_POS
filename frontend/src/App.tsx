import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Layers, ShieldAlert, LogOut, User, Lock,
  BarChart3, Users, PlusSquare, ArrowRightLeft, BookOpen, LayoutDashboard, Monitor
} from 'lucide-react';
import BillingRegister from './components/BillingRegister';
import CustomerManager from './components/CustomerManager';
import InventoryManager from './components/InventoryManager';
import AccountsLedger from './components/AccountsLedger';
import AdminConsole from './components/AdminConsole';
import LocationManager from './components/LocationManager';
import GRNManager from './components/GRNManager';
import ReportsManager from './components/ReportsManager';
import TechnicianStock from './components/TechnicianStock';
import Dashboard from './components/Dashboard';
import { api } from './api';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sap_pos_token'));
  const [user, setUser] = useState<{ id: number; username: string; role: string; locationId?: number | null } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('sap_pos_user');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setActiveTab(parsed.role === 'USER' ? 'mystock' : 'dashboard');
      } catch {
        handleLogout();
      }
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter both username and password.'); return; }
    try {
      setLoading(true); setError(null);
      const res = await api.auth.login(username, password);
      localStorage.setItem('sap_pos_token', res.token);
      localStorage.setItem('sap_pos_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setActiveTab(res.user.role === 'USER' ? 'mystock' : 'dashboard');
      setUsername(''); setPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally { setLoading(false); }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername) { setError('Username is required.'); return; }
    try {
      setLoading(true); setError(null);
      const res = await api.auth.requestReset(resetUsername);
      setSuccess(res.message);
      setResetUsername('');
      setTimeout(() => { setSuccess(null); setIsResetMode(false); }, 5000);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('sap_pos_token');
    localStorage.removeItem('sap_pos_user');
    setToken(null); setUser(null);
    setActiveTab('dashboard');
    setError(null); setSuccess(null);
  };

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!token || !user) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        handleLogout();
      }, 5 * 60 * 1000); // 5 minutes
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer(); // Start the timer

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token, user]);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin      = user?.role === 'ADMIN';
  const isManagement = isSuperAdmin || isAdmin;

  /* ═══════════════════════════════════════════════════════════════
     LOGIN SCREEN
  ═══════════════════════════════════════════════════════════════ */
  if (!token || !user) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: '#2d4fd4' }}>

        {/* LEFT — blue gradient + glass logo card */}
        <div style={{
          width: '50%', height: '100%',
          background: 'linear-gradient(135deg, #4f87f7 0%, #2563eb 50%, #1e3fb8 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative rings */}
          {[{ s: 340, l: -80, b: 50, o: 0.08 }, { s: 200, l: -40, b: 28, o: 0.13 }].map((r, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: r.l, transform: 'translateY(-50%)',
              width: r.s, height: r.s, borderRadius: '50%',
              border: `${r.b}px solid rgba(255,255,255,${r.o})`, pointerEvents: 'none',
            }} />
          ))}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
          }} />

          {/* glass logo card */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
                borderRadius: 28, padding: '36px 44px',
                border: '1.5px solid rgba(255,255,255,0.35)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minWidth: 280, minHeight: 170, gap: 20,
                transform: 'perspective(800px) rotateY(-3deg)', transition: 'transform 0.4s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(0deg) scale(1.02)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(-3deg)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', padding: 10, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={28} color="white" />
                </div>
                <h1 style={{ color: 'white', fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
                  SAP <span style={{ color: '#93c5fd' }}>POS</span>
                </h1>
              </div>
              <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', marginTop: 10 }} />
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
                Point of Sale System
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — neumorphic login form */}
        <div style={{
          width: '50%', height: '100%', background: '#eef1f8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px', boxSizing: 'border-box', overflowY: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: 400, background: '#eef1f8', borderRadius: 28,
            padding: '40px 36px',
            boxShadow: '14px 14px 28px #cdd0db, -14px -14px 28px #ffffff',
            border: '1px solid rgba(255,255,255,0.7)',
          }}>
            {!isResetMode ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ marginBottom: 4 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>Login</h2>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>Welcome back! Please login to your account</p>
                </div>

                {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>{error}</div>}
                {success && <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, color: '#16a34a', fontSize: 12, fontWeight: 600 }}>{success}</div>}

                {/* Username */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>User Name</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" required placeholder="Enter your username" value={username}
                      onChange={e => setUsername(e.target.value)}
                      style={{ width: '100%', padding: '14px 44px 14px 16px', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, fontSize: 13, color: '#1e293b', outline: 'none', background: '#eef1f8', boxSizing: 'border-box', boxShadow: 'inset 4px 4px 8px #cdd0db, inset -4px -4px 8px #ffffff', transition: 'box-shadow 0.2s', fontFamily: 'inherit' }}
                      onFocus={e => { e.target.style.boxShadow = 'inset 5px 5px 10px #c2c5d0, inset -2px -2px 6px #ffffff, 0 0 0 2px rgba(59,130,246,0.25)'; }}
                      onBlur={e => { e.target.style.boxShadow = 'inset 4px 4px 8px #cdd0db, inset -4px -4px 8px #ffffff'; }}
                    />
                    <User style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type="password" required placeholder="Enter your password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ width: '100%', padding: '14px 44px 14px 16px', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 12, fontSize: 13, color: '#1e293b', outline: 'none', background: '#eef1f8', boxSizing: 'border-box', boxShadow: 'inset 4px 4px 8px #cdd0db, inset -4px -4px 8px #ffffff', transition: 'box-shadow 0.2s', fontFamily: 'inherit' }}
                      onFocus={e => { e.target.style.boxShadow = 'inset 5px 5px 10px #c2c5d0, inset -2px -2px 6px #ffffff, 0 0 0 2px rgba(59,130,246,0.25)'; }}
                      onBlur={e => { e.target.style.boxShadow = 'inset 4px 4px 8px #cdd0db, inset -4px -4px 8px #ffffff'; }}
                    />
                    <Lock style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
                  </div>
                </div>

                {/* Forgot password */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setError(null); setIsResetMode(true); }}
                    style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: 14,
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.35)', transition: 'all 0.2s', textTransform: 'uppercase',
                }}>
                  {loading ? 'Authorizing...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Reset Password</h2>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Verify username to request admin assistance</p>
                </div>
                <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, color: '#92400e', fontSize: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <ShieldAlert style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  <span>System administrators will unlock your access once verified.</span>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Username</label>
                  <input type="text" required placeholder="username" value={resetUsername} onChange={e => setResetUsername(e.target.value)}
                    style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => { setError(null); setIsResetMode(false); }}
                    style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                    {loading ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     MAIN DASHBOARD LAYOUT — pure inline styles, no Tailwind
  ═══════════════════════════════════════════════════════════════ */
  const navItems = isManagement ? [
    { tab: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { tab: 'billing',   icon: <ShoppingCart size={16} />,    label: 'Counter POS' },
    { tab: 'grn',       icon: <PlusSquare size={16} />,      label: 'GRN Add Stock' },
    { tab: 'customers', icon: <Users size={16} />,           label: 'Customers' },
    { tab: 'inventory', icon: <Layers size={16} />,          label: 'Product Registry' },
    { tab: 'locations', icon: <ArrowRightLeft size={16} />,  label: 'Transfers' },
    { tab: 'reports',   icon: <BarChart3 size={16} />,       label: 'Reports & Profit' },
    { tab: 'ledger',    icon: <BookOpen size={16} />,        label: 'Ledger Accounts' },
    { tab: 'admin',     icon: <User size={16} />,            label: 'Operators Console' },
  ] : [
    { tab: 'mystock', icon: <Layers size={16} />,       label: 'My Stock Bag' },
    { tab: 'billing', icon: <ShoppingCart size={16} />, label: 'Outdoor Billing' },
  ];

  const tabTitle: Record<string, string> = {
    dashboard: 'Dashboard Overview', billing: 'Billing Register',
    mystock: 'My Stock Ledger',      grn: 'GRN Add Stock',
    customers: 'Customer Registry',  inventory: 'Products Registry',
    locations: 'Branch Transfers',   reports: 'Reports & Profit',
    ledger: 'Accounts Ledger',       admin: 'Operators Console',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden', background: '#eef0f7' }}>

      {/* ── LEFT SIDEBAR ────────────────────────────────────── */}
      <aside style={{ width: 220, height: '100%', background: '#191924', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={18} color="white" />
          </div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
            SAP <span style={{ color: '#a78bfa' }}>POS</span>
          </h2>
        </div>

        {/* Nav buttons */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, textAlign: 'left', width: '100%',
              background: activeTab === item.tab ? '#7c3aed' : 'transparent',
              color: activeTab === item.tab ? '#ffffff' : '#8f9bb3',
              boxShadow: activeTab === item.tab ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.18s ease', fontFamily: 'Inter, sans-serif',
            }}
              onMouseEnter={e => { if (activeTab !== item.tab) (e.currentTarget as HTMLElement).style.background = '#222232'; }}
              onMouseLeave={e => { if (activeTab !== item.tab) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          background: '#eef0f7', padding: '13px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            {tabTitle[activeTab] || ''}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: user.role === 'SUPERADMIN' ? 'rgba(124,58,237,0.15)' : user.role === 'ADMIN' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
              color: user.role === 'SUPERADMIN' ? '#7c3aed' : user.role === 'ADMIN' ? '#3b82f6' : '#10b981',
            }}>
              {user.role === 'SUPERADMIN' ? 'Superadmin' : user.role === 'ADMIN' ? 'Admin' : 'Technician'}
            </span>
            <div style={{ lineHeight: 1.3, textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Operator:</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{user.username}</p>
            </div>
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
              color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#fca5a5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
            >
              <LogOut style={{ width: 14, height: 14 }} /> Log Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, overflow: 'auto', minHeight: 0,
          background: '#eef0f7',
          padding: activeTab === 'dashboard' ? 0 : '24px 28px',
        }}>
          {activeTab === 'dashboard'  && <Dashboard />}
          {activeTab === 'mystock'    && <TechnicianStock currentUser={user} />}
          {activeTab === 'billing'    && <BillingRegister currentUser={user} />}
          {activeTab === 'grn'        && <GRNManager />}
          {activeTab === 'customers'  && <CustomerManager />}
          {activeTab === 'inventory'  && <InventoryManager currentUser={user} />}
          {activeTab === 'locations'  && <LocationManager />}
          {activeTab === 'ledger'     && <AccountsLedger currentUser={user} />}
          {activeTab === 'reports'    && <ReportsManager />}
          {activeTab === 'admin'      && <AdminConsole currentUser={user} />}
        </main>
      </div>
    </div>
  );
}
