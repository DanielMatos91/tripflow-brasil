import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function RootRedirect() {
  const { loading, user, homePath } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return <Navigate to={homePath || "/unauthorized"} replace />;
}
