import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layout/DashboardLayout";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminContractDetailsPage } from "../features/admin/pages/AdminContractDetailsPage";
import { ClientDashboardPage } from "../features/client/pages/ClientDashboardPage";
import { ClientContractDetailsPage } from "../features/client/pages/ClientContractDetailsPage";
import { SimulationPage } from "../features/simulation/pages/SimulationPage";
import { AgentWorkspacePage } from "../features/agents/pages/AgentWorkspacePage";

function App() {
  return (
    <ImpersonationProvider>
      <Routes>
        <Route path="/" element={<AgentWorkspacePage />} />
        <Route path="/agentes" element={<AgentWorkspacePage />} />
        <Route element={<DashboardLayout />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/contratos/:contractId" element={<AdminContractDetailsPage />} />
          <Route path="cliente" element={<ClientDashboardPage />} />
          <Route path="cliente/contratos/:contractId" element={<ClientContractDetailsPage />} />
          <Route path="cliente/ofertas/:offerId/simulacao" element={<SimulationPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </ImpersonationProvider>
  );
}

export default App;
