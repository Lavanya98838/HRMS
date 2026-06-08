import { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SettingsPanel from '../settings/SettingsPanel';
import { useTheme } from '../../context/ThemeContext';

const LayoutContext = createContext(false);

const DashboardInner = ({ children, onSearch, searchPlaceholder }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useTheme();

  const isMini = settings.layout === 'mini';
  const isCollapsed = collapsed || isMini;

  return (
    <>
      <div className="dashboard-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className={`main-content ${isCollapsed ? 'main-content-collapsed' : ''}`}>
          <Topbar
            onSearch={onSearch}
            searchPlaceholder={searchPlaceholder}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

const DashboardLayout = ({ children, onSearch, searchPlaceholder }) => {
  const alreadyWrapped = useContext(LayoutContext);

  if (alreadyWrapped) return <>{children}</>;

  return (
    <LayoutContext.Provider value={true}>
      <DashboardInner onSearch={onSearch} searchPlaceholder={searchPlaceholder}>
        {children}
      </DashboardInner>
    </LayoutContext.Provider>
  );
};

export default DashboardLayout;