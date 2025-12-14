import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Trip } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Download, Users, Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TripForm } from '@/components/trips/TripForm';

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchTrips();
  }, [page, statusFilter, search]);

  const fetchTrips = async () => {
    setLoading(true);

    let query = supabase
      .from('trips')
      .select('*', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'DRAFT' | 'PENDING_PAYMENT' | 'PUBLISHED' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'REFUNDED');
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,origin_text.ilike.%${search}%,destination_text.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('pickup_datetime', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setTrips(data);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const columns = [
    {
      key: 'pickup_datetime',
      header: 'Data/Hora',
      render: (trip: Trip) => (
        <div>
          <p className="font-medium">
            {format(parseISO(trip.pickup_datetime), "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(trip.pickup_datetime), "HH:mm")}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (trip: Trip) => (
        <div>
          <p className="font-medium text-foreground">{trip.customer_name}</p>
          <p className="text-sm text-muted-foreground">{trip.customer_phone}</p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Trajeto',
      render: (trip: Trip) => (
        <div className="max-w-xs">
          <p className="truncate font-medium text-foreground">{trip.origin_text}</p>
          <p className="truncate text-sm text-muted-foreground">→ {trip.destination_text}</p>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Detalhes',
      render: (trip: Trip) => (
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {trip.passengers}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {trip.luggage}
          </span>
        </div>
      ),
    },
    {
      key: 'price_customer',
      header: 'Valor',
      render: (trip: Trip) => (
        <div>
          <p className="font-medium text-foreground">{formatCurrency(trip.price_customer)}</p>
          <p className="text-xs text-muted-foreground">
            Repasse: {formatCurrency(trip.payout_driver)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (trip: Trip) => <StatusBadge status={trip.status} />,
    },
  ];

  return (
    <AdminLayout
      title="Corridas"
      subtitle="Gerenciamento de corridas"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar cliente, telefone, origem ou destino..."
            className="w-full sm:w-80"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="PENDING_PAYMENT">Aguardando Pagamento</SelectItem>
              <SelectItem value="PUBLISHED">Publicada</SelectItem>
              <SelectItem value="CLAIMED">Aceita</SelectItem>
              <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
              <SelectItem value="COMPLETED">Concluída</SelectItem>
              <SelectItem value="CANCELED">Cancelada</SelectItem>
              <SelectItem value="REFUNDED">Reembolsada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Corrida
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Corrida</DialogTitle>
              </DialogHeader>
              <TripForm
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchTrips();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={trips}
        columns={columns}
        keyExtractor={(trip) => trip.id}
        onRowClick={(trip) => navigate(`/trips/${trip.id}`)}
        loading={loading}
        emptyMessage="Nenhuma corrida encontrada"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />
    </AdminLayout>
  );
}
