import { useState, useEffect } from 'react';
import { roleAPI, departmentAPI } from '../../utils/phase2Api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const RoleModal = ({ isOpen, onClose, onSuccess, role = null, departments }) => {
  const isEdit = !!role;
  const [form, setForm] = useState({ name: '', department: '', level: 1, description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(isEdit
        ? { name: role.name, department: role.department?._id || '', level: role.level || 1, description: role.description || '' }
        : { name: '', department: '', level: 1, description: '' }
      );
    }
  }, [isOpen, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await roleAPI.update(role._id, form);
        toast.success('Role updated!');
      } else {
        await roleAPI.create(form);
        toast.success('Role created!');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Edit Role' : '🎭 New Role'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Role Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Senior Developer" required />
              </div>
              <div className="form-group">
                <label className="form-label">Level (1–10)</label>
                <input className="form-input" type="number" min={1} max={10} value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))} />
              </div>
              <div className="form-group form-full">
                <label className="form-label">Department (optional)</label>
                <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group form-full">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this role do?" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost" style={{ padding: '10px 20px' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} disabled={loading}>
              {loading && <span className="btn-loader" />}
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LEVEL_COLORS = ['', '#6b7280', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#7c3aed', '#e11d74', '#f97316'];

const RolesPage = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        roleAPI.getAll({ isActive: true }),
        departmentAPI.getAll({ isActive: true }),
      ]);
      setRoles(rolesRes.data.data.roles || []);
      setDepartments(deptsRes.data.data.departments || []);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await roleAPI.delete(id);
      toast.success('Role deleted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete role'); }
  };

  const filtered = roles.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || r.department?._id === filterDept;
    return matchSearch && matchDept;
  });

  // Group by level descending
  const grouped = filtered.reduce((acc, role) => {
    const level = role.level || 1;
    if (!acc[level]) acc[level] = [];
    acc[level].push(role);
    return acc;
  }, {});

  const sortedLevels = Object.keys(grouped).sort((a, b) => b - a);

  return (
    <DashboardLayout onSearch={setSearch} searchPlaceholder="Search roles...">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Role Manager</h1>
          <p>Define and organize job roles and hierarchy levels</p>
        </div>
        {isAdminOrHR && (
          <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => { setEditRole(null); setShowModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Role
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {/* Roles by Level */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <div className="empty-title">No roles found</div>
            <div className="empty-desc">{search ? `No results for "${search}"` : 'Add your first role'}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sortedLevels.map(level => (
            <div key={level}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${LEVEL_COLORS[level] || '#7c3aed'}22`, border: `1px solid ${LEVEL_COLORS[level] || '#7c3aed'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: LEVEL_COLORS[level] || '#7c3aed' }}>
                  L{level}
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Level {level}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {grouped[level].map(role => (
                  <div key={role._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = LEVEL_COLORS[level] || 'var(--violet)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {role.department?.name || 'All Departments'}
                      </div>
                    </div>
                    {isAdminOrHR && (
                      <div className="action-btns">
                        <button className="action-btn" title="Edit" onClick={() => { setEditRole(role); setShowModal(true); }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {user?.role === 'admin' && (
                          <button className="action-btn danger" title="Delete" onClick={() => handleDelete(role._id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleModal isOpen={showModal} onClose={() => { setShowModal(false); setEditRole(null); }} onSuccess={fetchData} role={editRole} departments={departments} />
    </DashboardLayout>
  );
};

export default RolesPage;
