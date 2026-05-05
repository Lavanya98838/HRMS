import DashboardLayout from '../components/layout/DashboardLayout';
const SubAdminLayout = ({ children, onSearch, searchPlaceholder }) => (
  <DashboardLayout onSearch={onSearch} searchPlaceholder={searchPlaceholder}>{children}</DashboardLayout>
);
export default SubAdminLayout;