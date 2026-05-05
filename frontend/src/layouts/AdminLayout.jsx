import DashboardLayout from '../components/layout/DashboardLayout';
const AdminLayout = ({ children, onSearch, searchPlaceholder }) => (
  <DashboardLayout onSearch={onSearch} searchPlaceholder={searchPlaceholder}>{children}</DashboardLayout>
);
export default AdminLayout;