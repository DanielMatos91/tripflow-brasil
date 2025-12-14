import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Driver } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Filter, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DriverWithProfile extends Omit<Driver, 'profile'> {
  profile?: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

export default function Drivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchDrivers();
  }, [page, statusFilter, verifiedFilter, search]);

  const fetchDrivers = async () => {
    setLoading(true);
    
    let query = supabase
      .from('drivers')
      .select('*, profile:profiles!drivers_user_id_fkey(name, email, phone)', { count: 'exact' });
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'pending' | 'active' | 'inactive' | 'blocked');
    }
    
    if (verifiedFilter !== 'all') {
      query = query.eq('verified', verifiedFilter === 'verified');
    }
    
    if (search) {
      query = query.or(`cpf.ilike.%${search}%,cnh.ilike.%${search}%`);
    }
    
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (!error && data) {
      setDrivers(data as unknown as DriverWithProfile[]);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const columns = [
    {
      key: 'name',
      header: 'Motorista',
      render: (driver: DriverWithProfile) => (
        <div>
          <p className="font-medium text-foreground">{driver.profile?.name || 'N/A'}</p>
          <p className="text-sm text-muted-foreground">{driver.profile?.email}</p>
        </div>
      ),
    },
    {
      key: 'cpf',
      header: 'CPF',
      render: (driver: DriverWithProfile) => (
        <span className="font-mono text-sm">{driver.cpf}</span>
      ),
    },
    {
      key: 'cnh',
      header: 'CNH',
      render: (driver: DriverWithProfile) => (
        <div>
          <span className="font-mono text-sm">{driver.cnh}</span>
          <p className="text-xs text-muted-foreground">
            Validade: {format(parseISO(driver.cnh_expiry), 'dd/MM/yyyy')}
          </p>
        </div>
      ),
    },
    {
      key: 'verified',
      header: 'Verificado',
      render: (driver: DriverWithProfile) => (
        driver.verified ? (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verificado
          </Badge>
        ) : (
          <Badge variant="outline" className="border-warning/50 text-warning">
            <XCircle className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (driver: DriverWithProfile) => <StatusBadge status={driver.status} />,
    },
    {
      key: 'created_at',
      header: 'Cadastro',
      render: (driver: DriverWithProfile) => (
        <span className="text-sm text-muted-foreground">
          {format(parseISO(driver.created_at), 'dd/MM/yyyy')}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Motoristas"
      subtitle="Gerenciamento de motoristas cadastrados"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por CPF ou CNH..."
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

          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Verificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="verified">Verificados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Data Table */}
      <DataTable<DriverWithProfile>
        data={drivers}
        columns={columns}
        keyExtractor={(driver) => driver.id}
        onRowClick={(driver) => navigate(`/drivers/${driver.id}`)}
        loading={loading}
        emptyMessage="Nenhum motorista encontrado"
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
