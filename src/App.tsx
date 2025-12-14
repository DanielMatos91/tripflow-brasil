import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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
import Documents from "./pages/Documents";
import Payouts from "./pages/Payouts";
import AuditLogs from "./pages/AuditLogs";

import { Loader2 } from "lucide-react";
import { AppRole } from "@/types/database";

const queryClient = new QueryClient();

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: AppRole[];
}) {
  const { user, loading, roles } = useAuth();

  if (loading) return <FullscreenLoader />;

  if (!user) return <Navigate to="/auth" replace />;

  if (allow?.length) {
    const ok = allow.some((r) => roles.includes(r));
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { loading, user, homePath } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return <Navigate to={homePath || "/unauthorized"} replace />;
}

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-md w-full rounded-xl border bg-background p-6">
      <h1 className="text-xl font-semibold mb-2">Sem permissão</h1>
      <p className="text-muted-foreground mb-4">
        Sua conta não tem acesso a esta área. Fale com o administrador para liberar.
      </p>
      <a
        href="/auth"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Voltar
      </a>
    </div>
  </div>
);

const DriverPlaceholder = () => (
  <div className="p-6">
    <h1 className="text-xl font-semibold">Painel do Motorista</h1>
    <p className="text-muted-foreground mt-2">
      Em construção: Corridas disponíveis, Minhas corridas, Documentos e Faturação.
    </p>
  </div>
);

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

    {/* Root → painel certo (admin/driver/fleet) */}
    <Route path="/" element={<RootRedirect />} />

    {/* Unauthorized */}
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* ADMIN / STAFF */}
    <Route
      path="/admin"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/trips"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Trips />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/trips/:id"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <TripDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/payments"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Payments />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/drivers"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Drivers />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/drivers/:id"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <DriverDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/fleets"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Fleets />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/fleets/:id"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <FleetDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/documents"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Documents />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/payouts"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <Payouts />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/audit"
      element={
        <ProtectedRoute allow={["ADMIN", "STAFF"]}>
          <AuditLogs />
        </ProtectedRoute>
      }
    />

    {/* DRIVER */}
    <Route
      path="/driver"
      element={
        <ProtectedRoute allow={["DRIVER"]}>
          <DriverPlaceholder />
        </ProtectedRoute>
      }
    />

    {/* FLEET */}
    <Route
      path="/fleet"
      element={
        <ProtectedRoute allow={["FLEET"]}>
          <FleetPlaceholder />
        </ProtectedRoute>
      }
    />

    {/* Not Found */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
