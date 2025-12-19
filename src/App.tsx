import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleRoute, RootRedirect, Unauthorized } from "@/components/routing";

import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import Payments from "./pages/Payments";
import Drivers from "./pages/Drivers";
import DriverDetail from "./pages/DriverDetail";
import Fleets from "./pages/Fleets";
import FleetDetail from "./pages/FleetDetail";

import Payouts from "./pages/Payouts";
import AuditLogs from "./pages/AuditLogs";
import Users from "./pages/Users";
import Suppliers from "./pages/Suppliers";
import FinancialReports from "./pages/FinancialReports";

// Driver pages
import {
  DriverAvailableTrips,
  DriverMyTrips,
  DriverPayouts as DriverPayoutsPage,
  DriverDocuments,
  DriverProfileForm,
} from "./pages/driver";

const queryClient = new QueryClient();

const FleetPlaceholder = () => (
  <div className="p-6">
    <h1 className="text-xl font-semibold">Painel da Frota</h1>
    <p className="text-muted-foreground mt-2">
      Em construção: Motoristas, Veículos, Corridas e Faturação.
    </p>
  </div>
);

const AppRoutes = () => (
  <Routes>
    {/* Auth */}
    <Route path="/auth" element={<Auth />} />

    {/* Root → redirect based on primaryRole */}
    <Route path="/" element={<RootRedirect />} />

    {/* Unauthorized */}
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* ADMIN / STAFF routes */}
    <Route path="/admin" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Dashboard /></RoleRoute>} />
    <Route path="/admin/trips" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Trips /></RoleRoute>} />
    <Route path="/admin/trips/:id" element={<RoleRoute allow={["ADMIN", "STAFF"]}><TripDetail /></RoleRoute>} />
    <Route path="/admin/payments" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Payments /></RoleRoute>} />
    <Route path="/admin/drivers" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Drivers /></RoleRoute>} />
    <Route path="/admin/drivers/:id" element={<RoleRoute allow={["ADMIN", "STAFF"]}><DriverDetail /></RoleRoute>} />
    <Route path="/admin/fleets" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Fleets /></RoleRoute>} />
    <Route path="/admin/fleets/:id" element={<RoleRoute allow={["ADMIN", "STAFF"]}><FleetDetail /></RoleRoute>} />
    
    <Route path="/admin/payouts" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Payouts /></RoleRoute>} />
    <Route path="/admin/audit" element={<RoleRoute allow={["ADMIN", "STAFF"]}><AuditLogs /></RoleRoute>} />
    <Route path="/admin/users" element={<RoleRoute allow={["ADMIN"]}><Users /></RoleRoute>} />
    <Route path="/admin/suppliers" element={<RoleRoute allow={["ADMIN", "STAFF"]}><Suppliers /></RoleRoute>} />
    <Route path="/admin/reports" element={<RoleRoute allow={["ADMIN", "STAFF"]}><FinancialReports /></RoleRoute>} />

    {/* DRIVER routes */}
    <Route path="/driver" element={<RoleRoute allow={["DRIVER"]}><DriverAvailableTrips /></RoleRoute>} />
    <Route path="/driver/available" element={<RoleRoute allow={["DRIVER"]}><DriverAvailableTrips /></RoleRoute>} />
    <Route path="/driver/register" element={<RoleRoute allow={["DRIVER"]}><DriverProfileForm /></RoleRoute>} />
    <Route path="/driver/my-trips" element={<RoleRoute allow={["DRIVER"]}><DriverMyTrips /></RoleRoute>} />
    <Route path="/driver/payouts" element={<RoleRoute allow={["DRIVER"]}><DriverPayoutsPage /></RoleRoute>} />
    <Route path="/driver/documents" element={<RoleRoute allow={["DRIVER"]}><DriverDocuments /></RoleRoute>} />

    {/* FLEET routes */}
    <Route path="/fleet" element={<RoleRoute allow={["FLEET"]}><FleetPlaceholder /></RoleRoute>} />

    {/* Not Found */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
