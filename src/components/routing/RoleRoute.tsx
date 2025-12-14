import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types/database";
import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  children: React.ReactNode;
  allow: AppRole[];
}

export function RoleRoute({ children, allow }: RoleRouteProps) {
  const { user, loading, roles } = useAuth();

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

  if (allow.length > 0) {
    const hasPermission = allow.some((role) => roles.includes(role));
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
