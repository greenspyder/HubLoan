import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layout/DashboardLayout";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminContractDetailsPage } from "../features/admin/pages/AdminContractDetailsPage";
import { ClientDashboardPage } from "../features/client/pages/ClientDashboardPage";
import { SimulationPage } from "../features/simulation/pages/SimulationPage";

function App() {
  return (
    <ImpersonationProvider>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/admin" replace />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/contratos/:contractId" element={<AdminContractDetailsPage />} />
          <Route path="cliente" element={<ClientDashboardPage />} />
          <Route path="cliente/ofertas/:offerId/simulacao" element={<SimulationPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </ImpersonationProvider>
  );
}

export default App;