import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Fleet } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, Building2, Phone, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Fleets() {
  const navigate = useNavigate();
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchFleets();
  }, [page, statusFilter, search]);

  const fetchFleets = async () => {
    setLoading(true);

    let query = supabase
      .from('fleets')
      .select('*', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setFleets(data);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const columns = [
    {
      key: 'company_name',
      header: 'Empresa',
      render: (fleet: Fleet) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{fleet.company_name}</p>
            <p className="font-mono text-sm text-muted-foreground">{fleet.cnpj}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (fleet: Fleet) => (
        <div>
          <p className="font-medium text-foreground">{fleet.contact_name || 'N/A'}</p>
          {fleet.contact_phone && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" /> {fleet.contact_phone}
            </p>
          )}
          {fleet.contact_email && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" /> {fleet.contact_email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (fleet: Fleet) => <StatusBadge status={fleet.status} />,
    },
    {
      key: 'created_at',
      header: 'Cadastro',
      render: (fleet: Fleet) => (
        <span className="text-sm text-muted-foreground">
          {format(parseISO(fleet.created_at), 'dd/MM/yyyy')}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Frotas"
      subtitle="Gerenciamento de frotas parceiras"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou CNPJ..."
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
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
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
        data={fleets}
        columns={columns}
        keyExtractor={(fleet) => fleet.id}
        onRowClick={(fleet) => navigate(`/fleets/${fleet.id}`)}
        loading={loading}
        emptyMessage="Nenhuma frota encontrada"
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
