import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AuditLog } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Download, Eye } from 'lucide-react';
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
} from '@/components/ui/dialog';

interface AuditLogWithActor extends Omit<AuditLog, 'actor'> {
  actor?: { name: string; email: string } | null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogWithActor | null>(null);
  const pageSize = 15;

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter, search]);

  const fetchLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_user_id_fkey(name, email)', { count: 'exact' });

    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    if (search) {
      query = query.or(`entity_id.ilike.%${search}%,action.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setLogs(data as unknown as AuditLogWithActor[]);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-success/20 text-success';
      case 'update':
        return 'bg-info/20 text-info';
      case 'delete':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Data/Hora',
      render: (log: AuditLogWithActor) => (
        <span className="text-sm">
          {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Usuário',
      render: (log: AuditLogWithActor) => (
        <div>
          <p className="font-medium text-foreground">
            {log.actor?.name || 'Sistema'}
          </p>
          {log.actor?.email && (
            <p className="text-sm text-muted-foreground">{log.actor.email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Ação',
      render: (log: AuditLogWithActor) => (
        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entidade',
      render: (log: AuditLogWithActor) => (
        <Badge variant="outline" className="capitalize">
          {log.entity_type}
        </Badge>
      ),
    },
    {
      key: 'entity_id',
      header: 'ID',
      render: (log: AuditLogWithActor) => (
        <span className="font-mono text-sm text-muted-foreground">
          {log.entity_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Detalhes',
      render: (log: AuditLogWithActor) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          <Eye className="mr-1 h-4 w-4" />
          Ver
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Auditoria"
      subtitle="Log de alterações do sistema"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por ID ou ação..."
            className="w-full sm:w-64"
          />

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="trips">Corridas</SelectItem>
              <SelectItem value="payments">Pagamentos</SelectItem>
              <SelectItem value="drivers">Motoristas</SelectItem>
              <SelectItem value="fleets">Frotas</SelectItem>
              <SelectItem value="documents">Documentos</SelectItem>
              <SelectItem value="payouts">Repasses</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="create">Criar</SelectItem>
              <SelectItem value="update">Atualizar</SelectItem>
              <SelectItem value="delete">Excluir</SelectItem>
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
        data={logs}
        columns={columns}
        keyExtractor={(log) => log.id}
        loading={loading}
        emptyMessage="Nenhum log encontrado"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Alteração</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ação</p>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entidade</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedLog.entity_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{selectedLog.entity_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="text-sm">
                    {format(parseISO(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
              </div>

              {selectedLog.before_json && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Antes
                  </p>
                  <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.before_json, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_json && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Depois
                  </p>
                  <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.after_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
