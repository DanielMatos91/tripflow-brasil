import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Payout, Driver, Fleet } from '@/types/database';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Download, CheckCircle, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PayoutWithRelations extends Payout {
  driver?: Driver & { profile?: { name: string } };
  fleet?: Fleet;
}

export default function Payouts() {
  const [payouts, setPayouts] = useState<PayoutWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const pageSize = 10;

  useEffect(() => {
    fetchPayouts();
  }, [page, statusFilter, dateFrom, dateTo]);

  const fetchPayouts = async () => {
    setLoading(true);

    let query = supabase
      .from('payouts')
      .select(
        '*, driver:drivers(*, profile:profiles!drivers_user_id_fkey(name)), fleet:fleets(*)',
        { count: 'exact' }
      );

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setPayouts(data as PayoutWithRelations[]);
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

  const handleMarkAsPaid = async (payoutId: string) => {
    const { error } = await supabase
      .from('payouts')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString(),
      })
      .eq('id', payoutId);

    if (error) {
      toast.error('Erro ao marcar como pago');
    } else {
      toast.success('Repasse marcado como pago');
      fetchPayouts();
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedPayouts.length === 0) return;

    const { error } = await supabase
      .from('payouts')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString(),
      })
      .in('id', selectedPayouts);

    if (error) {
      toast.error('Erro ao marcar repasses como pagos');
    } else {
      toast.success(`${selectedPayouts.length} repasses marcados como pagos`);
      setSelectedPayouts([]);
      fetchPayouts();
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Data', 'Beneficiário', 'Tipo', 'Valor', 'Status', 'Pago em'].join(','),
      ...payouts.map((p) =>
        [
          format(parseISO(p.created_at), 'dd/MM/yyyy'),
          p.driver?.profile?.name || p.fleet?.company_name || 'N/A',
          p.driver_id ? 'Motorista' : 'Frota',
          p.amount,
          p.status,
          p.payment_date ? format(parseISO(p.payment_date), 'dd/MM/yyyy') : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `repasses_${dateFrom}_${dateTo}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso');
  };

  const totalPending = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const columns = [
    {
      key: 'created_at',
      header: 'Data',
      render: (payout: PayoutWithRelations) => (
        <span className="text-sm">
          {format(parseISO(payout.created_at), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'beneficiary',
      header: 'Beneficiário',
      render: (payout: PayoutWithRelations) => (
        <div>
          <p className="font-medium text-foreground">
            {payout.driver?.profile?.name || payout.fleet?.company_name || 'N/A'}
          </p>
          <Badge variant="outline" className="mt-1">
            {payout.driver_id ? 'Motorista' : 'Frota'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'trip_id',
      header: 'Corrida',
      render: (payout: PayoutWithRelations) => (
        <span className="font-mono text-sm text-muted-foreground">
          #{payout.trip_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (payout: PayoutWithRelations) => (
        <span className="font-medium text-foreground">
          {formatCurrency(Number(payout.amount))}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (payout: PayoutWithRelations) => (
        <span className="text-sm text-muted-foreground">
          {payout.method || 'PIX'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payout: PayoutWithRelations) => <StatusBadge status={payout.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (payout: PayoutWithRelations) =>
        payout.status === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-success hover:bg-success/10"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsPaid(payout.id);
            }}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Pagar
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">
            {payout.payment_date
              ? format(parseISO(payout.payment_date), 'dd/MM HH:mm')
              : '-'}
          </span>
        ),
    },
  ];

  return (
    <AdminLayout
      title="Repasses"
      subtitle="Gerenciamento de repasses para motoristas e frotas"
    >
      {/* Summary */}
      <div className="mb-6 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
          </div>
          <div className="flex gap-2">
            {selectedPayouts.length > 0 && (
              <Button onClick={handleBulkMarkAsPaid}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Pagar Selecionados ({selectedPayouts.length})
              </Button>
            )}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        data={payouts}
        columns={columns}
        keyExtractor={(payout) => payout.id}
        loading={loading}
        emptyMessage="Nenhum repasse encontrado"
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
