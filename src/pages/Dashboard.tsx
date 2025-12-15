import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Payment, Driver, Document } from '@/types/database';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Car,
  CreditCard,
  TrendingUp,
  Users,
  FileWarning,
  Clock,
  AlertCircle,
  CalendarDays,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalTripsToday: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingDrivers: number;
  pendingDocuments: number;
  publishedTrips: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTripsToday: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    pendingDrivers: 0,
    pendingDocuments: 0,
    publishedTrips: 0,
  });
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [failedPayments, setFailedPayments] = useState<Payment[]>([]);
  const [pendingDriversList, setPendingDriversList] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch stats
    const [
      { count: tripsToday },
      { data: revenueData },
      { count: pendingPay },
      { count: pendingDrv },
      { count: pendingDoc },
      { count: published },
      { data: upcoming },
      { data: failed },
      { data: drivers },
    ] = await Promise.all([
      supabase.from('trips').select('*', { count: 'exact', head: true })
        .gte('pickup_datetime', today.toISOString())
        .lt('pickup_datetime', tomorrow.toISOString()),
      supabase.from('payments').select('amount').eq('status', 'paid'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('verified', false),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      supabase.from('trips').select('*')
        .gte('pickup_datetime', new Date().toISOString())
        .order('pickup_datetime', { ascending: true })
        .limit(5),
      supabase.from('payments').select('*, trip:trips(*)').eq('status', 'failed').limit(5),
      supabase.from('drivers').select('*').eq('verified', false).limit(5),
    ]);

    const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalTripsToday: tripsToday || 0,
      totalRevenue,
      pendingPayments: pendingPay || 0,
      pendingDrivers: pendingDrv || 0,
      pendingDocuments: pendingDoc || 0,
      publishedTrips: published || 0,
    });

    setUpcomingTrips(upcoming || []);
    setFailedPayments(failed || []);
    setPendingDriversList(drivers || []);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Hoje, ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Amanhã, ${format(date, 'HH:mm')}`;
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <AdminLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema"
    >
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard
          title="Corridas Hoje"
          value={stats.totalTripsToday}
          icon={Car}
          variant="primary"
        />
        <KpiCard
          title="Receita Total"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          variant="success"
        />
        <KpiCard
          title="Corridas Publicadas"
          value={stats.publishedTrips}
          subtitle="Aguardando motorista"
          icon={Clock}
          variant="info"
        />
        <KpiCard
          title="Pagamentos Pendentes"
          value={stats.pendingPayments}
          icon={CreditCard}
          variant="warning"
        />
      </div>

      {/* Alerts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.pendingDrivers > 0 && (
          <Link to="/admin/drivers">
            <Card className="border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                  <Users className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{stats.pendingDrivers} motoristas aguardando verificação</p>
                  <p className="text-sm text-muted-foreground">Clique para revisar</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {stats.pendingDocuments > 0 && (
          <Link to="/admin/documents">
            <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                  <FileWarning className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{stats.pendingDocuments} documentos pendentes</p>
                  <p className="text-sm text-muted-foreground">Clique para revisar</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {stats.pendingPayments > 0 && (
          <Link to="/admin/payments">
            <Card className="border-info/30 bg-info/5 hover:bg-info/10 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/20">
                  <Wallet className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{stats.pendingPayments} pagamentos pendentes</p>
                  <p className="text-sm text-muted-foreground">Clique para visualizar</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Trips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Próximas Corridas</CardTitle>
            <Link to="/admin/trips">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhuma corrida agendada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/admin/trips/${trip.id}`}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{trip.customer_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {trip.origin_text} → {trip.destination_text}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={trip.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(trip.pickup_datetime)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Pagamentos com Problema</CardTitle>
            <Link to="/admin/payments">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {failedPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum pagamento com problema</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failedPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    to={`/admin/payments/${payment.id}`}
                    className="flex items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {(payment.trip as Trip)?.customer_name || 'Cliente'}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={payment.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(parseISO(payment.created_at), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
