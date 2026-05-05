import { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Prevents double-wrapping when both App.jsx layout AND page use DashboardLayout
const LayoutContext = createContext(false);

const DashboardLayout = ({ children, onSearch, searchPlaceholder }) => {
  const [collapsed, setCollapsed] = useState(false);
  const alreadyWrapped = useContext(LayoutContext);

  // If a parent already rendered this layout, just pass children through
  if (alreadyWrapped) return <>{children}</>;

  return (
    <LayoutContext.Provider value={true}>
      <div className="dashboard-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className={`main-content ${collapsed ? 'main-content-collapsed' : ''}`}>
          <Topbar onSearch={onSearch} searchPlaceholder={searchPlaceholder} />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
};

export default DashboardLayout;