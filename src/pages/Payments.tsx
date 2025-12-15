import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Payment, Trip } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, CreditCard, Smartphone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentWithTrip extends Payment {
  trip?: Trip;
}

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, methodFilter, search]);

  const fetchPayments = async () => {
    setLoading(true);

    let query = supabase
      .from('payments')
      .select('*, trip:trips(*)', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'pending' | 'paid' | 'failed' | 'refunded');
    }

    if (methodFilter !== 'all') {
      query = query.eq('method', methodFilter as 'PIX' | 'CARD');
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setPayments(data as PaymentWithTrip[]);
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
      key: 'created_at',
      header: 'Data',
      render: (payment: PaymentWithTrip) => (
        <div>
          <p className="font-medium">
            {format(parseISO(payment.created_at), 'dd/MM/yyyy')}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(payment.created_at), 'HH:mm')}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (payment: PaymentWithTrip) => (
        <div>
          <p className="font-medium text-foreground">
            {payment.trip?.customer_name || 'N/A'}
          </p>
          <p className="text-sm text-muted-foreground">
            {payment.trip?.customer_phone}
          </p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (payment: PaymentWithTrip) => (
        <Badge variant="outline" className="font-mono">
          {payment.method === 'PIX' ? (
            <Smartphone className="mr-1 h-3 w-3" />
          ) : (
            <CreditCard className="mr-1 h-3 w-3" />
          )}
          {payment.method}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (payment: PaymentWithTrip) => (
        <div>
          <p className="font-medium text-foreground">
            {formatCurrency(Number(payment.amount))}
          </p>
          {payment.gateway_fees && (
            <p className="text-xs text-muted-foreground">
              Taxa: {formatCurrency(Number(payment.gateway_fees))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment: PaymentWithTrip) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'paid_at',
      header: 'Pago em',
      render: (payment: PaymentWithTrip) =>
        payment.paid_at ? (
          <span className="text-sm text-muted-foreground">
            {format(parseISO(payment.paid_at), 'dd/MM HH:mm')}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <AdminLayout
      title="Pagamentos"
      subtitle="Gerenciamento de pagamentos"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar..."
            className="w-full sm:w-64"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="CARD">Cartão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={payments}
        columns={columns}
        keyExtractor={(payment) => payment.id}
        onRowClick={(payment) => navigate(`/admin/trips/${payment.trip_id}`)}
        loading={loading}
        emptyMessage="Nenhum pagamento encontrado"
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
