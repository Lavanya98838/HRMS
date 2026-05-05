import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI } from '../../utils/phase2Api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const EMPLOYMENT_LABELS = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract:  'Contract',
  intern:    'Intern',
};

const EmployeeTable = ({ searchQuery, onEdit, onRefresh, refreshTrigger }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ department: '', employmentType: '', isActive: 'true' });
  const [departments, setDepartments] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.department && { department: filters.department }),
        ...(filters.employmentType && { employmentType: filters.employmentType }),
        isActive: filters.isActive,
      };
      const res = await employeeAPI.getAll(params);
      setEmployees(res.data.data.employees);
      setPagination(prev => ({ ...prev, ...res.data.data.pagination }));
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, searchQuery, filters, refreshTrigger]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Reset to page 1 when search/filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchQuery, filters]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);

  return (
    <div className="table-container">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <select
            className="filter-select"
            value={filters.employmentType}
            onChange={e => setFilters(f => ({ ...f, employmentType: e.target.value }))}
          >
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>

          <select
            className="filter-select"
            value={filters.isActive}
            onChange={e => setFilters(f => ({ ...f, isActive: e.target.value }))}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>
        </div>

        <div className="table-toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {pagination.total} employee{pagination.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 16, width: j === 0 ? 200 : 100, borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <div className="empty-title">No employees found</div>
                    <div className="empty-desc">
                      {searchQuery ? `No results for "${searchQuery}"` : 'Start by adding your first employee'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp._id}>
                  {/* Employee name + avatar */}
                  <td>
                    <div className="emp-info">
                      <div className="emp-avatar">
                        {emp.profilePicture?.url
                          ? <img src={emp.profilePicture.url} alt={emp.firstName} />
                          : getInitials(emp.firstName, emp.lastName)
                        }
                      </div>
                      <div>
                        <div className="emp-name">{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--violet-light)' }}>
                      {emp.employeeId || '—'}
                    </span>
                  </td>
                  <td>{emp.department?.name || '—'}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{emp.designation || '—'}</td>
                  <td>
                    <span className={`badge badge-${emp.employmentType?.replace('_', '-')}`}>
                      {EMPLOYMENT_LABELS[emp.employmentType] || emp.employmentType}
                    </span>
                  </td>
                  <td>{formatDate(emp.dateOfJoining)}</td>
                  <td>
                    <span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {emp.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      {/* View */}
                      <button
                        className="action-btn"
                        title="View Profile"
                        onClick={() => navigate(`/${user?.role}/employees/${emp._id}`)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      {/* Edit */}
                      {isAdminOrHR && (
                        <button
                          className="action-btn"
                          title="Edit Employee"
                          onClick={() => onEdit(emp)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                      {/* Delete */}
                      {user?.role === 'admin' && (
                        <button
                          className="action-btn danger"
                          title="Delete Employee"
                          onClick={() => handleDelete(emp._id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 10 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * 10) + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >‹</button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  className={`page-btn ${pagination.page === page ? 'active' : ''}`}
                  onClick={() => setPagination(p => ({ ...p, page }))}
                >
                  {page}
                </button>
              );
            })}

            <button
              className="page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTable;
