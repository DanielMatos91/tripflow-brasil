import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/types/database';
import { format, parseISO, isPast, addDays } from 'date-fns';
import { Filter, Download, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; documentId: string | null }>({
    open: false,
    documentId: null,
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const pageSize = 10;

  useEffect(() => {
    fetchDocuments();
  }, [page, statusFilter, typeFilter, search]);

  const fetchDocuments = async () => {
    setLoading(true);

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected' | 'expired');
    }

    if (typeFilter !== 'all') {
      query = query.eq('owner_type', typeFilter);
    }

    if (search) {
      query = query.ilike('doc_type', `%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error && data) {
      setDocuments(data as unknown as Document[]);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const handleApprove = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', docId);

    if (error) {
      toast.error('Erro ao aprovar documento');
    } else {
      toast.success('Documento aprovado');
      fetchDocuments();
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.documentId) return;

    const { error } = await supabase
      .from('documents')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', rejectDialog.documentId);

    if (error) {
      toast.error('Erro ao rejeitar documento');
    } else {
      toast.success('Documento rejeitado');
      fetchDocuments();
    }
    setRejectDialog({ open: false, documentId: null });
    setRejectionReason('');
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiryDate = parseISO(date);
    return !isPast(expiryDate) && isPast(addDays(new Date(), -30));
  };

  const columns = [
    {
      key: 'doc_type',
      header: 'Documento',
      render: (doc: Document) => (
        <div>
          <p className="font-medium capitalize text-foreground">{doc.doc_type}</p>
          <Badge variant="outline" className="mt-1 capitalize">
            {doc.owner_type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'owner_id',
      header: 'ID Proprietário',
      render: (doc: Document) => (
        <span className="font-mono text-sm text-muted-foreground">
          {doc.owner_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Validade',
      render: (doc: Document) => {
        if (!doc.expiry_date) return <span className="text-muted-foreground">-</span>;
        
        const isExpired = isPast(parseISO(doc.expiry_date));
        const expiringSoon = isExpiringSoon(doc.expiry_date);
        
        return (
          <div className="flex items-center gap-2">
            <span className={isExpired ? 'text-destructive' : expiringSoon ? 'text-warning' : ''}>
              {format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}
            </span>
            {isExpired && <AlertTriangle className="h-4 w-4 text-destructive" />}
            {expiringSoon && !isExpired && <AlertTriangle className="h-4 w-4 text-warning" />}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc: Document) => <StatusBadge status={doc.status} />,
    },
    {
      key: 'created_at',
      header: 'Enviado em',
      render: (doc: Document) => (
        <span className="text-sm text-muted-foreground">
          {format(parseISO(doc.created_at), 'dd/MM/yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (doc: Document) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              window.open(doc.file_url, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          {doc.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-success hover:bg-success/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(doc.id);
                }}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectDialog({ open: true, documentId: doc.id });
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Documentos"
      subtitle="Fila de documentos para revisão"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por tipo de documento..."
            className="w-full sm:w-64"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="driver">Motorista</SelectItem>
              <SelectItem value="fleet">Frota</SelectItem>
              <SelectItem value="vehicle">Veículo</SelectItem>
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
        data={documents}
        columns={columns}
        keyExtractor={(doc) => doc.id}
        loading={loading}
        emptyMessage="Nenhum documento encontrado"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Reject Dialog */}
      <AlertDialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          setRejectDialog({ ...rejectDialog, open });
          if (!open) setRejectionReason('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para que o proprietário possa corrigir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
