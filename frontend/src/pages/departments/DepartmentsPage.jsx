import { useState, useEffect } from 'react';
import { departmentAPI } from '../../utils/phase2Api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const DepartmentModal = ({ isOpen, onClose, onSuccess, dept = null }) => {
  const isEdit = !!dept;
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(isEdit ? { name: dept.name, code: dept.code, description: dept.description || '' } : { name: '', code: '', description: '' });
    }
  }, [isOpen, dept]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await departmentAPI.update(dept._id, form);
        toast.success('Department updated!');
      } else {
        await departmentAPI.create(form);
        toast.success('Department created!');
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
          <h2 className="modal-title">{isEdit ? '✏️ Edit Department' : '🏢 New Department'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Engineering" required />
              </div>
              <div className="form-group">
                <label className="form-label">Code *</label>
                <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ENG" maxLength={10} required />
              </div>
              <div className="form-group form-full">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this department..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost" style={{ padding: '10px 20px' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} disabled={loading}>
              {loading && <span className="btn-loader" />}
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DepartmentsPage = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAll({ isActive: true });
      setDepartments(res.data.data.departments || []);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete department'); }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout onSearch={setSearch} searchPlaceholder="Search departments...">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Department Manager</h1>
          <p>Organize your company structure with departments</p>
        </div>
        {isAdminOrHR && (
          <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => { setEditDept(null); setShowModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Department
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { icon: '🏢', label: 'Total Departments', value: departments.length, color: '#7c3aed' },
          { icon: '✅', label: 'Active', value: departments.filter(d => d.isActive).length, color: '#10b981' },
          { icon: '👥', label: 'Total Employees', value: departments.reduce((s, d) => s + (d.employeeCount || 0), 0), color: '#f97316' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <div className="empty-title">No departments found</div>
            <div className="empty-desc">{search ? `No results for "${search}"` : 'Add your first department'}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((dept, i) => {
            const colors = ['#7c3aed', '#e11d74', '#f97316', '#10b981', '#3b82f6', '#ec4899'];
            const color = colors[i % colors.length];
            return (
              <div key={dept._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', transition: 'all 0.25s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${color}22, transparent 70%)' }}` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color }}>
                    {dept.code}
                  </div>
                  {isAdminOrHR && (
                    <div className="action-btns">
                      <button className="action-btn" title="Edit" onClick={() => { setEditDept(dept); setShowModal(true); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {user?.role === 'admin' && (
                        <button className="action-btn danger" title="Delete" onClick={() => handleDelete(dept._id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{dept.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{dept.description || 'No description'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {dept.employeeCount || 0} employees</span>
                  <span className={`badge ${dept.isActive ? 'badge-active' : 'badge-inactive'}`}>{dept.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DepartmentModal isOpen={showModal} onClose={() => { setShowModal(false); setEditDept(null); }} onSuccess={fetchDepartments} dept={editDept} />
    </DashboardLayout>
  );
};

export default DepartmentsPage;
