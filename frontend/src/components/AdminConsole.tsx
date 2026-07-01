import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Key, AlertCircle, Trash2, X, Plus, ShieldAlert, User, Database, DownloadCloud, UploadCloud, RefreshCw, CheckCircle2, Download } from 'lucide-react';
import { api, auth } from '../api';
import type { User as UserType } from '../types';

// ── shared style atoms ────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e8ecf4',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: 'var(--border-color)',
  fontSize: 13, color: 'var(--text-main)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontWeight: 800,
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
  const [regRole, setRegRole] = useState('ADMIN');
  const [regLocationId, setRegLocationId] = useState('');
  const [locations, setLocations] = useState<{ id: number; name: string; type: string }[]>([]);

  // Password reset approval states
  const [resettingUser, setResettingUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdminOrSuper = currentUser?.role === 'ADMIN' || isSuperAdmin;
  
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

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
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backup failed: ${errText}`);
      }
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
      setRegUsername(''); setRegPassword(''); setRegRole('ADMIN'); setRegLocationId('');
      setIsRegisterOpen(false);
      fetchUsers();
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

  const handleBackup = async () => {
    try {
      setBackupLoading(true); setError(null); setSuccessMsg(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system/backup`, {
        headers: auth()
      });
      if (!res.ok) throw new Error('Backup failed to download');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sappos_full_backup_${new Date().getTime()}.json`;
      a.click();
      setSuccessMsg('System backup downloaded successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!window.confirm('CRITICAL WARNING: Restoring from a backup will permanently erase all current data in the system and replace it with the backup data. Are you absolutely sure you want to proceed?')) {
      e.target.value = '';
      return;
    }

    try {
      setRestoreLoading(true); setError(null); setSuccessMsg(null);
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system/restore`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Restore failed');
      
      setSuccessMsg('System restored successfully. Please refresh the page.');
    } catch (err: any) {
      setError(err.message || 'Invalid backup file format');
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%', flexWrap: 'wrap' }}>
      
      {/* ══════ LEFT: ALL ACCOUNTS (Operators) ══════ */}
      <div style={{ ...card, flex: 2, minWidth: 400, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck style={{ color: '#6366f1', width: 20, height: 20 }} />
              Operators Console
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              {isSuperAdmin 
                ? 'Superadmin Console: Manage all system administrators & cashier operators'
                : 'Admin Console: Create cashiers and approve security requests'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isSuperAdmin && (
              <button onClick={handleDownloadBackup} disabled={loading} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                <Download style={{ width: 14, height: 14 }} /> Export Backup
              </button>
            )}
            <button onClick={() => setIsRegisterOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
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
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f8fafc', transition: 'background 0.2s', borderRadius: 12 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-color)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: u.role === 'SUPERADMIN' ? '#eff6ff' : u.role === 'ADMIN' ? '#f5f3ff' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.role === 'SUPERADMIN' ? '#3b82f6' : u.role === 'ADMIN' ? '#8b5cf6' : '#10b981' }}>
                  {u.role === 'SUPERADMIN' ? <Shield style={{ width: 20, height: 20 }} /> : u.role === 'ADMIN' ? <UserCheck style={{ width: 20, height: 20 }} /> : <User style={{ width: 20, height: 20 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{u.username}</div>
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
                  <button onClick={() => { setError(null); setNewPassword(''); setResettingUser(u); }} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: '#d97706', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 6 }}>
                    Force Reset Pass
                  </button>
                  <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: 4 }} title="Delete Account" onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ RIGHT SIDE: PENDING APPROVALS & SYSTEM BACKUP ══════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 300 }}>
        
        {/* PENDING APPROVALS */}
        <div style={{ ...card }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key style={{ color: '#f59e0b', width: 18, height: 18 }} /> Pending Approvals
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Approve forgot-password requests here</p>
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
                  <button onClick={() => { setError(null); setNewPassword(''); setResettingUser(p); }} style={{ background: '#f59e0b', color: 'var(--bg-card)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(245,158,11,0.2)' }}>
                    Approve
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShieldAlert style={{ width: 48, height: 48, color: 'var(--border-color)', margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-light)' }}>All Clear</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>No pending password reset requests.</div>
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM BACKUP & RESTORE */}
      {isAdminOrSuper && (
        <div style={{ ...card }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database style={{ color: '#0ea5e9', width: 18, height: 18 }} /> System Data & Backup
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Download or restore full database (JSON)</p>
          </div>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 12, padding: 16 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 13, color: '#0369a1' }}>Full System Backup</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: 11, color: '#0ea5e9' }}>Exports a complete .json snapshot of the entire database.</p>
              <button onClick={handleBackup} disabled={backupLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: 'var(--bg-card)', fontSize: 12, fontWeight: 700, cursor: backupLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(14,165,233,0.2)' }}>
                <DownloadCloud style={{ width: 16, height: 16 }} />
                {backupLoading ? 'Downloading...' : 'Download JSON Backup'}
              </button>
            </div>

            <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: 12, padding: 16 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 13, color: '#be123c' }}>System Restore</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: 11, color: '#e11d48' }}>WARNING: Uploading a backup will erase all current live data.</p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#e11d48', color: 'var(--bg-card)', fontSize: 12, fontWeight: 700, cursor: restoreLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(225,29,72,0.2)' }}>
                <UploadCloud style={{ width: 16, height: 16 }} />
                {restoreLoading ? 'Restoring...' : 'Restore from JSON'}
                <input type="file" accept=".json" onChange={handleRestore} disabled={restoreLoading} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ══════ MODAL: REGISTER OPERATOR ══════ */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Register New Operator</h3>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
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
                    <option value="ADMIN">Administrator</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>{loading ? 'Creating...' : 'Create Operator'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL: APPROVE RESET (Set Password) ══════ */}
      {resettingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Reset Password</h3>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>For user: <strong>{resettingUser.username}</strong></div>
              </div>
              <button onClick={() => setResettingUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            
            <form onSubmit={handleConfirmResetPassword} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>New Secure Password *</label>
                <input type="password" required placeholder="Enter new password" style={inp} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setResettingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'var(--bg-card)', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>{loading ? 'Processing...' : 'Confirm Reset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
