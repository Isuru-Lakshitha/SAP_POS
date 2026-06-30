import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, Key, Trash2, X, Plus, Shield, User, RefreshCw, CheckCircle2, Download } from 'lucide-react';
import { api } from '../api';
import type { User as UserType } from '../types';

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

interface AdminConsoleProps {
  currentUser: { username: string; role: string } | null;
}

export default function AdminConsole({ currentUser }: AdminConsoleProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [pendingResets, setPendingResets] = useState<UserType[]>([]);
  
  // Registration Form
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('USER');
  const [regLocationId, setRegLocationId] = useState('');
  const [locations, setLocations] = useState<{ id: number; name: string; type: string }[]>([]);

  // Password reset approval states
  const [resettingUser, setResettingUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

  useEffect(() => {
    fetchUsers();
    fetchPendingResets();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '/pos/locations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` }
      });
      const data = await res.json();
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Failed to fetch operators: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingResets = async () => {
    try {
      const data = await api.auth.getPendingResets();
      setPendingResets(data);
    } catch (err: any) {
      console.error('Failed to load pending password resets:', err);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/backup`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sap_pos_token')}` }
      });
      if (!res.ok) throw new Error('Backup download failed. Ensure you have Superadmin access.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sappos_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Excel backup downloaded successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleRegisterOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) {
      setError('Username and password are required.'); return;
    }
    try {
      setLoading(true); setError(null);
      await api.auth.register(regUsername, regPassword, regRole, regLocationId ? parseInt(regLocationId) : null);
      setSuccessMsg(`Operator ${regUsername} registered successfully.`);
      setRegUsername(''); setRegPassword(''); setRegRole('USER'); setRegLocationId('');
      setIsRegisterOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change this operator to ${nextRole}?`)) return;
    try {
      setLoading(true); setError(null);
      await api.auth.updateRole(userId, nextRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: nextRole } : u));
      setSuccessMsg('Role updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;
    try {
      setLoading(true); setError(null);
      await api.auth.approveReset(resettingUser.id, newPassword);
      setSuccessMsg(`Password for ${resettingUser.username} has been updated.`);
      setResettingUser(null); setNewPassword('');
      fetchUsers(); fetchPendingResets();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete operator "${username}"?`)) return;
    try {
      setLoading(true); setError(null);
      await api.auth.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setSuccessMsg(`Operator "${username}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%', flexWrap: 'wrap' }}>
      
      {/* ══════ LEFT: ALL ACCOUNTS (Operators) ══════ */}
      <div style={{ ...card, flex: 2, minWidth: 400, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck style={{ color: '#6366f1', width: 20, height: 20 }} />
              Operators Console
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b' }}>
              {isSuperAdmin 
                ? 'Superadmin Console: Manage all system administrators & cashier operators'
                : 'Admin Console: Create cashiers and approve security requests'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isSuperAdmin && (
              <button onClick={handleDownloadBackup} disabled={loading} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                <Download style={{ width: 14, height: 14 }} /> Export Backup
              </button>
            )}
            <button onClick={() => setIsRegisterOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
              <Plus style={{ width: 14, height: 14 }} /> Register Operator
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(error || successMsg) && (
          <div style={{ padding: '12px 24px', background: error ? '#fef2f2' : '#f0fdf4', borderBottom: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`, color: error ? '#ef4444' : '#10b981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            {error ? <ShieldAlert style={{ width: 16, height: 16 }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
            {error || successMsg}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f8fafc', transition: 'background 0.2s', borderRadius: 12 }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: u.role === 'SUPERADMIN' ? '#eff6ff' : u.role === 'ADMIN' ? '#f5f3ff' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.role === 'SUPERADMIN' ? '#3b82f6' : u.role === 'ADMIN' ? '#8b5cf6' : '#10b981' }}>
                  {u.role === 'SUPERADMIN' ? <Shield style={{ width: 20, height: 20 }} /> : u.role === 'ADMIN' ? <UserCheck style={{ width: 20, height: 20 }} /> : <User style={{ width: 20, height: 20 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{u.username}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: u.role === 'SUPERADMIN' ? '#3b82f6' : u.role === 'ADMIN' ? '#8b5cf6' : '#10b981', background: u.role === 'SUPERADMIN' ? 'rgba(59,130,246,0.1)' : u.role === 'ADMIN' ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {u.role === 'SUPERADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Administrator' : 'Cashier / User'}
                    </span>
                    {u.status === 'PASSWORD_RESET_REQUESTED' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw style={{ width: 10, height: 10 }} /> Reset Requested
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {u.role !== 'SUPERADMIN' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {(isSuperAdmin || u.role !== 'ADMIN') && (
                    <button onClick={() => handleToggleRole(u.id, u.role)} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 8px' }}>
                      {u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                    </button>
                  )}
                  <button onClick={() => { setError(null); setNewPassword(''); setResettingUser(u); }} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: '#d97706', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 6 }}>
                    Force Reset Pass
                  </button>
                  <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }} title="Delete Account" onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ RIGHT: PENDING PASSWORD RESETS ══════ */}
      <div style={{ ...card, flex: 1, minWidth: 300 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key style={{ color: '#f59e0b', width: 18, height: 18 }} /> Pending Approvals
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b' }}>Approve forgot-password requests here</p>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pendingResets.length > 0 ? (
            pendingResets.map(p => (
              <div key={p.id} style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>{p.username}</div>
                    <div style={{ fontSize: 11, color: '#b45309', marginTop: 2, fontWeight: 600 }}>Role: {p.role}</div>
                  </div>
                  <button onClick={() => { setError(null); setNewPassword(''); setResettingUser(p); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(245,158,11,0.2)' }}>
                    Approve
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShieldAlert style={{ width: 48, height: 48, color: '#e2e8f0', margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>All Clear</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No pending password reset requests.</div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ MODAL: REGISTER OPERATOR ══════ */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Register New Operator</h3>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            
            <form onSubmit={handleRegisterOperator} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Username *</label>
                <input type="text" required placeholder="e.g. cashier_john" style={inp} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
              </div>

              <div>
                <label style={lbl}>Temporary Password *</label>
                <input type="password" required placeholder="Minimum 6 characters" style={inp} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              </div>

              {isSuperAdmin && (
                <div>
                  <label style={lbl}>Access Role *</label>
                  <select style={inp} value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                    <option value="USER">Cashier / User</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              )}

              {regRole === 'USER' && (
                <div>
                  <label style={lbl}>Associate Storage Location (Branch / Tech) *</label>
                  <select required style={inp} value={regLocationId} onChange={(e) => setRegLocationId(e.target.value)}>
                    <option value="">Choose Location...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.type === 'MAIN' ? 'Branch' : 'Technician'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>{loading ? 'Creating...' : 'Create Operator'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL: APPROVE RESET (Set Password) ══════ */}
      {resettingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Reset Password</h3>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>For user: <strong>{resettingUser.username}</strong></div>
              </div>
              <button onClick={() => setResettingUser(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            
            <form onSubmit={handleConfirmResetPassword} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>New Secure Password *</label>
                <input type="password" required placeholder="Enter new password" style={inp} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setResettingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>{loading ? 'Processing...' : 'Confirm Reset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
