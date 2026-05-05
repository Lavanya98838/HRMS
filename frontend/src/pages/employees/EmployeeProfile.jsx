import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeAPI } from '../../utils/phase2Api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmployeeModal from '../../components/employees/EmployeeModal';
import toast from 'react-hot-toast';

const DOC_TYPE_LABELS = {
  resume: 'Resume', id_proof: 'ID Proof', contract: 'Contract',
  certificate: 'Certificate', other: 'Other',
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const avatarInputRef = useRef();
  const docInputRef = useRef();

  const [employee, setEmployee]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [noProfile, setNoProfile]     = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab]     = useState('overview');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [docUpload, setDocUpload]     = useState({ name: '', type: 'other' });

  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);

  const fetchEmployee = async () => {
    setLoading(true);
    setNoProfile(false);
    try {
      if (id) {
        // Direct fetch by MongoDB ID — works for admin/hr/manager viewing any employee
        const res = await employeeAPI.getById(id);
        setEmployee(res.data.data.employee);
      } else {
        // No ID — find own profile by searching with email match
        const res = await employeeAPI.getAll({ limit: 200, page: 1 });
        const all = res.data.data.employees || [];
        const mine = all.find(e =>
          e.email?.toLowerCase() === user?.email?.toLowerCase() ||
          e.user?.email?.toLowerCase() === user?.email?.toLowerCase()
        );
        if (mine) {
          const detail = await employeeAPI.getById(mine._id);
          setEmployee(detail.data.data.employee);
        } else {
          setNoProfile(true);
        }
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setNoProfile(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployee(); }, [id, user?.email]);

  const handleAvatarUpload = async (file) => {
    if (!file || !employee) return;
    setUploadingAvatar(true);
    try {
      await employeeAPI.uploadAvatar(employee._id, file);
      toast.success('Profile picture updated!');
      fetchEmployee();
    } catch { toast.error('Failed to upload picture'); }
    finally { setUploadingAvatar(false); }
  };

  const handleDocUpload = async (file) => {
    if (!file || !docUpload.name) { toast.error('Enter document name first'); return; }
    try {
      await employeeAPI.uploadDocument(employee._id, file, docUpload.name, docUpload.type);
      toast.success('Document uploaded!');
      setDocUpload({ name: '', type: 'other' });
      fetchEmployee();
    } catch { toast.error('Failed to upload document'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await employeeAPI.deleteDocument(employee._id, docId);
      toast.success('Document deleted');
      fetchEmployee();
    } catch { toast.error('Failed to delete document'); }
  };

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const initials = (e) =>
    `${e?.firstName?.[0] || ''}${e?.lastName?.[0] || ''}`.toUpperCase();

  // ── Loading ──
  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400, gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--violet)', animation: 'spin-slow 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading profile...</p>
      </div>
    </DashboardLayout>
  );

  // ── No Profile ──
  if (noProfile || !employee) return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 56, opacity: 0.4 }}>🙋</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-secondary)' }}>
          No Employee Profile Found
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.7 }}>
          Your employee profile has not been created yet.<br />
          Please ask your <strong style={{ color: 'var(--violet-light)' }}>Admin or HR</strong> to create your profile
          using the email: <strong style={{ color: 'var(--violet-light)' }}>{user?.email}</strong>
        </div>
        <button className="btn-primary" style={{ padding: '10px 24px', width: 'auto', marginTop: 8 }}
          onClick={() => navigate(`/${user?.role}/dashboard`)}>
          ← Back to Dashboard
        </button>
      </div>
    </DashboardLayout>
  );

  const gross = (employee.salary?.basic || 0) + (employee.salary?.hra || 0) +
    (employee.salary?.allowances || 0) - (employee.salary?.deductions || 0);

  return (
    <DashboardLayout>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 24, fontSize: 13, padding: 0, fontFamily: 'var(--font-body)' }}>
        ← Back
      </button>

      {/* Header Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="emp-avatar" style={{ width: 80, height: 80, borderRadius: 20, fontSize: 28 }}>
            {employee.profilePicture?.url
              ? <img src={employee.profilePicture.url} alt={employee.firstName} />
              : initials(employee)}
          </div>
          <button onClick={() => avatarInputRef.current?.click()}
            style={{ position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: '50%', background: 'var(--violet)', border: '2px solid var(--bg-card)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            {uploadingAvatar ? '⟳' : '✎'}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarUpload(e.target.files[0])} />
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
              {employee.firstName} {employee.lastName}
            </h1>
            <span className={`badge ${employee.isActive ? 'badge-active' : 'badge-inactive'}`}>
              {employee.isActive ? '● Active' : '● Inactive'}
            </span>
            {employee.employeeId && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--violet-light)', background: 'var(--violet-dim)', padding: '3px 10px', borderRadius: 99 }}>
                {employee.employeeId}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
            {employee.designation || 'No designation'}
            {employee.department?.name ? ` · ${employee.department.name}` : ''}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{employee.email}</div>
        </div>

        {isAdminOrHR && (
          <button className="btn-primary" style={{ padding: '10px 20px', width: 'auto', fontSize: 13 }}
            onClick={() => setShowEditModal(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 6, width: 'fit-content' }}>
        {['overview', 'documents', 'salary'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', border: 'none', borderRadius: 'var(--radius-md)', background: activeTab === tab ? 'var(--violet)' : 'transparent', color: activeTab === tab ? 'white' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { title: 'Personal Information', fields: [
              { label: 'Full Name',    value: `${employee.firstName} ${employee.lastName}` },
              { label: 'Email',        value: employee.email },
              { label: 'Phone',        value: employee.phone || '—' },
              { label: 'Gender',       value: employee.gender?.replace(/_/g, ' ') || '—' },
              { label: 'Date of Birth',value: fmt(employee.dateOfBirth) },
            ]},
            { title: 'Work Information', fields: [
              { label: 'Employee ID',     value: employee.employeeId || '—' },
              { label: 'Department',      value: employee.department?.name || '—' },
              { label: 'Role',            value: employee.role?.name || '—' },
              { label: 'Designation',     value: employee.designation || '—' },
              { label: 'Employment Type', value: employee.employmentType?.replace(/_/g, ' ') || '—' },
              { label: 'Date of Joining', value: fmt(employee.dateOfJoining) },
            ]},
            { title: 'Address', fields: [
              { label: 'Street',  value: employee.address?.street  || '—' },
              { label: 'City',    value: employee.address?.city    || '—' },
              { label: 'State',   value: employee.address?.state   || '—' },
              { label: 'Country', value: employee.address?.country || '—' },
              { label: 'Pincode', value: employee.address?.pincode || '—' },
            ]},
            { title: 'Emergency Contact', fields: [
              { label: 'Name',         value: employee.emergencyContact?.name         || '—' },
              { label: 'Relationship', value: employee.emergencyContact?.relationship || '—' },
              { label: 'Phone',        value: employee.emergencyContact?.phone        || '—' },
            ]},
          ].map(s => (
            <div key={s.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div className="form-section-title">{s.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.fields.map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div className="form-section-title">📎 Upload Document</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Document Name</label>
                <input className="form-input" placeholder="e.g. Aadhaar Card" value={docUpload.name} onChange={e => setDocUpload(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docUpload.type} onChange={e => setDocUpload(d => ({ ...d, type: e.target.value }))}>
                  {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <button className="btn-primary" style={{ padding: '10px 18px', width: 'auto', fontSize: 13 }} onClick={() => docInputRef.current?.click()}>
                Upload
              </button>
            </div>
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => handleDocUpload(e.target.files[0])} />
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {!employee.documents?.length ? (
              <div className="empty-state"><div className="empty-icon">📁</div><div className="empty-title">No documents</div></div>
            ) : (
              <table>
                <thead><tr><th>Name</th><th>Type</th><th>Uploaded</th><th>Actions</th></tr></thead>
                <tbody>
                  {employee.documents.map(doc => (
                    <tr key={doc._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{doc.name}</td>
                      <td><span className="badge badge-full-time">{DOC_TYPE_LABELS[doc.type] || doc.type}</span></td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="action-btns">
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            <button className="action-btn" title="View">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </a>
                          {isAdminOrHR && (
                            <button className="action-btn danger" title="Delete" onClick={() => handleDeleteDoc(doc._id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Salary */}
      {activeTab === 'salary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { label: 'Basic Salary', value: employee.salary?.basic      || 0, color: '#a78bfa' },
            { label: 'HRA',          value: employee.salary?.hra        || 0, color: '#60a5fa' },
            { label: 'Allowances',   value: employee.salary?.allowances || 0, color: 'var(--success)' },
            { label: 'Deductions',   value: employee.salary?.deductions || 0, color: 'var(--error)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 8 }}>₹{s.value.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)' }}>{s.label}</div>
            </div>
          ))}
          <div style={{ background: 'var(--bg-card)', border: '2px solid var(--violet)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center', gridColumn: '1 / -1', boxShadow: 'var(--shadow-violet)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gross Monthly Salary (CTC)</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ₹{gross.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      <EmployeeModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={fetchEmployee} employee={employee} />
    </DashboardLayout>
  );
};

export default EmployeeProfile;
