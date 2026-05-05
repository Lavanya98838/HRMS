import DashboardLayout from '../components/layout/DashboardLayout';
const EmployeeLayout = ({ children, onSearch, searchPlaceholder }) => (
  <DashboardLayout onSearch={onSearch} searchPlaceholder={searchPlaceholder}>{children}</DashboardLayout>
);
export default EmployeeLayout;