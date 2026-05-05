import { useState, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmployeeTable from '../../components/employees/EmployeeTable';
import EmployeeModal from '../../components/employees/EmployeeModal';
import BulkUploadModal from '../../components/employees/BulkUploadModal';
import { useAuth } from '../../context/AuthContext';

const EmployeesPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearch = useDebounce(search, 400);
  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleEdit = (emp) => {
    setEditEmployee(emp);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditEmployee(null);
  };

  return (
    <DashboardLayout
      onSearch={setSearch}
      searchPlaceholder="Search employees by name, email, ID..."
    >
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Employee Management</h1>
          <p>Manage your workforce — add, edit, and track all employees</p>
        </div>

        {isAdminOrHR && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn-ghost"
              style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => setShowBulkModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Bulk Upload
            </button>
            <button
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: 13, width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => { setEditEmployee(null); setShowAddModal(true); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Employee Table */}
      <EmployeeTable
        searchQuery={debouncedSearch}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
        refreshTrigger={refreshKey}
      />

      {/* Modals */}
      <EmployeeModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleRefresh}
        employee={editEmployee}
      />

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={handleRefresh}
      />
    </DashboardLayout>
  );
};

export default EmployeesPage;