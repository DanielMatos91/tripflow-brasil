import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DriverSidebar } from "./DriverSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DriverLayout({ children, title, subtitle }: DriverLayoutProps) {
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/auth";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DriverSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {title && (
                <div>
                  <h1 className="text-lg font-semibold">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
