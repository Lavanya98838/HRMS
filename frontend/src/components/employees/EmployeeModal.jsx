import { useState, useEffect } from 'react';
import { employeeAPI, departmentAPI, roleAPI } from '../../utils/phase2Api';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  department: '', role: '', designation: '',
  employmentType: 'full_time', dateOfJoining: '', dateOfBirth: '', gender: 'prefer_not_to_say',
  address: { street: '', city: '', state: '', country: 'India', pincode: '' },
  salary: { basic: '', hra: '', allowances: '', deductions: '' },
  emergencyContact: { name: '', relationship: '', phone: '' },
};

const EmployeeModal = ({ isOpen, onClose, onSuccess, employee = null }) => {
  const isEdit = !!employee;
  const [form, setForm] = useState(INITIAL_FORM);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [inviting, setInviting]   = useState(false);

  const handleSendInvite = async () => {
    if (!employee?._id) return;
    setInviting(true);
    try {
      const { authAPI } = await import('../../utils/api');
      await authAPI.sendInvite(employee._id);
      toast.success(`Invite sent to ${employee.email}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      if (isEdit && employee) {
        setForm({
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          email: employee.email || '',
          phone: employee.phone || '',
          department: employee.department?._id || '',
          role: employee.role?._id || '',
          designation: employee.designation || '',
          employmentType: employee.employmentType || 'full_time',
          dateOfJoining: employee.dateOfJoining?.split('T')[0] || '',
          dateOfBirth: employee.dateOfBirth?.split('T')[0] || '',
          gender: employee.gender || 'prefer_not_to_say',
          address: employee.address || INITIAL_FORM.address,
          salary: {
            basic: employee.salary?.basic || '',
            hra: employee.salary?.hra || '',
            allowances: employee.salary?.allowances || '',
            deductions: employee.salary?.deductions || '',
          },
          emergencyContact: employee.emergencyContact || INITIAL_FORM.emergencyContact,
        });
      } else {
        setForm(INITIAL_FORM);
        setActiveTab('basic');
      }
    }
  }, [isOpen, employee?._id]); // use _id not whole object to prevent infinite re-renders

  const loadDropdowns = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        departmentAPI.getAll({ isActive: true }),
        roleAPI.getAll({ isActive: true }),
      ]);
      setDepartments(deptRes.data.data.departments || []);
      setRoles(roleRes.data.data.roles || []);
    } catch { /* silent */ }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        salary: {
          basic: Number(form.salary.basic) || 0,
          hra: Number(form.salary.hra) || 0,
          allowances: Number(form.salary.allowances) || 0,
          deductions: Number(form.salary.deductions) || 0,
        },
      };
      if (isEdit) {
        await employeeAPI.update(employee._id, payload);
        toast.success('Employee updated successfully! ✅');
      } else {
        const res = await employeeAPI.create(payload);
        const creds = res.data.data.loginCredentials;
        toast.success(`Employee created! Login: ${creds.email} / ${creds.password}`, { duration: 8000 });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const TABS = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'work', label: 'Work Info' },
    { id: 'address', label: 'Address' },
    { id: 'salary', label: 'Salary' },
    { id: 'emergency', label: 'Emergency' },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? '✏️ Edit Employee' : '➕ Add New Employee'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 28px', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? 'var(--violet-light)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--violet)' : 'transparent'}`,
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ paddingTop: 24 }}>

            {/* ── Basic Info ── */}
            {activeTab === 'basic' && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} placeholder="John" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} placeholder="Doe" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="john@company.com" required disabled={isEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => handleChange('dateOfBirth', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Work Info ── */}
            {activeTab === 'work' && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={e => handleChange('department', e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => handleChange('role', e.target.value)}>
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" value={form.designation} onChange={e => handleChange('designation', e.target.value)} placeholder="Senior Developer" />
                </div>
                <div className="form-group">
                  <label className="form-label">Employment Type</label>
                  <select className="form-select" value={form.employmentType} onChange={e => handleChange('employmentType', e.target.value)}>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Joining</label>
                  <input className="form-input" type="date" value={form.dateOfJoining} onChange={e => handleChange('dateOfJoining', e.target.value)} />
                </div>
              </div>
            )}

            {/* ── Address ── */}
            {activeTab === 'address' && (
              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label">Street Address</label>
                  <input className="form-input" value={form.address.street} onChange={e => handleChange('address.street', e.target.value)} placeholder="123 Main Street" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.address.city} onChange={e => handleChange('address.city', e.target.value)} placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.address.state} onChange={e => handleChange('address.state', e.target.value)} placeholder="Maharashtra" />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.address.country} onChange={e => handleChange('address.country', e.target.value)} placeholder="India" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={form.address.pincode} onChange={e => handleChange('address.pincode', e.target.value)} placeholder="400001" />
                </div>
              </div>
            )}

            {/* ── Salary ── */}
            {activeTab === 'salary' && (
              <>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Basic Salary (₹)</label>
                    <input className="form-input" type="number" value={form.salary.basic} onChange={e => handleChange('salary.basic', e.target.value)} placeholder="50000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HRA (₹)</label>
                    <input className="form-input" type="number" value={form.salary.hra} onChange={e => handleChange('salary.hra', e.target.value)} placeholder="20000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allowances (₹)</label>
                    <input className="form-input" type="number" value={form.salary.allowances} onChange={e => handleChange('salary.allowances', e.target.value)} placeholder="5000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deductions (₹)</label>
                    <input className="form-input" type="number" value={form.salary.deductions} onChange={e => handleChange('salary.deductions', e.target.value)} placeholder="2000" />
                  </div>
                </div>
                {/* Gross Salary Preview */}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gross Salary (CTC)</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--violet-light)' }}>
                    ₹{(
                      (Number(form.salary.basic) || 0) +
                      (Number(form.salary.hra) || 0) +
                      (Number(form.salary.allowances) || 0) -
                      (Number(form.salary.deductions) || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </>
            )}

            {/* ── Emergency ── */}
            {activeTab === 'emergency' && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={form.emergencyContact.name} onChange={e => handleChange('emergencyContact.name', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Relationship</label>
                  <input className="form-input" value={form.emergencyContact.relationship} onChange={e => handleChange('emergencyContact.relationship', e.target.value)} placeholder="Spouse" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.emergencyContact.phone} onChange={e => handleChange('emergencyContact.phone', e.target.value)} placeholder="9876543211" />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '10px 20px' }}>
              Cancel
            </button>
            {isEdit && (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '10px 20px', color: '#10b981', borderColor: '#10b98144' }}
                onClick={handleSendInvite}
                disabled={inviting}
              >
                {inviting ? '⟳ Sending...' : employee?.isAccountSetup ? '✉ Resend Invite' : '✉ Send Invite'}
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} disabled={loading}>
              {loading && <span className="btn-loader" />}
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;