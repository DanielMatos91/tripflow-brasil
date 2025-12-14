import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Driver, Document } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Ban,
  ShieldCheck,
  Clock,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
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

interface DriverWithProfile extends Omit<Driver, 'profile'> {
  profile?: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverWithProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'verify' | 'block' | 'activate' | 'reject';
    documentId?: string;
  }>({ open: false, type: 'verify' });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchDriver();
      fetchDocuments();
    }
  }, [id]);

  const fetchDriver = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*, profile:profiles!drivers_user_id_fkey(name, email, phone)')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setDriver(data as unknown as DriverWithProfile);
    }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_type', 'driver')
      .eq('owner_id', id)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data as unknown as Document[]);
    }
  };

  const handleVerify = async () => {
    const { error } = await supabase
      .from('drivers')
      .update({ verified: true, status: 'active' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao verificar motorista');
    } else {
      toast.success('Motorista verificado com sucesso');
      fetchDriver();
    }
    setActionDialog({ open: false, type: 'verify' });
  };

  const handleBlock = async () => {
    const { error } = await supabase
      .from('drivers')
      .update({ status: 'blocked' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao bloquear motorista');
    } else {
      toast.success('Motorista bloqueado');
      fetchDriver();
    }
    setActionDialog({ open: false, type: 'block' });
  };

  const handleActivate = async () => {
    const { error } = await supabase
      .from('drivers')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao ativar motorista');
    } else {
      toast.success('Motorista ativado');
      fetchDriver();
    }
    setActionDialog({ open: false, type: 'activate' });
  };

  const handleApproveDocument = async (docId: string) => {
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

  const handleRejectDocument = async () => {
    if (!actionDialog.documentId) return;

    const { error } = await supabase
      .from('documents')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', actionDialog.documentId);

    if (error) {
      toast.error('Erro ao rejeitar documento');
    } else {
      toast.success('Documento rejeitado');
      fetchDocuments();
    }
    setActionDialog({ open: false, type: 'reject' });
    setRejectionReason('');
  };

  if (loading) {
    return (
      <AdminLayout title="Carregando..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!driver) {
    return (
      <AdminLayout title="Motorista não encontrado" subtitle="">
        <Button onClick={() => navigate('/drivers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={driver.profile?.name || 'Motorista'}
      subtitle="Detalhes do motorista"
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/drivers')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={driver.status} />
              {driver.verified ? (
                <Badge className="bg-success/20 text-success">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Verificado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning/50 text-warning">
                  <Clock className="mr-1 h-3 w-3" />
                  Não verificado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{driver.profile?.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium">{driver.profile?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </p>
                <p className="font-medium">{driver.profile?.phone || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-mono font-medium">{driver.cpf}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CNH</p>
                <p className="font-mono font-medium">{driver.cnh}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Validade CNH
                </p>
                <p className="font-medium">{format(parseISO(driver.cnh_expiry), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            {/* Bank Info */}
            {(driver.bank_name || driver.pix_key) && (
              <div className="border-t pt-4">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <CreditCard className="h-4 w-4" /> Dados Bancários
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {driver.bank_name && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Banco</p>
                      <p className="font-medium">{driver.bank_name}</p>
                    </div>
                  )}
                  {driver.bank_agency && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Agência</p>
                      <p className="font-mono font-medium">{driver.bank_agency}</p>
                    </div>
                  )}
                  {driver.bank_account && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Conta</p>
                      <p className="font-mono font-medium">{driver.bank_account}</p>
                    </div>
                  )}
                  {driver.pix_key && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Chave PIX</p>
                      <p className="font-mono font-medium">{driver.pix_key}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!driver.verified && (
              <Button
                className="w-full"
                onClick={() => setActionDialog({ open: true, type: 'verify' })}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verificar Motorista
              </Button>
            )}
            
            {driver.status === 'blocked' ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActionDialog({ open: true, type: 'activate' })}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Reativar Motorista
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setActionDialog({ open: true, type: 'block' })}
              >
                <Ban className="mr-2 h-4 w-4" />
                Bloquear Motorista
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum documento enviado
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{doc.doc_type}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                    
                    {doc.expiry_date && (
                      <p className="text-sm text-muted-foreground">
                        Validade: {format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                    
                    {doc.rejection_reason && (
                      <p className="text-sm text-destructive">
                        Motivo: {doc.rejection_reason}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        Ver arquivo
                      </Button>
                      
                      {doc.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:bg-success/10"
                            onClick={() => handleApproveDocument(doc.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'reject',
                                documentId: doc.id,
                              })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialogs */}
      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'verify'}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verificar Motorista</AlertDialogTitle>
            <AlertDialogDescription>
              Ao verificar este motorista, ele poderá aceitar corridas publicadas.
              Certifique-se de que todos os documentos foram revisados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify}>Verificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'block'}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear Motorista</AlertDialogTitle>
            <AlertDialogDescription>
              O motorista não poderá aceitar novas corridas. Corridas em andamento
              não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'activate'}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Motorista</AlertDialogTitle>
            <AlertDialogDescription>
              O motorista poderá voltar a aceitar corridas normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>Reativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.open && actionDialog.type === 'reject'}
        onOpenChange={(open) => {
          setActionDialog({ ...actionDialog, open });
          if (!open) setRejectionReason('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para que o motorista possa corrigir.
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
              onClick={handleRejectDocument}
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
