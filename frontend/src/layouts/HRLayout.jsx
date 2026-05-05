import DashboardLayout from '../components/layout/DashboardLayout';
const HRLayout = ({ children, onSearch, searchPlaceholder }) => (
  <DashboardLayout onSearch={onSearch} searchPlaceholder={searchPlaceholder}>{children}</DashboardLayout>
);
export default HRLayout;