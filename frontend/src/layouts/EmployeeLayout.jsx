import DashboardLayout from '../components/layout/DashboardLayout';

/**
 * EmployeeLayout
 * Wrapper for all /employee/* pages (level 1–5).
 * Sidebar auto-detects portal=employee via getPortalFromUser(user).
 */
const EmployeeLayout = ({ children, onSearch, searchPlaceholder }) => {
  return (
    <DashboardLayout onSearch={onSearch} searchPlaceholder={searchPlaceholder}>
      {children}
    </DashboardLayout>
  );
};

export default EmployeeLayout;
