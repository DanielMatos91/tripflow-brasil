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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
    <Route path="/trips/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
    <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
    <Route path="/drivers/:id" element={<ProtectedRoute><DriverDetail /></ProtectedRoute>} />
    <Route path="/fleets" element={<ProtectedRoute><Fleets /></ProtectedRoute>} />
    <Route path="/fleets/:id" element={<ProtectedRoute><FleetDetail /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
    <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
    <Route path="/audit" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
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
