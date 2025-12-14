import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      {/* Main Content */}
      <main className="lg:pl-64 transition-all duration-300">
        {/* Top padding for mobile header */}
        <div className="h-14 lg:h-0" />
        
        {/* Page Header */}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:top-0">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
