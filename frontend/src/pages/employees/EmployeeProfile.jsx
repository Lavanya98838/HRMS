import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeAPI } from '../../utils/phase2Api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmployeeModal from '../../components/employees/EmployeeModal';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const DOC_TYPE_LABELS = {
  resume: 'Resume', id_proof: 'ID Proof', contract: 'Contract',
  certificate: 'Certificate', other: 'Other',
};

// ── Edit Info Modal (for employees editing their own profile) ──
const EditInfoModal = ({ employee, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    phone: employee.phone || '',
    gender: employee.gender || 'prefer_not_to_say',
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
    address: {
      street:  employee.address?.street  || '',
      city:    employee.address?.city    || '',
      state:   employee.address?.state   || '',
      country: employee.address?.country || '',
      pincode: employee.address?.pincode || '',
    },
    emergencyContact: {
      name:         employee.emergencyContact?.name         || '',
      relationship: employee.emergencyContact?.relationship || '',
      phone:        employee.emergencyContact?.phone        || '',
    },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await employeeAPI.update(employee._id, form);
      toast.success('Profile updated!');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block',
  };

  const sectionStyle = {
    fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16, marginTop: 20,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Edit My Info</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {/* Personal */}
        <div style={sectionStyle}>Personal Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Date of Birth</label>
            <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
          </div>
        </div>

        {/* Address */}
        <div style={sectionStyle}>Address</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Street', key: 'street', full: true },
            { label: 'City',    key: 'city' },
            { label: 'State',   key: 'state' },
            { label: 'Country', key: 'country' },
            { label: 'Pincode', key: 'pincode' },
          ].map(f => (
            <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
              <label style={labelStyle}>{f.label}</label>
              <input style={inputStyle} value={form.address[f.key]} onChange={e => setForm(p => ({ ...p, address: { ...p.address, [f.key]: e.target.value } }))} placeholder={f.label} />
            </div>
          ))}
        </div>

        {/* Emergency Contact */}
        <div style={sectionStyle}>Emergency Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Name',         key: 'name' },
            { label: 'Relationship', key: 'relationship' },
            { label: 'Phone',        key: 'phone', full: true },
          ].map(f => (
            <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
              <label style={labelStyle}>{f.label}</label>
              <input style={inputStyle} value={form.emergencyContact[f.key]} onChange={e => setForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [f.key]: e.target.value } }))} placeholder={f.label} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--grad-primary)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────
const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const avatarInputRef = useRef();
  const docInputRef    = useRef();

  const [employee,       setEmployee]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [noProfile,      setNoProfile]      = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [showSelfEdit,   setShowSelfEdit]   = useState(false);
  const [activeTab,      setActiveTab]      = useState('overview');
  const [uploadingAvatar,setUploadingAvatar]= useState(false);
  const [docUpload,      setDocUpload]      = useState({ name: '', type: 'other' });
  const [myDocs,         setMyDocs]         = useState([]);
  const [docsLoading,    setDocsLoading]    = useState(false);

  const isAdminOrHR  = ['admin', 'hr'].includes(user?.role);
  const isOwnProfile = !id; // no ID in URL = own profile

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    setNoProfile(false);
    try {
      if (id) {
        const res = await employeeAPI.getById(id);
        setEmployee(res.data.data.employee);
      } else {
        const res = await employeeAPI.getAll({ limit: 200, page: 1 });
        const all  = res.data.data.employees || [];
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
    } catch {
      setNoProfile(true);
    } finally {
      setLoading(false);
    }
  }, [id, user?.email]);

  const fetchMyDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await api.get('/documents/my');
      setMyDocs(res.data.data.documents || []);
    } catch {
      setMyDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);
  useEffect(() => { if (activeTab === 'documents') fetchMyDocs(); }, [activeTab, fetchMyDocs]);

  const handleAvatarUpload = async (file) => {
    if (!file || !employee) return;
    setUploadingAvatar(true);
    try {
      await employeeAPI.uploadAvatar(employee._id, file);
      toast.success('Profile picture updated!');
      await fetchEmployee();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDocUpload = async (file) => {
    if (!file || !docUpload.name.trim()) { toast.error('Enter document name first'); return; }
    try {
      await employeeAPI.uploadDocument(employee._id, file, docUpload.name, docUpload.type);
      toast.success('Document uploaded!');
      setDocUpload({ name: '', type: 'other' });
      fetchMyDocs();
    } catch { toast.error('Failed to upload document'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted');
      fetchMyDocs();
    } catch { toast.error('Failed to delete document'); }
  };

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const initials = (e) =>
    `${e?.firstName?.[0] || ''}${e?.lastName?.[0] || ''}`.toUpperCase();

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400, gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--violet)', animation: 'spin-slow 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading profile...</p>
      </div>
    </DashboardLayout>
  );

  if (noProfile || !employee) return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 56, opacity: 0.4 }}>👤</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-secondary)' }}>No Employee Profile Found</div>
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
      {id && (
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 24, fontSize: 13, padding: 0, fontFamily: 'var(--font-body)' }}>
          ← Back
        </button>
      )}

      {/* Header Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="emp-avatar" style={{ width: 80, height: 80, borderRadius: 20, fontSize: 28 }}>
            {employee.profilePicture?.url
              ? <img src={`${employee.profilePicture.url}?t=${Date.now()}`} alt={employee.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
              : initials(employee)}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            title="Change profile picture"
            style={{ position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: '50%', background: 'var(--violet)', border: '2px solid var(--bg-card)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
          >
            {uploadingAvatar ? '⏳' : '✎'}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ''; }} />
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

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {isOwnProfile && (
            <button
              className="btn-ghost"
              style={{ padding: '10px 20px', fontSize: 13 }}
              onClick={() => setShowSelfEdit(true)}
            >
              ✎ Edit My Info
            </button>
          )}
          {isAdminOrHR && (
            <button
              className="btn-primary"
              style={{ padding: '10px 20px', width: 'auto', fontSize: 13 }}
              onClick={() => setShowEditModal(true)}
            >
              ✎ Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 6, width: 'fit-content' }}>
        {['overview', 'documents', 'salary'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', border: 'none', borderRadius: 'var(--radius-md)',
            background: activeTab === tab ? 'var(--violet)' : 'transparent',
            color: activeTab === tab ? 'white' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
          }}>
            {tab === 'documents' ? `Documents${myDocs.length > 0 ? ` (${myDocs.length})` : ''}` : tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
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

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload section */}
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
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) { handleDocUpload(e.target.files[0]); e.target.value = ''; } }} />
          </div>

          {/* Documents list */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {docsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading documents...</div>
            ) : myDocs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <div className="empty-title">No documents</div>
                <div className="empty-desc">Upload your documents using the form above</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myDocs.map(doc => (
                    <tr key={doc._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{doc.name}</td>
                      <td><span className="badge badge-full-time">{doc.category || 'other'}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.fileType?.toUpperCase() || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(doc.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="action-btns">
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                            <button className="action-btn" title="View">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          </a>
                          <button className="action-btn danger" title="Delete" onClick={() => handleDeleteDoc(doc._id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
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

      {/* ── Salary Tab ── */}
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

      {/* Modals */}
      {showEditModal && <EmployeeModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={fetchEmployee} employee={employee} />}
      {showSelfEdit  && <EditInfoModal employee={employee} onClose={() => setShowSelfEdit(false)} onSuccess={fetchEmployee} />}
    </DashboardLayout>
  );
};

export default EmployeeProfile;