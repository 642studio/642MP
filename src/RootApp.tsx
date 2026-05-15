import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { StrategyPage } from './features/strategy/StrategyPage';
import { CampaignsPage } from './features/campaigns/CampaignsPage';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { RidersPage } from './features/riders/RidersPage';
import { RiderEditorPage } from './features/riders/RiderEditorPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ProductionBoardPage } from './features/production/ProductionBoardPage';

export default function App() {
  const { ready, session } = useAuth();

  if (!ready) return <div className="boot">Inicializando 642MP...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={session ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="strategy" element={<StrategyPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:campaignId/workspace" element={<WorkspacePage />} />
        <Route path="riders" element={<RidersPage />} />
        <Route path="riders/new" element={<RiderEditorPage />} />
        <Route path="riders/:riderId" element={<RiderEditorPage />} />
        <Route path="production" element={<ProductionBoardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
